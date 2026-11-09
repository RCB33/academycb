\set ON_ERROR_STOP on
-- Run ONLY against an empty local test database. Everything is rolled back.
begin;
create role anon;
create role authenticated;
create table public.payments (
  id uuid primary key default gen_random_uuid(), type text, ref_id uuid,
  child_id uuid, amount numeric, status text, method text, paid_at timestamptz,
  due_date date, description text, created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.campuses (id uuid primary key, price numeric, name text);
create table public.tournaments_internal (id uuid primary key, price numeric, title text);
create table public.campus_enrollments (id uuid primary key, campus_id uuid, child_id uuid, status text, created_at timestamptz default now());
create table public.tournament_teams (id uuid primary key, tournament_id uuid, team_name text, status text, created_at timestamptz default now());
create table public.orders (id uuid primary key, total_amount numeric, customer_name text, payment_method text, status text, created_at timestamptz default now());
\ir ../supabase/migrations/20260914163603_separate_booking_from_payment.sql
create trigger campus_test after insert or update of status or delete on public.campus_enrollments for each row execute function public.sync_commercial_source_payment();
create trigger tournament_test after insert or update of status or delete on public.tournament_teams for each row execute function public.sync_commercial_source_payment();
create trigger order_test after insert or update of status or delete on public.orders for each row execute function public.sync_commercial_source_payment();

do $$
declare
  campus uuid := gen_random_uuid(); enrollment uuid := gen_random_uuid();
  tournament uuid := gen_random_uuid(); team uuid := gen_random_uuid();
  shop uuid := gen_random_uuid(); p public.payments%rowtype;
begin
  insert into public.campuses values(campus, 90, 'Test campus');
  insert into public.campus_enrollments(id,campus_id,child_id,status) values(enrollment,campus,gen_random_uuid(),'confirmed');
  select * into strict p from public.payments where ref_id=enrollment;
  if p.status <> 'pending' or p.paid_at is not null or p.method is not null then raise exception 'Confirmation invented collection/method'; end if;
  update public.campuses set price=140 where id=campus;
  update public.campus_enrollments set status='reserved' where id=enrollment;
  select * into strict p from public.payments where ref_id=enrollment;
  if p.amount <> 90 then raise exception 'Catalogue repriced existing obligation'; end if;
  update public.payments set status='paid',method='stripe',paid_at=now() where ref_id=enrollment;
  update public.campus_enrollments set status='cancelled' where id=enrollment;
  select * into strict p from public.payments where ref_id=enrollment;
  if p.status <> 'paid' or p.method <> 'stripe' or p.paid_at is null or p.amount <> 90 then raise exception 'Cancellation rewrote financial history'; end if;
  update public.payments set status='refunded' where ref_id=enrollment;
  update public.campus_enrollments set status='confirmed' where id=enrollment;
  if (select status from public.payments where ref_id=enrollment) <> 'refunded' then raise exception 'Enrollment undid refund'; end if;
  delete from public.campus_enrollments where id=enrollment;
  if not exists(select 1 from public.payments where id=p.id and ref_id is null and status='refunded') then raise exception 'Deleting enrollment lost financial history'; end if;

  insert into public.tournaments_internal values(tournament,60,'Test tournament');
  insert into public.tournament_teams(id,tournament_id,team_name,status) values(team,tournament,'Test','confirmed');
  if (select status from public.payments where ref_id=team) <> 'pending' then raise exception 'Team approval invented payment'; end if;

  insert into public.orders(id,total_amount,customer_name,status) values(shop,25,'Test','shipped');
  if (select status from public.payments where ref_id=shop) <> 'pending' then raise exception 'Shipping invented payment'; end if;
  update public.orders set status='paid' where id=shop;
  if (select status from public.payments where ref_id=shop) <> 'paid' then raise exception 'Explicit manual payment broke'; end if;
  update public.orders set status='shipped' where id=shop;
  if (select status from public.payments where ref_id=shop) <> 'paid' then raise exception 'Shipping undid payment'; end if;
  if has_function_privilege('anon','public.sync_commercial_source_payment()','EXECUTE') or has_function_privilege('authenticated','public.sync_commercial_source_payment()','EXECUTE') then raise exception 'Elevated trigger exposed as RPC'; end if;
  raise notice 'PASS: booking/shipping do not collect; prices, refunds and Stripe history preserved; explicit collection works; RPC locked down.';
end;
$$;
rollback;
