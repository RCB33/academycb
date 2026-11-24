-- Optional, parent-initiated card authorization using existing accepted receipts.
-- Never insert/update payments or change the agreed cash method before consent.
create function public.prepare_parent_monthly_billing(owner_input uuid, guardian_input uuid, mode_input text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 g public.guardians%rowtype; m public.academy_memberships%rowtype; p public.payments%rowtype;
 ids uuid[]:='{}'; child_ids uuid[]:='{}'; child uuid; request_id uuid:=gen_random_uuid();
 total bigint:=0; first_due date; month_count int; existing uuid;
begin
 if mode_input is null or mode_input not in ('live','test') then raise exception 'Entorno no válido';end if;
 -- The server verifies Auth email before this service-role-only RPC; do not grant access to auth.users.
 if not exists(select 1 from public.profiles where id=owner_input and role='guardian')
 then raise exception 'Inicia sesión con tu cuenta familiar';end if;
 select * into g from public.guardians where id=guardian_input and user_id=owner_input;
 if not found then raise exception 'Cuenta familiar no disponible';end if;
 -- Serialize repeated clicks and use the same child/payment lock order as checkout.
 perform pg_advisory_xact_lock(hashtextextended(guardian_input::text,7));
 for child in select cg.child_id from public.child_guardians cg join public.children c on c.id=cg.child_id where cg.guardian_id=g.id and c.archived_at is null order by cg.child_id loop
  child_ids:=array_append(child_ids,child);
  perform pg_advisory_xact_lock(hashtextextended(child::text,2));
 end loop;
 perform 1 from public.payments where child_id=any(child_ids) and type='academy' order by id for update;
 for m in select * from public.academy_memberships where child_id=any(child_ids) and status in ('active','pending_payment') and end_date>current_date and plan_snapshot->>'frequency'='mensual' order by id loop
  -- Existing family/admin links and older Stripe contracts keep their own flow.
  if exists(select 1 from public.academy_checkout_contracts where membership_id=m.id and mode=mode_input and state not in ('expired','cancelled')) then continue;end if;
  if exists(select 1 from public.billing_request_items i join public.payments receipt on receipt.id=i.payment_id join public.billing_requests r on r.id=i.request_id
    where receipt.ref_id=m.id and r.mode=mode_input and r.state<>'cancelled' and (r.expires_at>now() or r.state in ('processing','active','cancelling','completed')))
  then continue;end if;
  if exists(select 1 from public.family_billing_members f join public.enrollment_requests e on e.id=f.request_id
    where e.academy_details->'accepted'->>'membership_id'=m.id::text and e.status='enrolled' and e.academy_details->>'payment_choice'='monthly_card'
    and not exists(select 1 from public.billing_requests where id=f.batch_id and state='cancelled')) then continue;end if;
  for p in select * from public.payments where ref_id=m.id and type='academy' and concept_code='monthly' and due_date>current_date and status in ('pending','failed') order by due_date,id loop
   if p.child_id is distinct from m.child_id or p.due_date<m.start_date or p.due_date>m.end_date or extract(day from p.due_date)<>1
      or p.covered_month is distinct from to_char(p.due_date,'YYYY-MM') or p.amount is distinct from m.monthly_price
      or p.amount<0.50 or p.amount*100<>trunc(p.amount*100)
      or exists(select 1 from public.manual_receipt_allocations where payment_id=p.id)
      or exists(select 1 from public.receipt_checkout_attempts where payment_id=p.id and mode=mode_input and state in ('creating','open','paid'))
   then raise exception 'Hay una cuota con un ajuste o un pago en curso. Contacta con Academy para revisarla';end if;
   if exists(select 1 from public.payments other where other.ref_id=m.id and other.id<>p.id and other.type='academy' and other.concept_code='monthly' and other.covered_month=p.covered_month and other.status<>'cancelled')
   then raise exception 'Hay recibos del mismo mes que necesitan revisión';end if;
   ids:=array_append(ids,p.id);total:=total+(p.amount*100)::bigint;
  end loop;
 end loop;
 if cardinality(ids)=0 then
  select r.id into existing from public.billing_requests r where r.guardian_id=g.id and r.mode=mode_input and r.kind='subscription'
   and (r.state in ('processing','active','cancelling') or (r.state='ready' and r.expires_at>now())) order by created_at desc limit 1;
  if existing is not null then return jsonb_build_object('requestId',existing);end if;
  return jsonb_build_object('status','no_future_dues');
 end if;
 -- Stripe schedules run consecutive months. Never shift a gap or paid month.
 select count(distinct due_date),min(due_date) into month_count,first_due from public.payments where id=any(ids);
 if month_count>10 or cardinality(ids)>180 or total not between 50 and 100000000 or exists(
  select 1 from (select due_date,row_number() over(order by due_date)-1 n from public.payments where id=any(ids) group by due_date) s
  where s.due_date<>(first_due+make_interval(months=>s.n::int))::date)
 then raise exception 'El calendario contiene ajustes. Contacta con Academy antes de autorizarlo';end if;
 insert into public.billing_requests(id,child_id,guardian_id,created_by,kind,mode,title,total_cents,expires_at,recipient_email)
 values(request_id,(select child_id from public.payments where id=ids[1]),g.id,owner_input,'subscription',mode_input,'Academia · Mensualidades con tarjeta',total,
  least(now()+interval '7 days',(first_due::timestamp at time zone 'UTC')-interval '1 hour'),g.email);
 insert into public.billing_request_items(request_id,payment_id,position,amount_cents,due_date,snapshot,phase)
 select request_id,receipt.id,row_number() over(order by receipt.due_date,receipt.child_id,receipt.id),(receipt.amount*100)::bigint,receipt.due_date,
  jsonb_build_object('amount',receipt.amount,'description',receipt.description,'due_date',receipt.due_date,'child_id',receipt.child_id,'child_name',c.full_name,'ref_id',receipt.ref_id,'type',receipt.type,'covered_month',receipt.covered_month),'recurring'
 from public.payments receipt join public.children c on c.id=receipt.child_id where receipt.id=any(ids);
 return jsonb_build_object('requestId',request_id);
end $$;
revoke all on function public.prepare_parent_monthly_billing(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_parent_monthly_billing(uuid,uuid,text) to service_role;

-- Apply all-child ownership to parent-generated groups as well as enrollment batches.
create or replace function private.can_read_family_billing(request_input uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.billing_requests r join public.guardians g on g.id=r.guardian_id where r.id=request_input and g.user_id=auth.uid()
  and not exists(select 1 from public.billing_request_items i where i.request_id=r.id and not exists(select 1 from public.child_guardians cg where cg.guardian_id=g.id and cg.child_id=(i.snapshot->>'child_id')::uuid)));
$$;
