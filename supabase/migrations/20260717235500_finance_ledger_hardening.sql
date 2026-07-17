-- Finance users need read access to every commercial source shown in the
-- consolidated dashboard. Mutations remain restricted to administrators.
drop policy if exists "children_finance_read" on public.children;
create policy "children_finance_read" on public.children for select to authenticated
using (public.has_role(array['admin','finance']));

drop policy if exists "campuses_finance_read" on public.campuses;
create policy "campuses_finance_read" on public.campuses for select to authenticated
using (public.has_role(array['admin','finance']));

drop policy if exists "campus_enrollments_finance_read" on public.campus_enrollments;
create policy "campus_enrollments_finance_read" on public.campus_enrollments for select to authenticated
using (public.has_role(array['admin','finance']));

drop policy if exists "tournaments_finance_read" on public.tournaments_internal;
create policy "tournaments_finance_read" on public.tournaments_internal for select to authenticated
using (public.has_role(array['admin','finance']));

drop policy if exists "tournament_teams_finance_read" on public.tournament_teams;
create policy "tournament_teams_finance_read" on public.tournament_teams for select to authenticated
using (public.has_role(array['admin','finance']));

drop policy if exists "orders_finance_read" on public.orders;
create policy "orders_finance_read" on public.orders for select to authenticated
using (public.has_role(array['admin','finance']));

-- Keep an audit-friendly history: expenses are archived instead of deleted.
alter table public.expenses
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();

alter table public.payments
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('pending','paid','failed','refunded','cancelled'));

-- Financial amounts must never be negative. Refunds keep a positive amount and
-- use the refunded status, preserving the original transaction value.
alter table public.payments drop constraint if exists payments_amount_nonnegative;
alter table public.payments add constraint payments_amount_nonnegative check (amount >= 0) not valid;
alter table public.payments validate constraint payments_amount_nonnegative;

alter table public.expenses drop constraint if exists expenses_amount_positive;
alter table public.expenses add constraint expenses_amount_positive check (amount > 0) not valid;
alter table public.expenses validate constraint expenses_amount_positive;

create index if not exists payments_type_ref_idx on public.payments(type, ref_id);
create index if not exists payments_status_paid_at_idx on public.payments(status, paid_at);
create index if not exists expenses_active_date_idx on public.expenses(date) where deleted_at is null;

-- Campus, tournaments and shop orders each have one commercial receipt. These
-- triggers keep the operational module and the finance ledger synchronized.
create or replace function public.sync_commercial_source_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_type text;
  source_status text;
  source_amount numeric;
  source_child_id uuid;
  source_description text;
  source_method text := 'transfer';
  source_date date;
  existing_payment public.payments%rowtype;
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    source_type := case tg_table_name
      when 'campus_enrollments' then 'campus'
      when 'tournament_teams' then 'tournament'
      when 'orders' then 'shop'
    end;
    update public.payments
    set ref_id = null, updated_at = now()
    where type = source_type and ref_id = old.id;
    return old;
  end if;

  if tg_table_name = 'campus_enrollments' then
    source_type := 'campus';
    select price, name into source_amount, source_description
    from public.campuses where id = new.campus_id;
    source_description := 'Campus · ' || coalesce(source_description, 'Inscripción');
    source_child_id := new.child_id;
    source_status := case new.status when 'confirmed' then 'paid' when 'cancelled' then 'cancelled' else 'pending' end;
    source_date := new.created_at::date;
  elsif tg_table_name = 'tournament_teams' then
    source_type := 'tournament';
    select price, title into source_amount, source_description
    from public.tournaments_internal where id = new.tournament_id;
    source_description := coalesce(new.team_name, 'Equipo') || ' · ' || coalesce(source_description, 'Torneo');
    source_child_id := null;
    source_status := case new.status when 'confirmed' then 'paid' when 'cancelled' then 'cancelled' else 'pending' end;
    source_date := new.created_at::date;
  elsif tg_table_name = 'orders' then
    source_type := 'shop';
    source_amount := new.total_amount;
    source_description := 'Pedido · ' || coalesce(new.customer_name, 'Cliente');
    source_child_id := null;
    source_method := case when new.payment_method in ('cash','efectivo','transfer','transferencia','stripe','tarjeta') then new.payment_method else 'transfer' end;
    source_status := case when new.status in ('paid','shipped','completed') then 'paid' when new.status = 'cancelled' then 'cancelled' else 'pending' end;
    source_date := new.created_at::date;
  else
    return new;
  end if;

  select * into existing_payment
  from public.payments
  where type = source_type and ref_id = new.id
  order by created_at asc
  limit 1;

  if found then
    update public.payments
    set amount = coalesce(source_amount, 0),
        child_id = source_child_id,
        method = source_method,
        due_date = coalesce(due_date, source_date),
        description = source_description,
        status = case when source_status = 'cancelled' and existing_payment.status = 'paid' then 'paid' else source_status end,
        paid_at = case
          when source_status = 'paid' then coalesce(existing_payment.paid_at, now())
          when source_status = 'cancelled' and existing_payment.status = 'paid' then existing_payment.paid_at
          else null
        end,
        updated_at = now()
    where id = existing_payment.id;
  else
    insert into public.payments(type, ref_id, child_id, amount, status, method, paid_at, due_date, description)
    values (
      source_type, new.id, source_child_id, coalesce(source_amount, 0), source_status, source_method,
      case when source_status = 'paid' then coalesce(new.created_at, now()) else null end,
      source_date, source_description
    );
  end if;

  return new;
end;
$$;

drop trigger if exists campus_enrollment_finance_sync on public.campus_enrollments;
create trigger campus_enrollment_finance_sync
after insert or update of status or delete on public.campus_enrollments
for each row execute function public.sync_commercial_source_payment();

drop trigger if exists tournament_team_finance_sync on public.tournament_teams;
create trigger tournament_team_finance_sync
after insert or update of status or delete on public.tournament_teams
for each row execute function public.sync_commercial_source_payment();

drop trigger if exists order_finance_sync on public.orders;
create trigger order_finance_sync
after insert or update of status or delete on public.orders
for each row execute function public.sync_commercial_source_payment();

create or replace function public.sync_payment_to_commercial_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 or new.ref_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  if new.type = 'academy' then
    update public.academy_memberships am
    set payment_status = case
      when not exists (
        select 1 from public.payments p where p.type='academy' and p.ref_id=am.id and p.status <> 'paid'
      ) then 'paid'
      when exists (
        select 1 from public.payments p where p.type='academy' and p.ref_id=am.id
          and p.status='pending' and p.due_date < current_date
      ) then 'overdue'
      else 'pending'
    end
    where am.id = new.ref_id;
  elsif new.type = 'campus' then
    update public.campus_enrollments set status = case
      when new.status = 'paid' then 'confirmed'
      when new.status in ('cancelled','refunded') then 'cancelled'
      else 'pending_payment'
    end where id = new.ref_id;
  elsif new.type = 'tournament' then
    update public.tournament_teams set status = case
      when new.status = 'paid' then 'confirmed'
      when new.status in ('cancelled','refunded') then 'cancelled'
      else 'registered'
    end where id = new.ref_id;
  elsif new.type = 'shop' then
    update public.orders set status = case
      when new.status = 'paid' then 'paid'
      when new.status in ('cancelled','refunded') then 'cancelled'
      else 'pending'
    end where id = new.ref_id;
  end if;

  return new;
end;
$$;

drop trigger if exists payment_commercial_source_sync on public.payments;
create trigger payment_commercial_source_sync
after insert or update of status on public.payments
for each row execute function public.sync_payment_to_commercial_source();

-- Backfill receipts for any existing commercial records without touching
-- Academy, where multiple instalments may legitimately share one membership.
insert into public.payments(type, ref_id, child_id, amount, status, method, paid_at, due_date, description)
select 'campus', ce.id, ce.child_id, coalesce(c.price,0),
       case ce.status when 'confirmed' then 'paid' when 'cancelled' then 'cancelled' else 'pending' end,
       'transfer', case when ce.status = 'confirmed' then ce.created_at else null end,
       ce.created_at::date, 'Campus · ' || c.name
from public.campus_enrollments ce
join public.campuses c on c.id = ce.campus_id
where not exists (select 1 from public.payments p where p.type='campus' and p.ref_id=ce.id);

insert into public.payments(type, ref_id, amount, status, method, paid_at, due_date, description)
select 'tournament', tt.id, coalesce(t.price,0),
       case tt.status when 'confirmed' then 'paid' when 'cancelled' then 'cancelled' else 'pending' end,
       'transfer', case when tt.status = 'confirmed' then tt.created_at else null end,
       tt.created_at::date, tt.team_name || ' · ' || t.title
from public.tournament_teams tt
join public.tournaments_internal t on t.id = tt.tournament_id
where not exists (select 1 from public.payments p where p.type='tournament' and p.ref_id=tt.id);

insert into public.payments(type, ref_id, amount, status, method, paid_at, due_date, description)
select 'shop', o.id, o.total_amount,
       case when o.status in ('paid','shipped','completed') then 'paid' when o.status='cancelled' then 'cancelled' else 'pending' end,
       case when o.payment_method in ('cash','efectivo','transfer','transferencia','stripe','tarjeta') then o.payment_method else 'transfer' end,
       case when o.status in ('paid','shipped','completed') then o.created_at else null end,
       o.created_at::date, 'Pedido · ' || o.customer_name
from public.orders o
where not exists (select 1 from public.payments p where p.type='shop' and p.ref_id=o.id);

-- Synchronize the membership summary with its receipt ledger. The receipt
-- table remains the accounting source of truth.
update public.academy_memberships am
set payment_status = case
  when not exists (
    select 1 from public.payments p
    where p.type = 'academy' and p.ref_id = am.id and p.status <> 'paid'
  ) and exists (
    select 1 from public.payments p
    where p.type = 'academy' and p.ref_id = am.id
  ) then 'paid'
  when exists (
    select 1 from public.payments p
    where p.type = 'academy' and p.ref_id = am.id
      and p.status = 'pending' and p.due_date < current_date
  ) then 'overdue'
  else 'pending'
end
where exists (
  select 1 from public.payments p
  where p.type = 'academy' and p.ref_id = am.id
);
