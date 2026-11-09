-- Immutable online contract. Test contracts never alter real memberships or receipts.
create table public.academy_checkout_contracts (
 id uuid primary key default gen_random_uuid(),
 membership_id uuid not null references public.academy_memberships(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 mode text not null check(mode in ('test','live')),
 choice text not null check(choice in ('full','monthly')),
 state text not null default 'creating' check(state in ('creating','open','active','completed','expired','cancelled')),
 plan_name text not null,
 unit_cents bigint not null check(unit_cents between 50 and 100000000),
 fee_cents bigint not null check(fee_cents between 0 and 100000000),
 months integer not null check(months between 1 and 60),
 total_cents bigint not null check(total_cents between 50 and 100000000),
 return_origin text not null,
 stripe_session_id text unique, checkout_url text,
 stripe_subscription_id text unique, stripe_schedule_id text unique,
 billing_status text not null default 'pending' check(billing_status in ('pending','active','attention','ended')),
 billing_updated_at timestamptz,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 hour'
);
create unique index academy_contract_one on public.academy_checkout_contracts(membership_id,mode) where state not in ('expired','cancelled');
create index academy_contract_owner on public.academy_checkout_contracts(owner_id,created_at desc);
create table public.academy_contract_collections (
 id text primary key, -- Stripe invoice ID, or Checkout session for full payment
 contract_id uuid not null references public.academy_checkout_contracts(id),
 amount_cents bigint not null, created_at timestamptz not null default now()
);
create index academy_collections_contract on public.academy_contract_collections(contract_id);
alter table public.academy_checkout_contracts enable row level security;
alter table public.academy_contract_collections enable row level security;
revoke all on public.academy_checkout_contracts,public.academy_contract_collections from anon,authenticated;
grant all on public.academy_checkout_contracts,public.academy_contract_collections to service_role;
grant select on public.academy_checkout_contracts,public.academy_contract_collections to authenticated;
create policy academy_contract_read on public.academy_checkout_contracts for select to authenticated using(owner_id=(select auth.uid()) or public.has_role(array['admin','finance']));
create policy academy_collections_read on public.academy_contract_collections for select to authenticated using(exists(select 1 from public.academy_checkout_contracts c where c.id=contract_id));

create function public.reserve_academy_contract(membership_input uuid,owner_input uuid,mode_input text,choice_input text,origin_input text)
returns public.academy_checkout_contracts language plpgsql security invoker set search_path='' as $$
declare m public.academy_memberships%rowtype; p public.membership_plans%rowtype; c public.academy_checkout_contracts%rowtype; unit_price numeric; fee numeric; total numeric;
begin
 if mode_input not in ('test','live') or choice_input not in ('full','monthly') or origin_input !~ '^https://[a-z0-9.-]+$' then raise exception 'Invalid contract'; end if;
 perform pg_advisory_xact_lock(hashtextextended(membership_input::text,0));
 select * into strict m from public.academy_memberships where id=membership_input for update;
 if m.status<>'active' then raise exception 'Membership not active'; end if;
 if not exists(select 1 from public.profiles where id=owner_input and role='admin') and not exists(select 1 from public.child_guardians cg join public.guardians g on g.id=cg.guardian_id where cg.child_id=m.child_id and g.user_id=owner_input) then raise exception 'Membership not owned'; end if;
 select * into c from public.academy_checkout_contracts where membership_id=m.id and mode=mode_input and state not in ('expired','cancelled') for update;
 if found then return c; end if;
 if exists(select 1 from public.payments where type='academy' and ref_id=m.id and status in ('paid','refunded')) then raise exception 'Already collected: reconcile with finance before changing modality'; end if;
 if exists(select 1 from public.receipt_checkout_attempts a join public.payments r on r.id=a.payment_id where r.type='academy' and r.ref_id=m.id and a.mode=mode_input and a.state in ('creating','open','paid')) then raise exception 'Receipt checkout already started'; end if;
 select * into strict p from public.membership_plans where id=m.plan_id;
 if not p.is_active or (choice_input='full' and not p.full_payment_enabled) or (choice_input='monthly' and not p.monthly_payment_enabled) then raise exception 'Online modality disabled'; end if;
 unit_price:=case when choice_input='full' then p.full_payment_price else p.monthly_payment_price end;
 fee:=coalesce(p.enrollment_fee,0);
 if unit_price is null or unit_price<0.5 or unit_price*100<>trunc(unit_price*100) or fee<0 or fee*100<>trunc(fee*100) then raise exception 'Invalid price'; end if;
 total:=unit_price*(case when choice_input='full' then 1 else p.duration_months end)+fee;
 insert into public.academy_checkout_contracts(membership_id,owner_id,mode,choice,plan_name,unit_cents,fee_cents,months,total_cents,return_origin)
 values(m.id,owner_input,mode_input,choice_input,p.name,unit_price*100,fee*100,p.duration_months,total*100,origin_input) returning * into c;
 return c;
end;
$$;
revoke all on function public.reserve_academy_contract(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_academy_contract(uuid,uuid,text,text,text) to service_role;

create function public.collect_academy_contract(contract_input uuid,collection_input text,subscription_input text,session_input text,livemode_input boolean,amount_input bigint,first_input boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare c public.academy_checkout_contracts%rowtype; m public.academy_memberships%rowtype; n integer; expected bigint;
begin
 select * into strict c from public.academy_checkout_contracts where id=contract_input;
 perform pg_advisory_xact_lock(hashtextextended(c.membership_id::text,0));
 select * into strict c from public.academy_checkout_contracts where id=contract_input for update;
 select * into strict m from public.academy_memberships where id=c.membership_id for update;
 if (c.mode='live') is distinct from livemode_input then raise exception 'Mode mismatch'; end if;
 if c.choice='full' then
   if c.stripe_session_id is null or c.stripe_session_id is distinct from session_input then raise exception 'Session mismatch'; end if;
   expected:=c.total_cents;
 else
   if c.stripe_subscription_id is null or c.stripe_subscription_id is distinct from subscription_input then raise exception 'Subscription binding pending or mismatched'; end if;
   expected:=c.unit_cents+case when first_input then c.fee_cents else 0 end;
 end if;
 if amount_input is distinct from expected then raise exception 'Invoice amount mismatch'; end if;
 if exists(select 1 from public.academy_contract_collections where id=collection_input and contract_id=c.id) then return; end if;
 select count(*) into n from public.academy_contract_collections where contract_id=c.id;
 if n >= (case when c.choice='full' then 1 else c.months end) then raise exception 'Collection beyond contract duration'; end if;
 insert into public.academy_contract_collections(id,contract_id,amount_cents) values(collection_input,c.id,amount_input);
 if c.mode='live' then
   -- Replace only uncollected legacy schedule; preserve all historical entries.
   perform set_config('academy.contract_fulfillment',c.id::text,true);
   if n=0 then update public.payments set status='cancelled',updated_at=now() where type='academy' and ref_id=m.id and status in ('pending','failed'); end if;
   insert into public.payments(type,ref_id,child_id,amount,status,method,paid_at,due_date,description,stripe_invoice_id)
   values('academy',m.id,m.child_id,amount_input/100.0,'paid','stripe',now(),current_date,
    c.plan_name||case when c.choice='full' then ' · Pago completo' else ' · Mensualidad '||(n+1)||'/'||c.months end,
    case when c.choice='monthly' then collection_input else null end);
   update public.academy_memberships set payment_method='stripe',payment_status=case when c.choice='full' or n+1=c.months then 'paid' else 'pending' end where id=m.id;
 end if;
 update public.academy_checkout_contracts set state=case when c.choice='full' or n+1=c.months then 'completed' else 'active' end,
 billing_status='active',billing_updated_at=now() where id=c.id;
end;
$$;
revoke all on function public.collect_academy_contract(uuid,text,text,text,boolean,bigint,boolean) from public,anon,authenticated;
grant execute on function public.collect_academy_contract(uuid,text,text,text,boolean,bigint,boolean) to service_role;

create function public.guard_academy_receipt_attempt() returns trigger language plpgsql security definer set search_path='' as $$
declare membership uuid;
begin
 select ref_id into membership from public.payments where id=new.payment_id and type='academy';
 if membership is not null then
   perform pg_advisory_xact_lock(hashtextextended(membership::text,0));
   if exists(select 1 from public.academy_checkout_contracts where membership_id=membership and mode=new.mode and state not in ('expired','cancelled')) then raise exception 'Membership already has an online contract'; end if;
 end if;
 return new;
end;
$$;
revoke all on function public.guard_academy_receipt_attempt() from public,anon,authenticated;
create trigger academy_receipt_attempt_guard before insert on public.receipt_checkout_attempts for each row execute function public.guard_academy_receipt_attempt();

create function public.guard_academy_contract_payments() returns trigger language plpgsql security definer set search_path='' as $$
declare membership uuid;
begin
 if tg_op='DELETE' then membership:=old.ref_id; else membership:=new.ref_id; end if;
 if exists(select 1 from public.academy_checkout_contracts c where c.membership_id=membership and c.mode='live' and c.state not in ('expired','cancelled') and c.id::text is distinct from current_setting('academy.contract_fulfillment',true)) then
   raise exception 'Manage this membership through its Stripe contract';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
revoke all on function public.guard_academy_contract_payments() from public,anon,authenticated;
create trigger academy_contract_payment_guard before insert or update of amount,status or delete on public.payments for each row execute function public.guard_academy_contract_payments();
