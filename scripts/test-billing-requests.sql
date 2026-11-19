\set ON_ERROR_STOP on
-- Disposable local PostgreSQL only. No production data; rollback all fixtures.
begin;
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema private;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.profiles(id uuid primary key,role text);
create function public.has_role(text[]) returns boolean language sql as $$select exists(select 1 from public.profiles where id=auth.uid() and role=any($1))$$;
create table public.children(id uuid primary key);
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
insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into profiles values('00000000-0000-0000-0000-000000000001','finance'),('00000000-0000-0000-0000-000000000002','guardian'),('00000000-0000-0000-0000-000000000003','guardian');
insert into children values('10000000-0000-0000-0000-000000000001');
insert into guardians values('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','fixture@example.invalid'),('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','other@example.invalid');
insert into child_guardians values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002');
insert into payments(id,child_id,amount,status,type,description,due_date,covered_month,concept_code)
select ('30000000-0000-0000-0000-00000000000'||n)::uuid,'10000000-0000-0000-0000-000000000001',75,'pending','academy','Cuota QA '||n, (date_trunc('month',current_date)+make_interval(months=>n)+interval '4 days')::date,to_char(date_trunc('month',current_date)+make_interval(months=>n),'YYYY-MM'),'monthly' from generate_series(1,3)n;
do $$declare actor uuid:='00000000-0000-0000-0000-000000000001'; owner uuid:='00000000-0000-0000-0000-000000000002'; child uuid:='10000000-0000-0000-0000-000000000001'; guardian uuid:='20000000-0000-0000-0000-000000000001'; ids uuid[]:=array['30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002']::uuid[]; req uuid:='40000000-0000-0000-0000-000000000001'; a public.billing_request_attempts%rowtype; digest text; begin
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into digest from payments p;
 perform create_billing_request(req,actor,child,guardian,'subscription','test','QA subscription',ids);
 perform create_billing_request(req,actor,child,guardian,'subscription','test','QA subscription',ids);
 if (select count(*) from billing_requests)<>1 then raise exception 'Duplicate request'; end if;
 begin perform create_billing_request(gen_random_uuid(),actor,child,guardian,'subscription','test','QA overlap',ids);raise exception 'Overlap accepted'; exception when others then if sqlerrm='Overlap accepted' then raise;end if;end;
 begin perform reserve_billing_request(req,'00000000-0000-0000-0000-000000000003','test',15000);raise exception 'Other tutor accepted'; exception when others then if sqlerrm='Other tutor accepted' then raise;end if;end;
 begin perform reserve_billing_request(req,owner,'test',1);raise exception 'Price tampering accepted'; exception when others then if sqlerrm='Price tampering accepted' then raise;end if;end;
 a:=reserve_billing_request(req,owner,'test',15000);
 if (reserve_billing_request(req,owner,'test',15000)).id<>a.id then raise exception 'Duplicate attempt'; end if;
 if not bind_billing_checkout(a.id,'cs_test_qa','https://checkout.stripe.com/test') then raise exception 'Bind failed'; end if;
 update billing_request_attempts set subscription_id='sub_test_qa',state='active' where id=a.id;
 perform collect_billing_request(a.id,'in_test_first',null,'sub_test_qa',false,7500,(select due_date from payments where id=ids[1]));
 perform collect_billing_request(a.id,'in_test_first',null,'sub_test_qa',false,7500,(select due_date from payments where id=ids[1]));
 begin perform collect_billing_request(a.id,'in_other_duplicate',null,'sub_test_qa',false,7500,(select due_date from payments where id=ids[1]));raise exception 'Duplicate invoice accepted'; exception when others then if sqlerrm='Duplicate invoice accepted' then raise;end if;end;
 perform collect_billing_request(a.id,'in_test_second',null,'sub_test_qa',false,7500,(select due_date from payments where id=ids[2]));
 if (select state from billing_requests where id=req)<>'completed' then raise exception 'Not completed'; end if;
 if digest is distinct from (select md5(string_agg(to_jsonb(p)::text,'' order by id)) from payments p) then raise exception 'TEST changed payments'; end if;
 -- LIVE fixture: reserve blocks competing card/manual operations, then collects
 -- only the selected receipt. These are disposable fixtures, never production.
 req:='40000000-0000-0000-0000-000000000002';ids:=array['30000000-0000-0000-0000-000000000003']::uuid[];
 perform create_billing_request(req,actor,child,guardian,'payment','live','QA one-off',ids);
 a:=reserve_billing_request(req,owner,'live',7500);perform bind_billing_checkout(a.id,'cs_live_qa','https://checkout.stripe.com/test');
 begin update payments set amount=1 where id=ids[1];raise exception 'Locked amount changed';exception when others then if sqlerrm='Locked amount changed' then raise;end if;end;
 begin insert into manual_receipt_allocations values(gen_random_uuid(),ids[1]);raise exception 'Manual overlap allowed';exception when others then if sqlerrm='Manual overlap allowed' then raise;end if;end;
 begin insert into receipt_checkout_attempts values(gen_random_uuid(),ids[1],'live','creating');raise exception 'Checkout overlap allowed';exception when others then if sqlerrm='Checkout overlap allowed' then raise;end if;end;
 perform collect_billing_request(a.id,'cs_live_qa','cs_live_qa',null,true,7500,null);
 if (select count(*) from payments where status='paid')<>1 then raise exception 'Wrong payments collected';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$begin
 if exists(select 1 from billing_requests) or exists(select 1 from billing_request_items) then raise exception 'Other tutor can read request';end if;
 if has_function_privilege('authenticated','public.reserve_billing_request(uuid,uuid,text,bigint)','execute') then raise exception 'Unsafe writer privilege';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$begin if (select count(*) from billing_requests)<>2 then raise exception 'Owner cannot read';end if;end $$;
rollback;
\echo Billing requests: atomicity, ownership, snapshots, idempotency, TEST isolation, no double collection, LIVE fixture locking and RLS: PASS
