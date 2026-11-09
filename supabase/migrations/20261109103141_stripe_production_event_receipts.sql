-- Additive integration for approved Christmas registrations. TEST never changes
-- event registrations, payments or notifications. All writers are server-only.
create table public.event_checkout_attempts (
 id uuid primary key default gen_random_uuid(),
 registration_id uuid not null references public.event_registrations(id),
 owner_id uuid not null references auth.users(id),
 mode text not null check(mode in ('test','live')),
 state text not null default 'creating' check(state in ('creating','open','paid','expired','failed')),
 amount_cents bigint not null check(amount_cents between 50 and 100000000),
 currency text not null default 'eur' check(currency='eur'),
 description text not null, return_origin text not null,
 stripe_session_id text unique, checkout_url text,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 hour',
 confirmed_at timestamptz
);
create unique index event_checkout_active on public.event_checkout_attempts(registration_id,mode) where state in ('creating','open','paid');
create index event_checkout_owner on public.event_checkout_attempts(owner_id,created_at desc);
create table public.event_checkout_events (
 event_id text primary key, attempt_id uuid not null references public.event_checkout_attempts(id),
 event_type text not null, created_at timestamptz not null default now()
);
create index event_checkout_events_attempt on public.event_checkout_events(attempt_id);
alter table public.event_checkout_attempts enable row level security;
alter table public.event_checkout_events enable row level security;
revoke all on public.event_checkout_attempts,public.event_checkout_events from public,anon,authenticated;
grant select on public.event_checkout_attempts to authenticated;
grant all on public.event_checkout_attempts,public.event_checkout_events to service_role;
create policy event_checkout_read on public.event_checkout_attempts for select to authenticated
using(owner_id=(select auth.uid()) or public.has_role(array['admin','finance']));

create function public.reserve_event_checkout(registration_input uuid,owner_input uuid,mode_input text,origin_input text)
returns public.event_checkout_attempts language plpgsql security invoker set search_path='' as $$
declare r public.event_registrations%rowtype; a public.event_checkout_attempts%rowtype;
begin
 if mode_input is null or mode_input not in ('test','live') or origin_input is null or origin_input !~ '^https://[a-z0-9.-]+$' then raise exception 'Invalid environment'; end if;
 select * into strict r from public.event_registrations where id=registration_input for update;
 if r.user_id is distinct from owner_input or not exists(select 1 from auth.users where id=owner_input and email_confirmed_at is not null) then raise exception 'Registration not owned'; end if;
 if r.status<>'awaiting_payment' or r.payment_id is not null or r.approved_amount is null or r.due_date is null or r.due_date<current_date then raise exception 'Registration not payable'; end if;
 if r.approved_amount<0.50 or r.approved_amount>1000000 or r.approved_amount*100<>trunc(r.approved_amount*100) then raise exception 'Invalid amount'; end if;
 select * into a from public.event_checkout_attempts where registration_id=r.id and mode=mode_input and state in ('creating','open','paid') for update;
 if found then return a; end if;
 insert into public.event_checkout_attempts(registration_id,owner_id,mode,amount_cents,description,return_origin)
 values(r.id,owner_input,mode_input,(r.approved_amount*100)::bigint,'Torneos Navidad · '||array_to_string(r.approved_tournaments,', '),origin_input) returning * into a;
 return a;
end $$;
revoke all on function public.reserve_event_checkout(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_event_checkout(uuid,uuid,text,text) to service_role;

create function public.confirm_event_checkout(event_input text,type_input text,attempt_input uuid,session_input text,livemode_input boolean,amount_input bigint,currency_input text,payment_status_input text,intent_input text)
returns void language plpgsql security invoker set search_path='' as $$
declare a public.event_checkout_attempts%rowtype; r public.event_registrations%rowtype; p uuid;
begin
 select r0.* into strict r from public.event_registrations r0 join public.event_checkout_attempts a0 on a0.registration_id=r0.id where a0.id=attempt_input for update of r0;
 select * into strict a from public.event_checkout_attempts where id=attempt_input for update;
 if type_input is null or type_input not in ('checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired') then raise exception 'Unsupported event'; end if;
 if a.stripe_session_id is null or a.stripe_session_id is distinct from session_input or (a.mode='live') is distinct from livemode_input or a.amount_cents is distinct from amount_input or a.currency is distinct from currency_input then raise exception 'Session mismatch'; end if;
 if exists(select 1 from public.event_checkout_events where event_id=event_input) then return; end if;
 if type_input in ('checkout.session.completed','checkout.session.async_payment_succeeded') and payment_status_input='paid' then
  if a.state<>'paid' and a.mode='live' then
   if r.status<>'awaiting_payment' or r.payment_id is not null or r.approved_amount*100 is distinct from a.amount_cents::numeric or intent_input is null then raise exception 'Registration changed; reconciliation required'; end if;
   insert into public.payments(type,ref_id,child_id,amount,status,method,paid_at,description,concept_code,stripe_payment_intent_id)
   values('tournament',r.id,r.child_id,a.amount_cents::numeric/100,'paid','stripe',now(),a.description,'tournament',intent_input) returning id into p;
   perform set_config('academy.event_fulfillment',a.id::text,true);
   update public.event_registrations set status='confirmed',payment_id=p,updated_at=now() where id=r.id;
   insert into public.event_registration_history(registration_id,actor_id,action,note) values(r.id,a.owner_id,'stripe_paid','Pago confirmado por Stripe');
   insert into public.notifications(user_id,title,message,type,link_url) values(a.owner_id,'Pago de inscripción confirmado','Hemos recibido el pago de tu inscripción.','info','/torneos/inscripcion');
  end if;
  update public.event_checkout_attempts set state='paid',confirmed_at=coalesce(confirmed_at,now()) where id=a.id;
 elsif a.state<>'paid' and type_input='checkout.session.expired' then
  update public.event_checkout_attempts set state='expired' where id=a.id;
 elsif a.state<>'paid' and type_input='checkout.session.async_payment_failed' then
  update public.event_checkout_attempts set state='failed' where id=a.id;
 end if;
 insert into public.event_checkout_events(event_id,attempt_id,event_type) values(event_input,a.id,type_input);
end $$;
revoke all on function public.confirm_event_checkout(text,text,uuid,text,boolean,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.confirm_event_checkout(text,text,uuid,text,boolean,bigint,text,text,text) to service_role;

-- Prevent a transfer confirmation, repricing or cancellation racing an open
-- card checkout. The payment and registration commit in the same transaction.
create function private.guard_event_checkout() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.event_checkout_attempts a where a.registration_id=old.id and a.mode='live' and a.state in ('creating','open','paid') and a.id::text is distinct from current_setting('academy.event_fulfillment',true)) then
  if tg_op='DELETE' then raise exception 'La inscripción tiene un pago con tarjeta. Revisa su estado antes de eliminarla'; end if;
  if (new.status,new.approved_amount,new.approved_tournaments,new.payment_id,new.user_id,new.child_id,new.due_date) is distinct from (old.status,old.approved_amount,old.approved_tournaments,old.payment_id,old.user_id,old.child_id,old.due_date) then
   raise exception 'Hay un pago con tarjeta en curso o confirmado. Cierra el enlace de pago antes de cambiar la inscripción o enviar un justificante';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function private.guard_event_checkout() from public,anon,authenticated;
create trigger protect_event_checkout before update or delete on public.event_registrations for each row execute function private.guard_event_checkout();
