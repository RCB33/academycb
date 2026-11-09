create table public.receipt_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  mode text not null check (mode in ('test','live')),
  state text not null default 'creating' check (state in ('creating','open','paid','expired','failed')),
  amount_cents bigint not null check (amount_cents between 50 and 100000000),
  currency text not null default 'eur' check (currency='eur'),
  description text not null,
  return_origin text not null,
  stripe_session_id text unique,
  checkout_url text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '1 hour',
  confirmed_at timestamptz
);
create unique index receipt_checkout_one_active on public.receipt_checkout_attempts(payment_id,mode)
where state in ('creating','open','paid');
create index receipt_checkout_owner on public.receipt_checkout_attempts(owner_id,created_at desc);
create table public.receipt_checkout_events (
  event_id text primary key,
  attempt_id uuid not null references public.receipt_checkout_attempts(id) on delete restrict,
  event_type text not null,
  created_at timestamptz not null default now()
);
create index receipt_checkout_events_attempt on public.receipt_checkout_events(attempt_id);
alter table public.receipt_checkout_attempts enable row level security;
alter table public.receipt_checkout_events enable row level security;
revoke all on public.receipt_checkout_attempts,public.receipt_checkout_events from anon,authenticated;
grant select on public.receipt_checkout_attempts to authenticated;
grant all on public.receipt_checkout_attempts,public.receipt_checkout_events to service_role;
create policy receipt_checkout_read on public.receipt_checkout_attempts for select to authenticated
using (owner_id=(select auth.uid()) or public.has_role(array['admin','finance']));

create function public.reserve_receipt_checkout(payment_input uuid,owner_input uuid,mode_input text,origin_input text)
returns public.receipt_checkout_attempts language plpgsql security invoker set search_path='' as $$
declare p public.payments%rowtype; a public.receipt_checkout_attempts%rowtype;
begin
  if mode_input not in ('test','live') then raise exception 'Invalid mode'; end if;
  if origin_input !~ '^https://[a-z0-9.-]+$' then raise exception 'Invalid return origin'; end if;
  select * into strict p from public.payments where id=payment_input for update;
  if not exists(select 1 from public.profiles where id=owner_input and role='admin')
    and not exists(select 1 from public.child_guardians cg join public.guardians g on g.id=cg.guardian_id where cg.child_id=p.child_id and g.user_id=owner_input)
    and not (p.type='shop' and exists(select 1 from public.orders o join auth.users u on lower(u.email)=lower(o.customer_email) where o.id=p.ref_id and u.id=owner_input and u.email_confirmed_at is not null))
  then raise exception 'Receipt not owned'; end if;
  if p.status not in ('pending','failed') then raise exception 'Receipt not payable'; end if;
  if p.amount*100 <> trunc(p.amount*100) or p.amount < 0.50 or p.amount > 1000000 then raise exception 'Invalid amount'; end if;
  if p.type='campus' and not exists(select 1 from public.campus_enrollments where id=p.ref_id and status in ('reserved','confirmed','pending_payment')) then raise exception 'Campus not approved'; end if;
  if p.type='shop' and not exists(select 1 from public.orders where id=p.ref_id and status in ('pending','paid','shipped','completed')) then raise exception 'Order unavailable'; end if;
  select * into a from public.receipt_checkout_attempts where payment_id=p.id and mode=mode_input and state in ('creating','open','paid') for update;
  if found then return a; end if;
  insert into public.receipt_checkout_attempts(owner_id,payment_id,mode,amount_cents,description,return_origin)
  values(owner_input,p.id,mode_input,(p.amount*100)::bigint,coalesce(nullif(p.description,''),'Recibo Academy Costa Brava'),origin_input)
  returning * into a;
  return a;
end;
$$;
revoke all on function public.reserve_receipt_checkout(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_receipt_checkout(uuid,uuid,text,text) to service_role;

create function public.confirm_receipt_checkout(event_input text,type_input text,attempt_input uuid,session_input text,livemode_input boolean,amount_input bigint,currency_input text,payment_status_input text,intent_input text)
returns void language plpgsql security invoker set search_path='' as $$
declare a public.receipt_checkout_attempts%rowtype; p public.payments%rowtype;
begin
  -- Same lock order as reservation: receipt first, then attempt.
  select p0.* into strict p from public.payments p0 join public.receipt_checkout_attempts a0 on a0.payment_id=p0.id where a0.id=attempt_input for update of p0;
  select * into strict a from public.receipt_checkout_attempts where id=attempt_input for update;
  if type_input not in ('checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired') then raise exception 'Unsupported event'; end if;
  if a.stripe_session_id is null then raise exception 'Session not yet bound'; end if;
  if a.stripe_session_id is distinct from session_input or (a.mode='live') is distinct from livemode_input or a.amount_cents is distinct from amount_input or a.currency is distinct from currency_input then raise exception 'Session mismatch'; end if;
  if exists(select 1 from public.receipt_checkout_events where event_id=event_input) then return; end if;
  if type_input in ('checkout.session.completed','checkout.session.async_payment_succeeded') and payment_status_input='paid' then
    if a.mode='live' then
      if p.amount*100 <> a.amount_cents or p.status not in ('pending','failed','paid') then raise exception 'Receipt changed; manual reconciliation required'; end if;
      perform set_config('academy.receipt_fulfillment',a.id::text,true);
      update public.payments set status='paid',method='stripe',paid_at=coalesce(paid_at,now()),stripe_payment_intent_id=intent_input,updated_at=now() where id=a.payment_id;
    end if;
    update public.receipt_checkout_attempts set state='paid',confirmed_at=coalesce(confirmed_at,now()) where id=a.id;
  elsif a.state<>'paid' and type_input='checkout.session.expired' then
    update public.receipt_checkout_attempts set state='expired' where id=a.id;
  elsif a.state<>'paid' and type_input='checkout.session.async_payment_failed' then
    update public.receipt_checkout_attempts set state='failed' where id=a.id;
  end if;
  insert into public.receipt_checkout_events(event_id,attempt_id,event_type) values(event_input,a.id,type_input);
end;
$$;
revoke all on function public.confirm_receipt_checkout(text,text,uuid,text,boolean,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.confirm_receipt_checkout(text,text,uuid,text,boolean,bigint,text,text,text) to service_role;

-- Do not let an administrator manually settle/reprice a receipt while a live
-- card checkout can still charge it. Expire the Stripe session first.
create function public.guard_open_receipt_checkout() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.receipt_checkout_attempts a where a.payment_id=old.id and a.mode='live' and a.state in ('creating','open') and a.id::text is distinct from current_setting('academy.receipt_fulfillment',true)) then
    if tg_op='DELETE' then raise exception 'Expire Stripe checkout before deleting this receipt'; end if;
    if new.amount is distinct from old.amount or new.status is distinct from old.status then raise exception 'Expire Stripe checkout before changing this receipt'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.guard_open_receipt_checkout() from public,anon,authenticated;
create trigger protect_open_receipt_checkout before update of amount,status or delete on public.payments for each row execute function public.guard_open_receipt_checkout();
