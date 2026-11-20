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
create table public.enrollment_requests(id uuid primary key,email text,status text,service text,accepted_child_id uuid,academy_details jsonb);
create table public.academy_memberships(id uuid primary key,child_id uuid,status text,start_date date,end_date date,monthly_price numeric,plan_snapshot jsonb);
\ir ../supabase/migrations/20261120153011_academy_initial_card_payment.sql
insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into profiles values('00000000-0000-0000-0000-000000000001','finance'),('00000000-0000-0000-0000-000000000002','guardian'),('00000000-0000-0000-0000-000000000003','guardian');
insert into children values('10000000-0000-0000-0000-000000000001');
insert into guardians values('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','fixture@example.invalid'),('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','other@example.invalid');
insert into child_guardians values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002');

-- Synthetic records only, exercising both live allocation semantics and test isolation.
do $$declare
 actor uuid:='00000000-0000-0000-0000-000000000001'; owner uuid:='00000000-0000-0000-0000-000000000002';
 child uuid:='10000000-0000-0000-0000-000000000001'; guardian uuid:='20000000-0000-0000-0000-000000000001';
 req uuid; membership uuid; a public.billing_request_attempts%rowtype; m text; first_due date:=(date_trunc('month',current_date)+interval '1 month')::date;
 total bigint; fp numeric; fee numeric; extra numeric; future_count int; initial_count int; digest text; s text; future_due date;
begin
 for scenario in 1..4 loop
  -- Full combined total, waived registration/no extra, last month, TEST unchanged receipts.
  m:=case when scenario=4 then 'test' else 'live' end;
  fp:=37.50; fee:=case when scenario=2 then 0 else 30 end; extra:=case when scenario=2 then 0 else 50 end;
  future_count:=case when scenario=3 then 0 else 2 end;
  req:=gen_random_uuid(); membership:=gen_random_uuid();
  insert into academy_memberships values(membership,child,'active',first_due+15,(first_due+make_interval(months=>future_count+1)-interval '1 day')::date,75,'{"name":"QA monthly"}');
  insert into enrollment_requests values(req,'fixture@example.invalid','enrolled','academy',child,jsonb_build_object('payment_choice','monthly_card','accepted',jsonb_build_object('membership_id',membership,'first_total',fp+fee+extra)));
  insert into payments(id,child_id,amount,status,type,ref_id,description,due_date,covered_month,concept_code)
  values(gen_random_uuid(),child,fp,'pending','academy',membership,'Primer mes',first_due+15,to_char(first_due,'YYYY-MM'),'monthly');
  if fee>0 then insert into payments(id,child_id,amount,status,type,ref_id,description,due_date,concept_code) values(gen_random_uuid(),child,fee,'pending','academy',membership,'Matrícula',first_due+15,'registration');end if;
  if extra>0 then insert into payments(id,child_id,amount,status,type,ref_id,description,due_date,concept_code) values(gen_random_uuid(),child,extra,'pending','academy',membership,'Plus anual',first_due+15,'plus');end if;
  insert into payments(id,child_id,amount,status,type,ref_id,description,due_date,covered_month,concept_code)
  select gen_random_uuid(),child,75,'pending','academy',membership,'Mensualidad',(first_due+make_interval(months=>n))::date,to_char(first_due+make_interval(months=>n),'YYYY-MM'),'monthly' from generate_series(1,future_count)n;
  select md5(string_agg(to_jsonb(p)::text,'' order by id)) into digest from payments p;
  begin perform create_enrollment_billing_request(req,owner,guardian,m);raise exception 'Non admin accepted';exception when others then if sqlerrm='Non admin accepted' then raise;end if;end;
  begin perform create_enrollment_billing_request(req,actor,'20000000-0000-0000-0000-000000000002',m);raise exception 'Other email accepted';exception when others then if sqlerrm='Other email accepted' then raise;end if;end;
  perform create_enrollment_billing_request(req,actor,guardian,m);
  perform create_enrollment_billing_request(req,actor,guardian,m);
  initial_count:=1+(fee>0)::int+(extra>0)::int;
  if (select count(*) from billing_request_items where request_id=req and phase='initial')<>initial_count or (select count(*) from billing_request_items where request_id=req and phase='recurring')<>future_count then raise exception 'Incorrect split';end if;
  total:=((fp+fee+extra+future_count*75)*100)::bigint;
  if (select total_cents from billing_requests where id=req)<>total then raise exception 'Wrong total';end if;
  if digest<>(select md5(string_agg(to_jsonb(p)::text,'' order by id)) from payments p) then raise exception 'Creation changed payments';end if;
  a:=reserve_billing_request(req,owner,m,total); s:='cs_'||m||'_fixture'||scenario;
  perform bind_billing_checkout(a.id,s,'https://checkout.stripe.com/fixture');
  begin perform collect_billing_initial(a.id,s,m='live',1);raise exception 'Wrong initial amount accepted';exception when others then if sqlerrm='Wrong initial amount accepted' then raise;end if;end;
  begin perform collect_billing_initial(a.id,'wrong',m='live',((fp+fee+extra)*100)::bigint);raise exception 'Wrong session accepted';exception when others then if sqlerrm='Wrong session accepted' then raise;end if;end;
  begin perform collect_billing_initial(a.id,s,m<>'live',((fp+fee+extra)*100)::bigint);raise exception 'Wrong mode accepted';exception when others then if sqlerrm='Wrong mode accepted' then raise;end if;end;
  perform collect_billing_initial(a.id,s,m='live',((fp+fee+extra)*100)::bigint);
  perform collect_billing_initial(a.id,s,m='live',((fp+fee+extra)*100)::bigint);
  if (select count(*) from billing_request_collections where attempt_id=a.id)<>initial_count then raise exception 'Duplicate collection';end if;
  if m='test' then
   if digest<>(select md5(string_agg(to_jsonb(p)::text,'' order by id)) from payments p) then raise exception 'TEST altered payments';end if;
  else
   if (select count(*) from payments where ref_id=membership and status='paid')<>initial_count then raise exception 'Wrong initial allocation';end if;
   if exists(select 1 from payments p join billing_request_items i on i.payment_id=p.id where i.request_id=req and i.phase='recurring' and p.status<>'pending') then raise exception 'Future charged early';end if;
  end if;
  if future_count=0 then
   if (select state from billing_requests where id=req)<>'completed' then raise exception 'Single payment not closed';end if;
  else
   if (reserve_billing_request(req,owner,m,total)).id<>a.id then raise exception 'Retry opened another attempt';end if;
   update billing_request_attempts set subscription_id='sub_fixture_'||scenario,state='active' where id=a.id;
   for month in 1..future_count loop
    future_due:=(first_due+make_interval(months=>month))::date;
    perform collect_billing_request(a.id,'in_fixture_'||scenario||'_'||month,null,'sub_fixture_'||scenario,m='live',7500,future_due);
    perform collect_billing_request(a.id,'in_fixture_'||scenario||'_'||month,null,'sub_fixture_'||scenario,m='live',7500,future_due);
   end loop;
   if (select count(*) from billing_request_collections where attempt_id=a.id)<>initial_count+future_count then raise exception 'Wrong final collection';end if;
   if (select state from billing_requests where id=req)<>'completed' then raise exception 'Season not completed';end if;
  end if;
 end loop;
 if has_function_privilege('authenticated','public.collect_billing_initial(uuid,text,boolean,bigint)','execute') or has_function_privilege('anon','public.create_enrollment_billing_request(uuid,uuid,uuid,text)','execute') then raise exception 'Unsafe RPC permission';end if;
end $$;
rollback;
\echo PASS combined first payment, waived fees, final month, exact total, ownership, retry, future-only invoices, TEST isolation, RPC privileges. Synthetic fixtures rolled back.
