-- Consistent payments -> request -> attempt lock order, and serialize legacy checkout.
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
  select amount_cents into strict expected from public.billing_request_items where request_id=r.id and due_date=due_input;
 end if;
 if amount_input is distinct from expected or collection_input is null then raise exception 'Importe incorrecto'; end if;
 if exists(select 1 from public.billing_request_collections where collection_id=collection_input and attempt_id=a.id) then return; end if;
 for i in select * from public.billing_request_items where request_id=r.id and (r.kind='payment' or due_date=due_input) order by payment_id loop
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

create or replace function private.guard_billing_legacy_contract() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.payments where ref_id=new.membership_id order by id for update;
 if exists(select 1 from public.payments p join public.billing_request_items i on i.payment_id=p.id join public.billing_request_attempts a on a.request_id=i.request_id join public.billing_requests r on r.id=i.request_id where p.ref_id=new.membership_id and r.mode=new.mode and a.state not in ('expired','cancelled')) then raise exception 'Membresía con solicitud administrativa activa'; end if;
 return new;
end $$;
