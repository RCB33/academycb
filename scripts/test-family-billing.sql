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
insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into profiles values('00000000-0000-0000-0000-000000000001','admin'),('00000000-0000-0000-0000-000000000002','guardian'),('00000000-0000-0000-0000-000000000003','guardian');
insert into children values('10000000-0000-0000-0000-000000000001','Hermana uno',null),('10000000-0000-0000-0000-000000000002','Hermana dos',null);
insert into guardians values('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','family@example.invalid');
insert into child_guardians values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001');
insert into family_billing_batches values('40000000-0000-0000-0000-000000000001',now());
insert into academy_memberships(id,child_id,status,start_date,end_date,monthly_price) values
 ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','active','2090-01-16','2090-03-31',75),
 ('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','active','2090-02-23','2090-03-31',140);
insert into enrollment_requests values
 ('60000000-0000-0000-0000-000000000001','academy','enrolled','family@example.invalid','Hermana uno','10000000-0000-0000-0000-000000000001','{"payment_choice":"monthly_card","accepted":{"membership_id":"50000000-0000-0000-0000-000000000001","first_total":117.50}}'),
 ('60000000-0000-0000-0000-000000000002','academy','new','family@example.invalid','Hermana dos','10000000-0000-0000-0000-000000000002','{"payment_choice":"monthly_card","accepted":{"membership_id":"50000000-0000-0000-0000-000000000002","first_total":35}}');
insert into family_billing_members select '40000000-0000-0000-0000-000000000001',id from enrollment_requests;
insert into payments(id,child_id,ref_id,amount,type,status,concept_code,covered_month,due_date,description)
 select gen_random_uuid(),'10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',amount,'academy','pending',concept,month,due::date,concept
 from (values(37.5,'monthly','2090-01','2090-01-16'),(30,'registration',null,'2090-01-16'),(50,'plus',null,'2090-01-16'),(75,'monthly','2090-02','2090-02-01'),(75,'monthly','2090-03','2090-03-01')) v(amount,concept,month,due);
insert into payments(id,child_id,ref_id,amount,type,status,concept_code,covered_month,due_date,description)
 select gen_random_uuid(),'10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002',amount,'academy','pending','monthly',month,due::date,'Cuota'
 from (values(35,'2090-02','2090-02-23'),(140,'2090-03','2090-03-01')) v(amount,month,due);
do $$declare b uuid:='40000000-0000-0000-0000-000000000001'; actor uuid:='00000000-0000-0000-0000-000000000001'; owner uuid:='00000000-0000-0000-0000-000000000002'; result jsonb;a public.billing_request_attempts%rowtype; digest text;begin
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into digest from payments p;
 begin insert into receipt_checkout_attempts values(gen_random_uuid(),(select id from payments limit 1),'test','creating');raise exception 'Individual checkout allowed';exception when others then if sqlerrm='Individual checkout allowed' then raise;end if;end;
 result:=prepare_family_billing(b,actor,'test');if result->>'status'<>'waiting_family' or exists(select 1 from billing_requests) then raise exception 'Early link created';end if;
 update enrollment_requests set status='enrolled';
 begin perform prepare_family_billing(b,owner,'test');raise exception 'Wrong actor accepted';exception when others then if sqlerrm='Wrong actor accepted' then raise;end if;end;
 -- Reject prior payment links and partial cash history without changing either.
 insert into manual_receipt_allocations values(gen_random_uuid(),(select id from payments limit 1));
 begin perform prepare_family_billing(b,actor,'test');raise exception 'Cash history grouped';exception when others then if sqlerrm='Cash history grouped' then raise;end if;end;
 delete from manual_receipt_allocations;
 result:=prepare_family_billing(b,actor,'test');if result->>'status'<>'ready' then raise exception 'Missing group';end if;
 begin update enrollment_requests set status='lost' where id='60000000-0000-0000-0000-000000000002';raise exception 'Prepared family changed';exception when others then if sqlerrm='Prepared family changed' then raise;end if;end;
 if (select count(*) from billing_requests)<>1 or (select count(*) from billing_request_items)<>7 then raise exception 'Wrong grouping';end if;
 if (select sum(amount_cents) from billing_request_items where phase='initial')<>15250 or (select sum(amount_cents) from billing_request_items where phase='recurring' and due_date='2090-03-01')<>21500 then raise exception 'Wrong family amounts';end if;
 perform prepare_family_billing(b,actor,'test');if (select count(*) from billing_requests)<>1 then raise exception 'Duplicate link';end if;
 begin perform reserve_billing_request(b,'00000000-0000-0000-0000-000000000003','test',44250);raise exception 'Foreign parent accepted';exception when others then if sqlerrm='Foreign parent accepted' then raise;end if;end;
 delete from child_guardians where child_id='10000000-0000-0000-0000-000000000002';
 begin perform reserve_billing_request(b,owner,'test',44250);raise exception 'Missing second link accepted';exception when others then if sqlerrm='Missing second link accepted' then raise;end if;end;
 insert into child_guardians values('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001');
 a:=reserve_billing_request(b,owner,'test',44250);perform bind_billing_checkout(a.id,'cs_test_family','https://checkout.stripe.com/test');
 perform collect_billing_initial(a.id,'cs_test_family',false,15250);perform collect_billing_initial(a.id,'cs_test_family',false,15250);
 update billing_request_attempts set subscription_id='sub_family',state='active' where id=a.id;
 perform collect_billing_request(a.id,'in_feb',null,'sub_family',false,7500,'2090-02-01');
 begin perform collect_billing_request(a.id,'in_march',null,'sub_family',false,7500,'2090-03-01');raise exception 'Wrong total collected';exception when others then if sqlerrm='Wrong total collected' then raise;end if;end;
 perform collect_billing_request(a.id,'in_march',null,'sub_family',false,21500,'2090-03-01');perform collect_billing_request(a.id,'in_march',null,'sub_family',false,21500,'2090-03-01');
 if (select count(*) from billing_request_collections where collection_id='in_march')<>2 or (select state from billing_requests where id=b)<>'completed' then raise exception 'Incorrect allocation';end if;
 if digest is distinct from (select md5(string_agg(to_jsonb(p)::text,'' order by id)) from payments p) then raise exception 'Test modified payments';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$begin if (select count(*) from billing_requests)<>1 then raise exception 'Family cannot read';end if;end $$;
reset role;
delete from child_guardians where child_id='10000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$begin if exists(select 1 from billing_requests) or exists(select 1 from billing_request_items) then raise exception 'Missing sibling ownership leaked billing';end if;end $$;
reset role;
rollback;
\echo PASS family billing: waiting, combined totals, staggered starts, ownership all children, no prior payment changes, idempotent allocations and RLS
