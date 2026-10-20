\set ON_ERROR_STOP on
begin;
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
create function public.is_admin() returns boolean language sql as $$select coalesce(current_setting('test.admin',true),'true')='true'$$;
create table public.teams(id uuid primary key default gen_random_uuid(),status text);
create table public.children(id uuid primary key default gen_random_uuid(),team_id uuid);
create table public.membership_plans(id uuid primary key default gen_random_uuid(),name text,description text,
duration_months int,price numeric,enrollment_fee numeric,is_active boolean default true,updated_at timestamptz default now(),
frequency text constraint membership_plans_frequency_valid check(frequency in ('mensual','trimestral','anual')));
create table public.academy_memberships(id uuid primary key default gen_random_uuid(),child_id uuid,plan_id uuid,start_date date,end_date date,
status text,payment_status text,payment_method text,monthly_price numeric);
create table public.payments(id uuid primary key default gen_random_uuid(),type text,ref_id uuid,child_id uuid,amount numeric,gross_amount numeric,
discount_amount numeric,promotion_label text,status text,method text,due_date date,concept_code text,covered_month text,description text);
\ir ../supabase/migrations/20261020093134_family_plan_assignments.sql
do $$
declare c uuid; p uuid; v timestamptz; req uuid:=gen_random_uuid(); m uuid; t uuid; before_count int; c2 uuid;
begin
insert into children default values returning id into c;
insert into teams(status) values('active') returning id into t;
insert into membership_plans(name,description,duration_months,price,enrollment_fee,frequency)
values('Academia','Actividad',9,200,30,'trimestral') returning id,updated_at into p,v;
m:=public.assign_family_plan(req,c,p,v,'2026-09-01',5,10,'Descuento',true,50,t);
if (select count(*) from payments)<>11 or (select sum(amount) from payments)<>650 then raise exception 'Wrong schedule total';end if;
if (select count(*) from payments where covered_month in ('2026-09','2026-10','2026-11') and due_date='2026-09-05')<>3 then raise exception 'Wrong quarter dates';end if;
if (select end_date from academy_memberships where id=m)<>'2027-05-31' then raise exception 'Wrong duration';end if;
if (select team_id from children where id=c)<>t then raise exception 'Missing team';end if;
if public.assign_family_plan(req,c,p,v,'2026-09-01',5,10,'Descuento',true,50,t)<>m or (select count(*) from payments)<>11 then raise exception 'Idempotency failed';end if;
begin perform public.assign_family_plan(gen_random_uuid(),c,p,v,'2026-09-01',5,0,'',false,0,null);raise exception 'Overlap allowed';exception when raise_exception then if sqlerrm='Overlap allowed' then raise;end if;end;
update membership_plans set price=999 where id=p;
if (select plan_snapshot->>'period_price' from academy_memberships where id=m)<>'200' or (select sum(amount) from payments)<>650 then raise exception 'Historical prices changed';end if;
insert into children default values returning id into c2;
insert into payments(child_id,amount,status,concept_code,covered_month) values(c2,75,'paid','monthly','2026-10');
begin perform public.assign_family_plan(gen_random_uuid(),c2,p,v,'2026-09-01',5,0,'',false,0,t);raise exception 'Existing payment overwritten';exception when raise_exception then if sqlerrm='Existing payment overwritten' then raise;end if;end;
if (select team_id from children where id=c2) is not null then raise exception 'Partial team update';end if;
perform set_config('test.admin','false',true);
begin perform public.assign_family_plan(gen_random_uuid(),c2,p,v,'2028-09-01',5,0,'',false,0,null);raise exception 'Nonadmin allowed';exception when raise_exception then if sqlerrm='Nonadmin allowed' then raise;end if;end;
perform set_config('test.admin','true',true);
begin perform public.assign_family_plan(gen_random_uuid(),c2,p,v+interval '1 second','2028-09-01',5,0,'',false,0,null);raise exception 'Stale plan allowed';exception when raise_exception then if sqlerrm='Stale plan allowed' then raise;end if;end;
update membership_plans set duration_months=10,frequency='temporada',price=100 where id=p;
m:=public.assign_family_plan(gen_random_uuid(),c2,p,v,'2028-09-01',28,100,'Beca',false,0,null);
if (select count(*) from payments where ref_id=m and amount=0 and status='paid')<>10 then raise exception 'Scholarship failed';end if;
if (select count(distinct due_date) from payments where ref_id=m)<>1 then raise exception 'Season not single due date';end if;
-- Force a payment insert failure and verify the membership and team roll back too.
insert into children default values returning id into c2;
alter table payments add constraint force_failure check(amount<500) not valid;
update membership_plans set frequency='mensual',duration_months=1,price=999 where id=p;
begin perform public.assign_family_plan(gen_random_uuid(),c2,p,v,'2028-09-01',5,0,'',false,0,t);raise exception 'Failure not raised';exception when check_violation then null;end;
if exists(select 1 from academy_memberships where child_id=c2) or (select team_id from children where id=c2) is not null then raise exception 'Partial assignment survived';end if;
if has_function_privilege('anon','public.assign_family_plan(uuid,uuid,uuid,timestamptz,date,integer,numeric,text,boolean,numeric,uuid)','execute') then raise exception 'Anon execute granted';end if;
end$$;
rollback;
\echo PASS: atomic family plan assignment, periods, snapshots, overlaps, permissions, idempotency, rollback
