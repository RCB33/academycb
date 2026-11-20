\set ON_ERROR_STOP on
-- Disposable local PostgreSQL only. No network, Auth API, Stripe or mail.
begin;
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema private;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function public.is_admin() returns boolean language sql as $$ select auth.uid()='00000000-0000-4000-8000-000000000001'::uuid $$;
create table public.categories(id uuid primary key default gen_random_uuid(),name text);
create table public.teams(id uuid primary key default gen_random_uuid(),name text,schedule text,category_id uuid,max_players integer default 16,status text default 'active');
create table public.membership_plans(id uuid primary key default gen_random_uuid(),name text,price numeric,season_start date,season_end date,is_active boolean default true,updated_at timestamptz default now());
create table public.campuses(id uuid primary key default gen_random_uuid(),name text,start_date date,public_test text,status text,location text);
create table public.event_campaign_settings(id text primary key);
create table public.children(id uuid primary key default gen_random_uuid(),full_name text,birth_date date,birth_year integer,archived_at timestamptz,team_id uuid,category_id uuid);
create table public.guardians(id uuid primary key default gen_random_uuid(),user_id uuid,full_name text,email text,phone text);
create table public.child_guardians(child_id uuid,guardian_id uuid,relationship text,is_primary boolean,primary key(child_id,guardian_id));
create table public.enrollment_requests(id uuid primary key default gen_random_uuid(),service text,activity_name text,child_name text,birth_date date,guardian_name text,email text,phone text,linked_child_id uuid,status text default 'new',last_contact_at timestamptz);
create table public.academy_memberships(id uuid primary key default gen_random_uuid(),child_id uuid,plan_id uuid,start_date date,end_date date,status text,payment_status text,payment_method text,monthly_price numeric,assignment_request_id uuid unique,plan_snapshot jsonb);
create table public.payments(id uuid primary key default gen_random_uuid(),type text,ref_id uuid,child_id uuid,amount numeric,gross_amount numeric,discount_amount numeric,promotion_label text,status text,method text,due_date date,concept_code text,covered_month text,description text);
insert into event_campaign_settings values('christmas-2026');
insert into campuses(name,start_date,status) values('Campus Navidad 2026–2027','2026-12-22','draft');
insert into membership_plans(name,price,season_start,season_end) values('Tecnificación · 1 sesión semanal · 2026/2027',75,'2026-09-15','2027-05-31');
\ir ../supabase/migrations/20261119165354_connected_business_offering.sql
alter table public.enrollment_requests add column campus_details jsonb;
\ir ../supabase/migrations/20261119170735_protect_campus_quote_and_status_updates.sql
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000001','admin@example.invalid',now());
grant usage on schema public,auth,private to authenticated,anon,service_role;
grant all on all tables in schema public to authenticated,service_role;
grant insert on public.enrollment_requests to anon;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);

alter table membership_plans add column description text, add column enrollment_fee numeric default 0, add column duration_months int default 9, add column frequency text default 'mensual';
alter table teams add column coach_id uuid, add column color text;
create function public.has_role(text[]) returns boolean language sql as $$select public.is_admin()$$;
create table public.academy_checkout_contracts(id uuid default gen_random_uuid(),membership_id uuid,mode text,state text);
create table public.billing_requests(id uuid default gen_random_uuid(),mode text,state text);
create table public.billing_request_items(request_id uuid,payment_id uuid);
\ir ../supabase/migrations/20261120090827_academy_payment_preferences.sql
do $$
declare day int; pct int; r uuid; c uuid; p uuid; g public.teams%rowtype; snapshot jsonb; n int; total numeric;
begin
 if (select count(*) from teams)<>12 then raise exception 'Missing seeded groups';end if;
 if (select count(*) from teams where max_players is null)<>12 then raise exception 'Invented capacities';end if;
 if (select public_program->>'pack_price' from campuses limit 1)<>'197' then raise exception 'Missing campus pack';end if;
 select id into p from membership_plans limit 1;
 select * into g from teams where public_offer->>'day'='Martes' and public_offer->>'kind'='field' limit 1;
 foreach day in array array[1,7,8,15,16,22,23,30] loop
  pct:=case when day<=7 then 100 when day<=15 then 75 when day<=22 then 50 else 25 end;
  snapshot:=jsonb_build_object('plan',jsonb_build_object('id',p,'name','Plan fixture','price',75,'season_start','2026-09-15','season_end','2027-05-31'),'groups',jsonb_build_array(to_jsonb(g)),'start_date',make_date(2027,4,day),'payment_choice','monthly_card','quote',jsonb_build_object('percent',pct,'first_month',round(75*pct/100.0,2),'enrollment_fee',30,'plus',50));
  insert into enrollment_requests(service,child_name,birth_date,guardian_name,email,phone,academy_details) values('academy','Fixture '||day,'2016-01-01','Fixture parent','parent-'||day||'@example.invalid','600000000',snapshot) returning id into r;
  c:=accept_academy_request(r);
  if accept_academy_request(r)<>c then raise exception 'Acceptance not idempotent';end if;
  if (select count(*) from payments where child_id=c)<>4 then raise exception 'Wrong receipt count';end if;
  select sum(amount) into total from payments where child_id=c;
  if total<>round(75*pct/100.0,2)+75+80 then raise exception 'Wrong total %',total;end if;
  if not exists(select 1 from payments where child_id=c and covered_month='2027-05' and due_date='2027-05-01' and amount=75 and status='pending') then raise exception 'Last monthly date/amount wrong';end if;
  if exists(select 1 from payments where child_id=c and covered_month>'2027-05') then raise exception 'Charge after season';end if;
  if not exists(select 1 from children where id=c and team_id=g.id) then raise exception 'Missing team';end if;
 end loop;
 -- Historical/overlap guard must roll back the whole acceptance, including status.
 insert into enrollment_requests(service,child_name,birth_date,guardian_name,email,phone,academy_details) values('academy','Fixture 1','2016-01-01','Fixture parent','parent-1@example.invalid','600000000',snapshot) returning id into r;
 select count(*) into n from children;
 begin perform accept_academy_request(r);raise exception 'Duplicate accepted';exception when others then if sqlerrm='Duplicate accepted' then raise;end if;end;
 if (select count(*) from children)<>n or (select status from enrollment_requests where id=r)<>'new' then raise exception 'Non-atomic failure';end if;
 raise notice 'PASS: catalogue seeds, 8 proration boundaries, full May quota, no June, membership/team linkage, duplicate/overlap rejection, atomic rollback, idempotent acceptance';
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin
 begin insert into public.enrollment_requests(service,academy_details) values('academy','{}');raise exception 'Forged quote accepted';exception when others then if sqlerrm='Forged quote accepted' then raise;end if;end;
 begin insert into public.enrollment_requests(service,campus_details) values('campus','{"quoted_amount":1}');raise exception 'Forged campus price accepted';exception when others then if sqlerrm='Forged campus price accepted' then raise;end if;end;
 if has_function_privilege('anon','public.accept_academy_request(uuid)','execute') then raise exception 'Anon may approve';end if;
end $$;
reset role;
-- The fixture grants UPDATE; production RLS separately limits who may update.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin
 update public.enrollment_requests set status='contacted' where child_name='Fixture 1';
 if not found then raise exception 'Unchanged snapshot blocked status update'; end if;
 begin update public.enrollment_requests set academy_details='{}' where child_name='Fixture 1';raise exception 'Forged update accepted';exception when others then if sqlerrm='Forged update accepted' then raise;end if;end;
end $$;
reset role;

do $$
declare m uuid;p uuid;c uuid;r uuid;g uuid;v timestamptz;before_digest text;failed boolean:=false;
begin
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select id into m from academy_memberships limit 1;
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into before_digest from payments x;
 perform set_academy_payment_method(m,'cash');
 if (select agreed_payment_method from academy_memberships where id=m)<>'cash' then raise exception 'Cash not saved';end if;
 perform set_academy_payment_method(m,'stripe');
 begin perform set_academy_payment_method(m,'transfer');exception when others then failed:=true;end;
 if not failed then raise exception 'Academy accepted bank transfer';end if;
 insert into academy_checkout_contracts(membership_id,mode,state) values(m,'live','active');
 failed:=false;begin perform set_academy_payment_method(m,'cash');exception when others then failed:=true;end;
 if not failed then raise exception 'Active subscription switched to cash';end if;
 if before_digest<>(select md5(string_agg(to_jsonb(x)::text,'' order by id)) from payments x) then raise exception 'Receipts altered by preferences';end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
 failed:=false;begin perform set_academy_payment_method(m,'cash');exception when others then failed:=true;end;
 if not failed then raise exception 'Unauthorized preference change';end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select id,updated_at into p,v from membership_plans limit 1;
 select id into g from teams where public_offer->>'kind'='field' limit 1;
 insert into children(full_name,birth_date) values('Manual method fixture','2016-01-01') returning id into c;
 r:=gen_random_uuid();m:=assign_family_plan_v3(r,c,p,v,'2027-04-23',1,0,'',false,0,g,null,'cash');
 if (select agreed_payment_method from academy_memberships where id=m)<>'cash' then raise exception 'Manual choice missing';end if;
 if (select amount from payments where ref_id=m and covered_month='2027-04')<>18.75 then raise exception 'Manual proration changed';end if;
 perform set_academy_payment_method(m,'stripe');
 if assign_family_plan_v3(r,c,p,v,'2027-04-23',1,0,'',false,0,g,null,'cash')<>m or (select agreed_payment_method from academy_memberships where id=m)<>'stripe' then raise exception 'Retry overwrote agreement';end if;
end $$;

rollback;
