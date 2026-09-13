-- Version reconciled with the remote migration history.
-- Deliberately isolated sandbox. No triggers or references to real payments/orders.
create table public.stripe_test_attempts (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    amount_cents integer not null default 100 check (amount_cents = 100),
    currency text not null default 'eur' check (currency = 'eur'),
    state text not null default 'creating' check (state in ('creating','open','paid','expired','failed')),
    stripe_session_id text unique check (stripe_session_id ~ '^cs_test_[A-Za-z0-9]+$'),
    checkout_url text,
    return_base text not null,
    expires_at timestamptz not null default (now() + interval '1 hour'),
    created_at timestamptz not null default now(),
    confirmed_at timestamptz
);
create unique index stripe_test_attempts_one_active on public.stripe_test_attempts(owner_id) where state in ('creating','open');
create index stripe_test_attempts_owner on public.stripe_test_attempts(owner_id,created_at desc);
alter table public.stripe_test_attempts enable row level security;
revoke all on public.stripe_test_attempts from public,anon,authenticated;
grant select on public.stripe_test_attempts to authenticated;
grant all on public.stripe_test_attempts to service_role;
create policy stripe_test_owner_read on public.stripe_test_attempts for select to authenticated using (owner_id = (select auth.uid()));

create table public.stripe_test_events (
    event_id text primary key check (event_id ~ '^evt_[A-Za-z0-9]+$'),
    attempt_id uuid not null references public.stripe_test_attempts(id) on delete cascade,
    event_type text not null,
    processed_at timestamptz not null default now()
);
create index stripe_test_events_attempt on public.stripe_test_events(attempt_id);
alter table public.stripe_test_events enable row level security;
revoke all on public.stripe_test_events from public,anon,authenticated;
grant all on public.stripe_test_events to service_role;
create policy stripe_test_events_server_only on public.stripe_test_events for all to service_role using (true) with check (true);

-- Invoker + service_role-only EXECUTE, not a public privileged RPC.
create function public.reserve_stripe_connection_test(owner_input uuid, return_base_input text)
returns public.stripe_test_attempts language plpgsql security invoker set search_path = '' as $$
declare result public.stripe_test_attempts;
begin
    if not exists(select 1 from public.profiles where id=owner_input and role='admin') then
        raise exception 'Admin required';
    end if;
    if return_base_input !~ '^https://[a-z0-9-]+[.]vercel[.]app/admin/stripe$' then raise exception 'Invalid return URL'; end if;
    perform pg_advisory_xact_lock(hashtextextended('stripe-test:' || owner_input::text,0));
    select * into result from public.stripe_test_attempts where owner_id=owner_input and state in ('creating','open') limit 1;
    if not found then
        insert into public.stripe_test_attempts(owner_id,return_base) values(owner_input,return_base_input) returning * into result;
    end if;
    return result;
end $$;
revoke all on function public.reserve_stripe_connection_test(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_stripe_connection_test(uuid,text) to service_role;

create function public.confirm_stripe_connection_test(
    event_input text, type_input text, attempt_input uuid, session_input text,
    livemode_input boolean, amount_input integer, currency_input text, payment_status_input text
) returns text language plpgsql security invoker set search_path = '' as $$
declare attempt public.stripe_test_attempts; prior uuid;
begin
    if livemode_input is distinct from false then raise exception 'Live event rejected'; end if;
    if type_input not in ('checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired') then raise exception 'Unsupported event'; end if;
    select * into attempt from public.stripe_test_attempts where id=attempt_input for update;
    if not found then raise exception 'Attempt not registered'; end if;
    if attempt.stripe_session_id is null then raise exception 'Session binding pending; retry'; end if;
    if attempt.stripe_session_id is distinct from session_input or attempt.amount_cents is distinct from amount_input or attempt.currency is distinct from currency_input then raise exception 'Session mismatch'; end if;
    select attempt_id into prior from public.stripe_test_events where event_id=event_input;
    if found then
        if prior <> attempt_input then raise exception 'Event mismatch'; end if;
        return 'duplicate';
    end if;
    insert into public.stripe_test_events(event_id,attempt_id,event_type) values(event_input,attempt_input,type_input);
    if type_input in ('checkout.session.completed','checkout.session.async_payment_succeeded') and payment_status_input='paid' then
        update public.stripe_test_attempts set state='paid',confirmed_at=coalesce(confirmed_at,now()) where id=attempt_input;
    elsif attempt.state <> 'paid' and type_input='checkout.session.expired' then
        update public.stripe_test_attempts set state='expired' where id=attempt_input;
    elsif attempt.state <> 'paid' and type_input='checkout.session.async_payment_failed' then
        update public.stripe_test_attempts set state='failed' where id=attempt_input;
    end if;
    return 'processed';
end $$;
revoke all on function public.confirm_stripe_connection_test(text,text,uuid,text,boolean,integer,text,text) from public,anon,authenticated;
grant execute on function public.confirm_stripe_connection_test(text,text,uuid,text,boolean,integer,text,text) to service_role;
