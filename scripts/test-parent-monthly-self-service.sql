\set ON_ERROR_STOP on
-- Disposable local PostgreSQL only. No production data; rollback all fixtures.
begin;
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema private;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.profiles(id uuid primary key,role text);
create function public.has_role(text[]) returns boolean language sql as $$select exists(select 1 from public.profiles where id=auth.uid() and role=any($1))$$;
create table public.children(id uuid primary key,full_name text,archived_at timestamptz);
create table public.guardians(id uuid primary key,user_id uuid, email text);
create table public.child_guardians(child_id uuid,guardian_id uuid);
create table public.payments(id uuid primary key,child_id uuid,amount numeric,status text,type text,ref_id uuid,description text,due_date date,covered_month text,concept_code text,method text,paid_at timestamptz,updated_at timestamptz,stripe_invoice_id text);
create table public.manual_receipt_allocations(id uuid primary key,payment_id uuid);
create table public.receipt_checkout_attempts(id uuid primary key,payment_id uuid,mode text,state text);
create table public.academy_checkout_contracts(id uuid primary key,membership_id uuid,mode text,state text);
create table public.campus_enrollments(id uuid primary key,status text);
create table public.orders(id uuid primary key,status text);
grant usage on schema public,auth,private to authenticated,service_role;
grant select on public.profiles,public.guardians,public.child_guardians to authenticated;
\ir ../supabase/migrations/20261119100055_admin_billing_requests.sql
\ir ../supabase/migrations/20261119102115_billing_request_lock_order.sql

create table public.enrollment_requests(id uuid primary key,service text,status text,email text,child_name text,accepted_child_id uuid,academy_details jsonb);
create table public.academy_memberships(id uuid primary key,child_id uuid,status text,start_date date,end_date date,monthly_price numeric,plan_snapshot jsonb,agreed_payment_method text default 'stripe');
create table private.combined_enrollment_submissions(id uuid primary key,result jsonb);
create function private.submit_combined_enrollment(uuid,uuid,text,jsonb) returns jsonb language sql as $$select '[]'::jsonb$$;
\ir ../supabase/migrations/20261120153011_academy_initial_card_payment.sql
\ir ../supabase/migrations/20261121183737_family_academy_billing.sql
alter table auth.users add column email_confirmed_at timestamptz default now();
\ir ../supabase/migrations/20261124173004_parent_monthly_self_service.sql
insert into auth.users(id) values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into profiles values('00000000-0000-0000-0000-000000000001','admin'),('00000000-0000-0000-0000-000000000002','guardian'),('00000000-0000-0000-0000-000000000003','guardian');
insert into children values('10000000-0000-0000-0000-000000000001','Hermana uno',null),('10000000-0000-0000-0000-000000000002','Hermana dos',null);
insert into guardians values('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','family@example.invalid');
insert into child_guardians values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001');
insert into academy_memberships(id,child_id,status,start_date,end_date,monthly_price,plan_snapshot,agreed_payment_method) values
 ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','active','2090-01-01','2090-04-30',75,'{"frequency":"mensual"}','cash'),
 ('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','active','2090-03-01','2090-04-30',140,'{"frequency":"mensual"}','cash');
insert into payments(id,child_id,ref_id,amount,type,status,concept_code,covered_month,due_date,description)
 select gen_random_uuid(),'10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',75,'academy',state,'monthly',month,due::date,'Cuota'
 from (values('paid','2090-01','2090-01-01'),('pending','2090-02','2090-02-01'),('pending','2090-03','2090-03-01'),('pending','2090-04','2090-04-01')) v(state,month,due);
insert into payments(id,child_id,ref_id,amount,type,status,concept_code,covered_month,due_date,description)
 select gen_random_uuid(),'10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002',140,'academy','pending','monthly',month,due::date,'Cuota'
 from (values('2090-03','2090-03-01'),('2090-04','2090-04-01')) v(month,due);
create temp table test_ids(request_id uuid);
grant all on all tables in schema public to service_role;
grant all on test_ids to service_role;
set local role service_role;
do $$declare owner uuid:='00000000-0000-0000-0000-000000000002'; guardian uuid:='20000000-0000-0000-0000-000000000001'; result jsonb; rid uuid; digest text;begin
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into digest from payments p;
 begin perform prepare_parent_monthly_billing('00000000-0000-0000-0000-000000000003',guardian,'test');raise exception 'Foreign parent accepted';exception when others then if sqlerrm='Foreign parent accepted' then raise;end if;end;
 begin perform prepare_parent_monthly_billing('00000000-0000-0000-0000-000000000001',guardian,'test');raise exception 'Admin preview accepted';exception when others then if sqlerrm='Admin preview accepted' then raise;end if;end;
 -- Partial manual history must not be charged in full; failed preparation is atomic.
 insert into manual_receipt_allocations values(gen_random_uuid(),(select id from payments where status='pending' limit 1));
 begin perform prepare_parent_monthly_billing(owner,guardian,'test');raise exception 'Partial receipt accepted';exception when others then if sqlerrm='Partial receipt accepted' then raise;end if;end;
 delete from manual_receipt_allocations;
 if exists(select 1 from billing_requests) then raise exception 'Failed prepare left a request';end if;
 -- A gap with no family receipt must never be shifted to an already-paid month.
 update payments set status='paid' where due_date='2090-03-01';
 begin perform prepare_parent_monthly_billing(owner,guardian,'test');raise exception 'Calendar gap accepted';exception when others then if sqlerrm='Calendar gap accepted' then raise;end if;end;
 update payments set status='pending' where due_date='2090-03-01';
 result:=prepare_parent_monthly_billing(owner,guardian,'test');rid:=(result->>'requestId')::uuid;
 if rid is null or (select count(*) from billing_request_items where request_id=rid)<>5 then raise exception 'Wrong receipt selection';end if;
 if exists(select 1 from billing_request_items i join payments p on p.id=i.payment_id where p.status='paid' or i.phase<>'recurring') then raise exception 'Included paid or initial receipts';end if;
 if (select total_cents from billing_requests where id=rid)<>50500 then raise exception 'Wrong total';end if;
 if (select sum(amount_cents) from billing_request_items where request_id=rid and due_date='2090-03-01')<>21500 then raise exception 'Wrong sibling month total';end if;
 if (prepare_parent_monthly_billing(owner,guardian,'test')->>'requestId')::uuid<>rid or (select count(*) from billing_requests)<>1 then raise exception 'Duplicate created';end if;
 if digest is distinct from (select md5(string_agg(to_jsonb(p)::text,'' order by id)) from payments p) then raise exception 'Modified existing receipts';end if;
 if exists(select 1 from academy_memberships where agreed_payment_method<>'cash') then raise exception 'Changed cash before consent';end if;
 insert into test_ids values(rid);
end $$;
reset role;
grant select on test_ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$begin
 if (select count(*) from billing_requests)<>1 then raise exception 'Owner cannot read';end if;
 if has_function_privilege('authenticated','public.prepare_parent_monthly_billing(uuid,uuid,text)','execute') then raise exception 'RPC accessible directly';end if;
end $$;
reset role;
delete from child_guardians where child_id='10000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$begin if exists(select 1 from billing_requests) then raise exception 'Removed sibling ownership still readable';end if;end $$;
reset role;
insert into child_guardians values('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$begin if exists(select 1 from billing_requests) then raise exception 'Other family can read';end if;end $$;
reset role;
-- Test reservation rechecks receipts after the parent has reviewed the link.
do $$declare rid uuid; a public.billing_request_attempts;begin
 select request_id into rid from test_ids;
 update payments set amount=74 where due_date='2090-02-01';
 begin perform reserve_billing_request(rid,'00000000-0000-0000-0000-000000000002','test',50500);raise exception 'Stale receipt accepted';exception when others then if sqlerrm='Stale receipt accepted' then raise;end if;end;
 update payments set amount=75 where due_date='2090-02-01';
 a:=reserve_billing_request(rid,'00000000-0000-0000-0000-000000000002','test',50500);
 if a.id is null then raise exception 'Cannot authorize prepared cash family';end if;
end $$;
rollback;
select 'PASS parent self-service, ownership, consent boundary, paid months, siblings, duplicate clicks, manual history, gaps, RLS and reservation' as result;
