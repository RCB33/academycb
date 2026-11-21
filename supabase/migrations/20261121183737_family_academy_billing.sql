-- New multi-player submissions only. No backfill, receipt edits or old subscription changes.
create table public.family_billing_batches(id uuid primary key, created_at timestamptz not null default now());
create table public.family_billing_members(
 batch_id uuid not null references public.family_billing_batches(id),
 request_id uuid primary key references public.enrollment_requests(id),
 unique(batch_id,request_id)
);
create index family_billing_members_batch on public.family_billing_members(batch_id);
alter table public.family_billing_batches enable row level security;
alter table public.family_billing_members enable row level security;
revoke all on public.family_billing_batches,public.family_billing_members from public,anon,authenticated;
grant select on public.family_billing_batches,public.family_billing_members to authenticated;
grant all on public.family_billing_batches,public.family_billing_members to service_role;
create policy family_batch_admin on public.family_billing_batches for select to authenticated using(public.has_role(array['admin','finance']));
create policy family_member_admin on public.family_billing_members for select to authenticated using(public.has_role(array['admin','finance']));

-- The new entry point deliberately does not group a retry of a pre-existing batch.
create function public.submit_family_enrollment(batch_id uuid,actor uuid,fingerprint text,players jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; prior boolean; ids uuid[]; emails integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(batch_id::text,31));
 prior:=exists(select 1 from private.combined_enrollment_submissions where id=batch_id);
 result:=private.submit_combined_enrollment(batch_id,actor,fingerprint,players);
 if prior then return result;end if;
 select array_agg(r.id order by r.id),count(distinct lower(btrim(r.email))) into ids,emails
 from public.enrollment_requests r join jsonb_array_elements(result) s on s->>'source'='enrollment' and r.id=(s->>'id')::uuid
 where r.service='academy' and r.academy_details->>'payment_choice'='monthly_card';
 if cardinality(ids)>1 then
  if cardinality(ids)>6 or emails<>1 then raise exception 'Revisa la familia de la solicitud conjunta';end if;
  insert into public.family_billing_batches(id) values(batch_id);
  insert into public.family_billing_members(batch_id,request_id) select batch_id,unnest(ids);
  update public.enrollment_requests set academy_details=academy_details||jsonb_build_object('family_batch_id',batch_id) where id=any(ids);
 end if;
 return result;
end $$;
revoke all on function public.submit_family_enrollment(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_family_enrollment(uuid,uuid,text,jsonb) to service_role;

-- Called by the server after individual approvals, or by Karen to retry preparation.
-- All pending siblings must be resolved; rejected/cash siblings are excluded.
create function public.prepare_family_billing(batch_input uuid,actor_input uuid,mode_input text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare e public.enrollment_requests%rowtype; m public.academy_memberships%rowtype; p public.payments%rowtype;
 r public.billing_requests%rowtype; guardian uuid; email_value text; child_ids uuid[]:='{}'; ids uuid[]:='{}'; initial_ids uuid[]:='{}';
 expected numeric:=0; first_count int; recurring_count int; initial_total numeric; n int; next_due date; first_due date;
 total bigint:=0; earliest date; email_count int; monthly_count int;
begin
 if not exists(select 1 from public.profiles where id=actor_input and role='admin') then raise exception 'Solo administración puede preparar el pago familiar';end if;
 if mode_input is null or mode_input not in ('test','live') then raise exception 'Entorno no válido';end if;
 perform 1 from public.family_billing_batches where id=batch_input for update;
 if not found then raise exception 'Solicitud familiar no disponible';end if;
 -- Stable order also serializes overlapping legacy request preparations.
 perform 1 from public.enrollment_requests where id in(select request_id from public.family_billing_members where batch_id=batch_input) order by id for update;
 select * into r from public.billing_requests where id=batch_input;
 if found then
  if r.mode<>mode_input or r.state in ('cancelled','cancelling') or (r.state='ready' and r.expires_at<=now()) then raise exception 'El enlace familiar necesita revisión; no se crea otro cobro';end if;
  return jsonb_build_object('status','ready','requestId',r.id);
 end if;
 select count(*) into n from public.enrollment_requests where id in(select request_id from public.family_billing_members where batch_id=batch_input) and status in ('new','contacted','interested');
 if n>0 then return jsonb_build_object('status','waiting_family','pending',n,'batchId',batch_input);end if;
 select count(distinct lower(btrim(email))),min(lower(btrim(email))) into email_count,email_value from public.enrollment_requests where id in(select request_id from public.family_billing_members where batch_id=batch_input);
 if email_count<>1 then raise exception 'Las solicitudes no pertenecen a la misma familia';end if;
 select count(*),min(id::text)::uuid into n,guardian from public.guardians where lower(btrim(email))=email_value;
 if n<>1 or not exists(select 1 from public.guardians where id=guardian and user_id is not null) then raise exception 'Revisa el acceso familiar antes de preparar el enlace';end if;
 for e in select * from public.enrollment_requests where id in(select request_id from public.family_billing_members where batch_id=batch_input) order by id loop
  if e.status='lost' then continue;end if;
  if e.status<>'enrolled' or e.service<>'academy' then raise exception 'Resuelve todas las solicitudes de Academia';end if;
  if e.academy_details->>'payment_choice'='cash' then continue;end if;
  if e.academy_details->>'payment_choice' is distinct from 'monthly_card' then raise exception 'Forma de pago no válida';end if;
  select * into strict m from public.academy_memberships where id=(e.academy_details->'accepted'->>'membership_id')::uuid and child_id=e.accepted_child_id and status in ('active','pending_payment');
  if m.child_id=any(child_ids) or not exists(select 1 from public.child_guardians where child_id=m.child_id and guardian_id=guardian) then raise exception 'Revisa los vínculos de cada jugador';end if;
  child_ids:=array_append(child_ids,m.child_id);
  expected:=expected+(e.academy_details->'accepted'->>'first_total')::numeric;
 end loop;
 if cardinality(child_ids)=0 then return jsonb_build_object('status','no_card','batchId',batch_input);end if;
 -- Match existing checkout lock order: child advisory locks, payments, request, attempts.
 for guardian in select unnest(child_ids) order by 1 loop perform pg_advisory_xact_lock(hashtextextended(guardian::text,2));end loop;
 select id into strict guardian from public.guardians where lower(btrim(email))=email_value;
 perform 1 from public.payments where ref_id in(select (er.academy_details->'accepted'->>'membership_id')::uuid from public.enrollment_requests er join public.family_billing_members f on f.request_id=er.id where f.batch_id=batch_input and er.status='enrolled' and er.academy_details->>'payment_choice'='monthly_card') order by id for update;
 for e in select er.* from public.enrollment_requests er join public.family_billing_members f on f.request_id=er.id where f.batch_id=batch_input and er.status='enrolled' and er.academy_details->>'payment_choice'='monthly_card' order by er.id loop
  select * into strict m from public.academy_memberships where id=(e.academy_details->'accepted'->>'membership_id')::uuid;
  first_count:=0;recurring_count:=0;initial_total:=0;next_due:=(date_trunc('month',m.start_date)+interval '1 month')::date;
  for p in select * from public.payments where ref_id=m.id order by due_date,id loop
   if p.child_id is distinct from m.child_id or p.type<>'academy' or p.status not in ('pending','failed') or p.concept_code is null or p.concept_code not in ('monthly','registration','plus') or p.amount<0.50 or p.amount*100<>trunc(p.amount*100) or p.due_date is null then raise exception 'Revisa los recibos nuevos antes de agruparlos';end if;
   if exists(select 1 from public.manual_receipt_allocations where payment_id=p.id) then raise exception 'Hay pagos manuales: conservar gestión individual';end if;
   if exists(select 1 from public.receipt_checkout_attempts where payment_id=p.id and state in ('creating','open','paid')) or exists(select 1 from public.academy_checkout_contracts where membership_id=m.id and state not in ('expired','cancelled')) or exists(select 1 from public.billing_request_items where payment_id=p.id) then raise exception 'Hay enlaces o pagos anteriores. No se modifican ni se agrupan automáticamente';end if;
   if p.concept_code='monthly' and p.covered_month is distinct from to_char(m.start_date,'YYYY-MM') then
    if p.amount is distinct from m.monthly_price or p.due_date is distinct from (next_due+make_interval(months=>recurring_count))::date or p.covered_month is distinct from to_char(p.due_date,'YYYY-MM') or p.due_date<=current_date or p.due_date>m.end_date then raise exception 'Mensualidades futuras no válidas';end if;
    recurring_count:=recurring_count+1;
    earliest:=least(earliest,p.due_date);
   else
    initial_ids:=array_append(initial_ids,p.id); initial_total:=initial_total+p.amount;
    if p.concept_code='monthly' then first_count:=first_count+1;end if;
   end if;
   ids:=array_append(ids,p.id);total:=total+(p.amount*100)::bigint;
  end loop;
  if first_count<>1 or initial_total is distinct from (e.academy_details->'accepted'->>'first_total')::numeric or (next_due+make_interval(months=>recurring_count))::date<=m.end_date then raise exception 'Importes o mensualidades incompletos';end if;
 end loop;
 if total not between 50 and 100000000 or cardinality(ids)>180 then raise exception 'Importe familiar no válido';end if;
 -- At most ten contiguous months; allows different start dates and monthly totals.
 select count(distinct due_date),min(due_date) into monthly_count,first_due from public.payments where id=any(ids) and not(id=any(initial_ids));
 if monthly_count>10 or exists(select 1 from (select due_date,row_number() over(order by due_date)-1 as n from public.payments where id=any(ids) and not(id=any(initial_ids)) group by due_date) s where s.due_date<>(first_due+make_interval(months=>s.n::int))::date) then raise exception 'Revisa el calendario mensual familiar';end if;
 insert into public.billing_requests(id,child_id,guardian_id,created_by,kind,mode,title,total_cents,expires_at,recipient_email)
 values(batch_input,child_ids[1],guardian,actor_input,'subscription',mode_input,'Academia · Pago familiar conjunto',total,case when earliest is null then now()+interval '7 days' else least(now()+interval '7 days',(earliest::timestamp at time zone 'UTC')-interval '1 hour') end,email_value);
 insert into public.billing_request_items(request_id,payment_id,position,amount_cents,due_date,snapshot,phase)
 select batch_input,receipt.id,row_number() over(order by case when receipt.id=any(initial_ids) then 0 else 1 end,receipt.due_date,receipt.child_id,receipt.id),(receipt.amount*100)::bigint,receipt.due_date,
 jsonb_build_object('amount',receipt.amount,'description',receipt.description,'due_date',receipt.due_date,'child_id',receipt.child_id,'child_name',c.full_name,'ref_id',receipt.ref_id,'type',receipt.type,'covered_month',receipt.covered_month),case when receipt.id=any(initial_ids) then 'initial' else 'recurring' end
 from public.payments receipt join public.children c on c.id=receipt.child_id where receipt.id=any(ids);
 return jsonb_build_object('status','ready','requestId',batch_input);
end $$;
revoke all on function public.prepare_family_billing(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_family_billing(uuid,uuid,text) to service_role;

-- A guardian must still own every child at read time, not only the anchor child.
create function private.can_read_family_billing(request_input uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.family_billing_batches where id=request_input)
 or (auth.uid() is not null and exists(select 1 from public.billing_requests r join public.guardians g on g.id=r.guardian_id where r.id=request_input and g.user_id=auth.uid()
  and not exists(select 1 from public.billing_request_items i where i.request_id=r.id and not exists(select 1 from public.child_guardians cg where cg.guardian_id=g.id and cg.child_id=(i.snapshot->>'child_id')::uuid))));
$$;
revoke all on function private.can_read_family_billing(uuid) from public,anon;
grant execute on function private.can_read_family_billing(uuid) to authenticated;
create policy family_billing_all_children on public.billing_requests as restrictive for select to authenticated using(public.has_role(array['admin','finance']) or private.can_read_family_billing(id));

create or replace function public.reserve_billing_request(request_input uuid,owner_input uuid,mode_input text,total_input bigint)
returns public.billing_request_attempts language plpgsql security invoker set search_path='' as $$
declare r public.billing_requests%rowtype; a public.billing_request_attempts%rowtype; p public.payments%rowtype; i public.billing_request_items%rowtype;
begin
 perform 1 from public.payments where id in(select payment_id from public.billing_request_items where request_id=request_input) order by id for update;
 select * into strict r from public.billing_requests where id=request_input for update;
 if r.mode is distinct from mode_input or r.total_cents is distinct from total_input or r.state in ('cancelled','cancelling') then raise exception 'Condiciones no válidas'; end if;
 if not exists(select 1 from public.guardians g join public.child_guardians cg on cg.guardian_id=g.id where g.id=r.guardian_id and g.user_id=owner_input and cg.child_id=r.child_id) then raise exception 'Solicitud de otro tutor'; end if;
 if exists(select 1 from public.billing_request_items bi where bi.request_id=r.id and not exists(select 1 from public.child_guardians cg where cg.guardian_id=r.guardian_id and cg.child_id=(bi.snapshot->>'child_id')::uuid)) then raise exception 'Revisa los vínculos familiares';end if;
 if exists(select 1 from public.family_billing_members f join public.enrollment_requests er on er.id=f.request_id join public.academy_memberships am on am.id=(er.academy_details->'accepted'->>'membership_id')::uuid where f.batch_id=r.id and er.status='enrolled' and er.academy_details->>'payment_choice'='monthly_card' and am.agreed_payment_method is distinct from 'stripe') then raise exception 'Ha cambiado la forma de pago de un jugador; revisa el enlace familiar';end if;
 select * into a from public.billing_request_attempts where request_id=r.id and state not in ('expired','cancelled') for update;
 if found then
  if a.state='creating' and a.session_id is null and a.expires_at<=now() then
   update public.billing_request_attempts set state='expired' where id=a.id;
   update public.billing_requests set state='ready' where id=r.id; r.state:='ready';
  else return a; end if;
 end if;
 if r.expires_at<=now() or r.state<>'ready' then raise exception 'Solicitud caducada o cerrada'; end if;
 for i in select * from public.billing_request_items where request_id=r.id order by payment_id loop
  select * into strict p from public.payments where id=i.payment_id;
  if p.status not in ('pending','failed') or (i.snapshot - 'child_name') is distinct from jsonb_build_object('amount',p.amount,'description',p.description,'due_date',p.due_date,'child_id',p.child_id,'ref_id',p.ref_id,'type',p.type,'covered_month',p.covered_month) or exists(select 1 from public.manual_receipt_allocations where payment_id=p.id) then raise exception 'El recibo ha cambiado; solicita un enlace nuevo'; end if;
  if exists(select 1 from public.receipt_checkout_attempts where payment_id=p.id and mode=r.mode and state in ('creating','open','paid')) or exists(select 1 from public.academy_checkout_contracts where membership_id=p.ref_id and mode=r.mode and state not in ('expired','cancelled')) then raise exception 'Hay otro pago en curso'; end if;
  if exists(select 1 from public.billing_request_items bi join public.billing_request_attempts ba on ba.request_id=bi.request_id join public.billing_requests br on br.id=bi.request_id where bi.payment_id=p.id and br.mode=r.mode and ba.state not in ('expired','cancelled')) then raise exception 'Recibo reservado por otra solicitud'; end if;
 end loop;
 insert into public.billing_request_attempts(request_id,owner_id,terms) values(r.id,owner_input,jsonb_build_object('kind',r.kind,'title',r.title,'total_cents',r.total_cents,'items',(select jsonb_agg(jsonb_build_object('amount_cents',amount_cents,'due_date',due_date) order by position) from public.billing_request_items where request_id=r.id))) returning * into a;
 update public.billing_requests set state='processing' where id=r.id;
 return a;
end $$;

create or replace function public.collect_billing_request(attempt_input uuid,collection_input text,session_input text,subscription_input text,livemode_input boolean,amount_input bigint,due_input date)
returns void language plpgsql security invoker set search_path='' as $$
declare a public.billing_request_attempts%rowtype; r public.billing_requests%rowtype; i public.billing_request_items%rowtype; expected bigint;
begin
 select * into strict a from public.billing_request_attempts where id=attempt_input;
 perform 1 from public.payments where id in(select payment_id from public.billing_request_items where request_id=a.request_id) order by id for update;
 select * into strict r from public.billing_requests where id=a.request_id for update;
 select * into strict a from public.billing_request_attempts where id=attempt_input for update;
 if (r.mode='live') is distinct from livemode_input then raise exception 'Entorno incorrecto'; end if;
 if r.kind='payment' then
  if a.session_id is null or a.session_id is distinct from session_input then raise exception 'Sesión incorrecta'; end if; expected:=r.total_cents;
 else
  if a.subscription_id is null or a.subscription_id is distinct from subscription_input then raise exception 'Suscripción sin confirmar'; end if;
  select sum(amount_cents) into expected from public.billing_request_items where request_id=r.id and due_date=due_input and phase='recurring';
 end if;
 if expected is null or expected<50 or amount_input is distinct from expected or collection_input is null then raise exception 'Importe incorrecto'; end if;
 if exists(select 1 from public.billing_request_collections where collection_id=collection_input and attempt_id=a.id) then return; end if;
 for i in select * from public.billing_request_items where request_id=r.id and (r.kind='payment' or (due_date=due_input and phase='recurring')) order by payment_id loop
  if exists(select 1 from public.billing_request_collections where attempt_id=a.id and payment_id=i.payment_id) then raise exception 'Recibo ya cobrado por otra operación'; end if;
  insert into public.billing_request_collections(collection_id,attempt_id,payment_id,amount_cents) values(collection_input,a.id,i.payment_id,i.amount_cents);
  if r.mode='live' then
   perform set_config('academy.billing_fulfillment',a.id::text,true);
   update public.payments set status='paid',method='stripe',paid_at=now(),updated_at=now(),stripe_invoice_id=case when r.kind='subscription' then collection_input else stripe_invoice_id end where id=i.payment_id and status in ('pending','failed') and amount*100=i.amount_cents;
   if not found then raise exception 'El recibo ya no coincide'; end if;
  end if;
 end loop;
 if (select count(*) from public.billing_request_collections where attempt_id=a.id)=(select count(*) from public.billing_request_items where request_id=r.id) then
  update public.billing_request_attempts set state='completed',billing_status='ended' where id=a.id;
  update public.billing_requests set state='completed' where id=r.id;
 else
  update public.billing_request_attempts set state='active',billing_status='active' where id=a.id;
  update public.billing_requests set state='active' where id=r.id;
 end if;
end $$;

-- Do not offer an independent card checkout while a family link is being assembled.
create function private.guard_family_individual_checkout() returns trigger language plpgsql security definer set search_path='' as $$
declare membership uuid; batch uuid;
begin
 if tg_table_name='academy_checkout_contracts' then membership:=new.membership_id;
 else select ref_id into membership from public.payments where id=new.payment_id;end if;
 select f.batch_id into batch from public.family_billing_members f join public.enrollment_requests e on e.id=f.request_id
 where (e.academy_details->'accepted'->>'membership_id')::uuid=membership and e.status='enrolled' and e.academy_details->>'payment_choice'='monthly_card';
 if batch is not null and not exists(select 1 from public.billing_requests where id=batch and state='cancelled') then
  if tg_table_name<>'billing_request_items' then raise exception 'Esta plaza utiliza el pago familiar conjunto';end if;
  if new.request_id<>batch then raise exception 'Utiliza el enlace de pago familiar';end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_family_individual_checkout() from public,anon,authenticated;
create trigger family_receipt_checkout before insert on public.receipt_checkout_attempts for each row execute function private.guard_family_individual_checkout();
create trigger family_contract_checkout before insert on public.academy_checkout_contracts for each row execute function private.guard_family_individual_checkout();
create trigger family_billing_item before insert on public.billing_request_items for each row execute function private.guard_family_individual_checkout();

create function private.guard_prepared_family_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.family_billing_members f join public.billing_requests b on b.id=f.batch_id where f.request_id=old.id)
 and (new.status,new.email,new.accepted_child_id,new.academy_details-'onboarding') is distinct from (old.status,old.email,old.accepted_child_id,old.academy_details-'onboarding') then raise exception 'El pago familiar ya está preparado. Conserva sus condiciones y revisa cualquier cambio desde Finanzas';end if;
 return new;
end $$;
revoke all on function private.guard_prepared_family_request() from public,anon,authenticated;
create trigger family_request_prepared before update on public.enrollment_requests for each row execute function private.guard_prepared_family_request();
