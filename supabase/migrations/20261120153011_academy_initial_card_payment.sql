-- Additive classification; existing requests retain their recurring-only behavior.
alter table public.billing_request_items add column phase text not null default 'recurring' check (phase in ('initial','recurring'));

create function public.create_enrollment_billing_request(request_input uuid,actor_input uuid,guardian_input uuid,mode_input text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare e public.enrollment_requests%rowtype; m public.academy_memberships%rowtype; r public.billing_requests%rowtype;
 p public.payments%rowtype; ids uuid[]; first_month text; next_due date; n int:=0; initial_total bigint:=0; first_count int:=0;
begin
 if not exists(select 1 from public.profiles where id=actor_input and role in ('admin','finance')) then raise exception 'Sin permisos'; end if;
 select * into strict e from public.enrollment_requests where id=request_input;
 if e.status<>'enrolled' or e.service<>'academy' or e.academy_details->>'payment_choice' is distinct from 'monthly_card' then raise exception 'Acepta primero la plaza con tarjeta'; end if;
 select * into strict m from public.academy_memberships where id=(e.academy_details->'accepted'->>'membership_id')::uuid and child_id=e.accepted_child_id and status in ('active','pending_payment');
 if not exists(select 1 from public.guardians g join public.child_guardians cg on cg.guardian_id=g.id where g.id=guardian_input and cg.child_id=m.child_id and g.user_id is not null and lower(btrim(g.email))=lower(btrim(e.email))) then raise exception 'Tutor no vinculado'; end if;
 perform pg_advisory_xact_lock(hashtextextended(m.child_id::text,2));
 select * into r from public.billing_requests where id=request_input;
 if found then
  if r.state in ('cancelling','cancelled') or (r.child_id,r.guardian_id,r.mode,r.kind) is distinct from (m.child_id,guardian_input,mode_input,'subscription'::text) or not exists(select 1 from public.billing_request_items where request_id=r.id and phase='initial') then raise exception 'Solicitud anterior distinta: revisión manual'; end if;
  return r.id;
 end if;
 first_month:=to_char(m.start_date,'YYYY-MM'); next_due:=(date_trunc('month',m.start_date)+interval '1 month')::date;
 perform 1 from public.payments where ref_id=m.id order by id for update;
 for p in select * from public.payments where ref_id=m.id order by due_date,id loop
  if p.child_id is distinct from m.child_id or p.type<>'academy' or p.status not in ('pending','failed') or p.concept_code not in ('monthly','registration','plus') or p.concept_code is null then raise exception 'Revisa los recibos antes de preparar el pago inicial'; end if;
  if p.concept_code='monthly' and p.covered_month is distinct from first_month then
   if p.amount is distinct from m.monthly_price or p.due_date is distinct from (next_due+make_interval(months=>n))::date or p.covered_month is distinct from to_char(p.due_date,'YYYY-MM') or p.due_date<=current_date or p.due_date>m.end_date then raise exception 'Mensualidades futuras no válidas'; end if;
   n:=n+1;
  else
   initial_total:=initial_total+(p.amount*100)::bigint;
   if p.concept_code='monthly' then first_count:=first_count+1; end if;
  end if;
 end loop;
 if first_count<>1 or initial_total<50 or initial_total is distinct from ((e.academy_details->'accepted'->>'first_total')::numeric*100)::bigint then raise exception 'Revisa el importe inicial'; end if;
 if (next_due+make_interval(months=>n))::date<=m.end_date then raise exception 'Faltan mensualidades'; end if;
 select array_agg(id order by id) into ids from public.payments where ref_id=m.id;
 -- Reuse locking, ownership, immutable snapshots and overlap/manual-payment guards.
 perform public.create_billing_request(request_input,actor_input,m.child_id,guardian_input,'payment',mode_input,('Academia · '||coalesce(m.plan_snapshot->>'name','Alta y mensualidades'))::varchar(150),ids);
 update public.billing_request_items i set phase='initial' from public.payments receipt where i.request_id=request_input and i.payment_id=receipt.id and (receipt.concept_code in ('registration','plus') or receipt.covered_month=first_month);
 update public.billing_requests set kind='subscription',expires_at=case when n>0 then least(expires_at,(next_due::timestamp at time zone 'UTC')-interval '1 hour') else expires_at end where id=request_input;
 return request_input;
end $$;
revoke all on function public.create_enrollment_billing_request(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.create_enrollment_billing_request(uuid,uuid,uuid,text) to service_role;

-- Payment-mode Checkout settles the initial group atomically. Future invoices
-- remain separate receipts. A retry must neither recollect nor restart Checkout.
create function public.collect_billing_initial(attempt_input uuid,session_input text,livemode_input boolean,amount_input bigint)
returns void language plpgsql security invoker set search_path='' as $$
declare a public.billing_request_attempts%rowtype; r public.billing_requests%rowtype; i public.billing_request_items%rowtype; expected bigint;
begin
 select * into strict a from public.billing_request_attempts where id=attempt_input;
 perform 1 from public.payments where id in(select payment_id from public.billing_request_items where request_id=a.request_id) order by id for update;
 select * into strict r from public.billing_requests where id=a.request_id for update;
 select * into strict a from public.billing_request_attempts where id=attempt_input for update;
 if r.kind<>'subscription' or (r.mode='live') is distinct from livemode_input or a.session_id is null or a.session_id is distinct from session_input then raise exception 'Pago inicial no vinculado'; end if;
 select sum(amount_cents) into expected from public.billing_request_items where request_id=r.id and phase='initial';
 if expected is null or expected<50 or amount_input is distinct from expected then raise exception 'Importe inicial incorrecto'; end if;
 if exists(select 1 from public.billing_request_collections where collection_id=session_input and attempt_id=a.id) then return; end if;
 for i in select * from public.billing_request_items where request_id=r.id and phase='initial' order by payment_id loop
  if exists(select 1 from public.billing_request_collections where payment_id=i.payment_id and attempt_id=a.id) then raise exception 'Recibo inicial ya cobrado'; end if;
  insert into public.billing_request_collections(collection_id,attempt_id,payment_id,amount_cents) values(session_input,a.id,i.payment_id,i.amount_cents);
  if r.mode='live' then
   perform set_config('academy.billing_fulfillment',a.id::text,true);
   update public.payments set status='paid',method='stripe',paid_at=now(),updated_at=now() where id=i.payment_id and status in ('pending','failed') and amount*100=i.amount_cents;
   if not found then raise exception 'El recibo inicial ha cambiado'; end if;
  end if;
 end loop;
 if not exists(select 1 from public.billing_request_items where request_id=r.id and phase='recurring') then
  update public.billing_request_attempts set state='completed',billing_status='ended' where id=a.id;
  update public.billing_requests set state='completed' where id=r.id;
 end if;
end $$;
revoke all on function public.collect_billing_initial(uuid,text,boolean,bigint) from public,anon,authenticated;
grant execute on function public.collect_billing_initial(uuid,text,boolean,bigint) to service_role;

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
  select amount_cents into strict expected from public.billing_request_items where request_id=r.id and due_date=due_input and phase='recurring';
 end if;
 if amount_input is distinct from expected or collection_input is null then raise exception 'Importe incorrecto'; end if;
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
