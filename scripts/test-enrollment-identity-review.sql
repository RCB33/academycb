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
alter table enrollment_requests add column notes text, add column created_at timestamptz default now();
\ir ../supabase/migrations/20261121154134_academy_request_review.sql
alter table enrollment_requests add column activity_id uuid;
create table campus_enrollments(id uuid primary key default gen_random_uuid(),campus_id uuid,child_id uuid,status text,emergency_contact text,emergency_phone text,notes text,unique(campus_id,child_id));
create table campus_request_links(request_id uuid primary key,enrollment_id uuid,accepted_by uuid);
grant all on campus_enrollments,campus_request_links to authenticated;
\ir ../supabase/migrations/20261121160625_enrollment_identity_reuse.sql
-- Run the actual approval function, receipt generator and quote protections.
set local role authenticated;
do $$
declare day int; pct int; fee_on boolean; r uuid; c uuid; p uuid; g public.teams%rowtype;
 snapshot jsonb; ctx jsonb; d jsonb; old_digest text; saved_count int; v_start date;
begin
 select id into p from membership_plans limit 1;
 select * into g from teams where public_offer->>'day'='Martes' and public_offer->>'kind'='field' limit 1;
 snapshot:=jsonb_build_object('plan',jsonb_build_object('id',p,'name','Review fixture','price',75,'enrollment_fee',30,'season_start','2026-09-15','season_end','2027-05-31'),
  'groups',jsonb_build_array(to_jsonb(g)),'start_date','2026-11-22','payment_choice','monthly_card','quote',jsonb_build_object('percent',50,'first_month',37.5,'enrollment_fee',30,'plus',50,'first_total',117.5));
 foreach day in array array[1,7,8,15,16,22,23,30] loop
  foreach fee_on in array array[false,true] loop
   v_start:=make_date(2027,4,day); pct:=case when day<=7 then 100 when day<=15 then 75 when day<=22 then 50 else 25 end;
   insert into enrollment_requests(service,child_name,birth_date,guardian_name,email,phone,academy_details)
    values('academy','Fixture '||day||fee_on,'2016-01-01','Fixture parent '||day||fee_on,'review-'||day||fee_on||'@example.invalid','600000000',snapshot) returning id into r;
   ctx:=academy_request_review_context(r);
   c:=accept_reviewed_academy_request(r,v_start,fee_on,ctx->>'revision');
   select academy_details into d from enrollment_requests where id=r;
   if (d->'quote'->>'percent')::int<>pct or (d->'accepted'->>'enrollment_fee')::numeric<>(case when fee_on then 30 else 0 end) then raise exception 'Wrong reviewed fee/percent';end if;
   if (d->'accepted'->>'first_total')::numeric<>round(75*pct/100.0,2)+50+(case when fee_on then 30 else 0 end) then raise exception 'Wrong first total';end if;
   if d->'quote'->'remaining'<>jsonb_build_array(jsonb_build_object('month','2027-05','amount',75,'due_date','2027-05-01')) then raise exception 'Wrong remaining months';end if;
   if d->'admin_review'->>'original_start_date'<>'2026-11-22' or d->'admin_review'->'original_quote' is distinct from snapshot->'quote' then raise exception 'Lost original conditions';end if;
   if not exists(select 1 from academy_memberships where child_id=c and start_date=v_start and monthly_price=75 and plan_snapshot->'offering'->'quote'=d->'quote') then raise exception 'Membership differs from email quote';end if;
   if (select count(*) from payments where child_id=c)<>3+fee_on::int then raise exception 'Incorrect receipts';end if;
   if exists(select 1 from payments where child_id=c and (covered_month<'2027-04' or status<>'pending' or method is not null)) then raise exception 'Incorrect start or marked as paid';end if;
   begin perform accept_reviewed_academy_request(r,v_start,false,ctx->>'revision');raise exception 'Repeat accepted';exception when others then if sqlerrm='Repeat accepted' then raise;end if;end;
  end loop;
 end loop;
 -- Start moves from November 22 to December 1. No November receipt, no double December.
 snapshot:=jsonb_set(snapshot,'{quote,plus}','0');
 insert into enrollment_requests(service,child_name,birth_date,guardian_name,email,phone,academy_details)
  values('academy','Move month','2016-01-01','Move parent','move@example.invalid','600000000',snapshot) returning id into r;
 ctx:=academy_request_review_context(r);
 begin perform accept_reviewed_academy_request(r,'2027-06-01',false,ctx->>'revision');raise exception 'Outside season accepted';exception when others then if sqlerrm='Outside season accepted' then raise;end if;end;
 begin perform accept_reviewed_academy_request(r,'2026-12-01',null,ctx->>'revision');raise exception 'Missing checkbox accepted';exception when others then if sqlerrm='Missing checkbox accepted' then raise;end if;end;
 update enrollment_requests set notes='Changed while reviewing' where id=r;
 begin perform accept_reviewed_academy_request(r,'2026-12-01',false,ctx->>'revision');raise exception 'Stale review accepted';exception when others then if sqlerrm='Stale review accepted' then raise;end if;end;
 ctx:=academy_request_review_context(r);
 c:=accept_reviewed_academy_request(r,'2026-12-01',false,ctx->>'revision');
 if (select count(*) from payments where child_id=c)<>6 or (select sum(amount) from payments where child_id=c)<>450 then raise exception 'Moved month total wrong';end if;
 if (select count(*) from payments where child_id=c and covered_month='2026-12' and amount=75)<>1 then raise exception 'December charged twice';end if;
 if not exists(select 1 from enrollment_requests where id=r and academy_details->'quote'->>'percent'='100') then raise exception 'Moved month percentage wrong';end if;
 -- A previously known player: no matrícula, no duplicate ficha, immutable existing receipts.
 update academy_memberships set status='ended',end_date='2026-10-31' where child_id=c;
 update payments set status='cancelled' where child_id=c;
 insert into payments(type,child_id,amount,status,concept_code,due_date) values('academy',c,50,'paid','plus','2026-10-01');
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into old_digest from payments x;
 snapshot:=jsonb_set(snapshot,'{quote,plus}','50');
 insert into enrollment_requests(service,child_name,birth_date,guardian_name,email,phone,academy_details)
  values('academy','Move month','2016-01-01','Move parent','move@example.invalid','600000000',snapshot) returning id into r;
 ctx:=academy_request_review_context(r);
 if not (ctx->>'fee_exempt')::boolean or not (ctx->>'plus_recorded')::boolean or (ctx->>'child_id')::uuid<>c then raise exception 'Existing player not recognised';end if;
 begin perform accept_reviewed_academy_request(r,'2027-05-23',true,ctx->>'revision');raise exception 'Duplicate matrícula accepted';exception when others then if sqlerrm='Duplicate matrícula accepted' then raise;end if;end;
 if accept_reviewed_academy_request(r,'2027-05-23',false,ctx->>'revision')<>c then raise exception 'Duplicate player created';end if;
 select academy_details into d from enrollment_requests where id=r;
 if d->'quote'->'remaining'<>'[]'::jsonb or (d->'accepted'->>'first_total')::numeric<>18.75 then raise exception 'Last month/automatic exemptions wrong';end if;
 if old_digest is distinct from (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from payments x where ref_id is distinct from (d->'accepted'->>'membership_id')::uuid) then raise exception 'Existing receipts changed';end if;
 -- Failed downstream approval must roll back the edited snapshot, receipts and new tutor.
 insert into enrollment_requests(service,child_name,birth_date,guardian_name,email,phone,academy_details)
  values('academy','Blocked group','2016-01-01','Blocked parent','blocked@example.invalid','600000000',snapshot) returning id into r;
 ctx:=academy_request_review_context(r);select count(*) into saved_count from payments;
 update teams set status='inactive' where id=g.id;
 begin perform accept_reviewed_academy_request(r,'2026-12-01',false,ctx->>'revision');raise exception 'Unavailable group accepted';exception when others then if sqlerrm='Unavailable group accepted' then raise;end if;end;
 if (select academy_details from enrollment_requests where id=r) is distinct from snapshot or (select count(*) from payments)<>saved_count or exists(select 1 from guardians where email='blocked@example.invalid') then raise exception 'Acceptance not atomic';end if;
 raise notice 'PASS: 16 proration/fee combinations, moved month, no duplicate first month, last month, history exemptions, exact snapshots, stale review, rejected repeat, atomic rollback, old payments unchanged';
end $$;
-- Identity cases: legacy acceptance, aliases in typography, ambiguity, archived fichas and a final link guard.
do $$
declare g uuid;c uuid;r uuid;r2 uuid;camp uuid;e uuid;before_count int;ctx jsonb;
begin
 insert into guardians(full_name,email,phone) values('Álex Tutor','identity@example.invalid','600 123 456') returning id into g;
 insert into children(full_name,birth_date,birth_year) values('José  Jugador','2015-02-03',2015) returning id into c;
 insert into child_guardians values(c,g,'Tutor',true);
 insert into enrollment_requests(service,child_name,birth_date,guardian_name,email,phone)
 values('academy',' jose jugador ','2015-02-03','Alex   Tutor','IDENTITY@example.invalid','+34 600123456') returning id into r;
 select count(*) into before_count from children;
 ctx:=enrollment_identity_context(r);
 if ctx->>'match'<>'existing_player' or (ctx->>'child_id')::uuid<>c then raise exception 'Normalized identity not reused';end if;
 if convert_enrollment_request(r)<>c or convert_enrollment_request(r)<>c or (select count(*) from children)<>before_count then raise exception 'Legacy retry duplicated player';end if;
 if not exists(select 1 from enrollment_requests where id=r and accepted_child_id=c) then raise exception 'Acceptance link not recorded';end if;
 insert into enrollment_requests(service,child_name,birth_date,guardian_name,email,phone)
 values('academy','JOSE JUGADOR','2015-02-04','Alex Tutor','identity@example.invalid','600123456') returning id into r2;
 begin perform convert_enrollment_request(r2);raise exception 'Different birthday accepted';exception when others then if sqlerrm='Different birthday accepted' then raise;end if;end;
 update enrollment_requests set birth_date='2015-02-03',phone='600999999' where id=r2;
 begin perform convert_enrollment_request(r2);raise exception 'Different tutor phone accepted';exception when others then if sqlerrm='Different tutor phone accepted' then raise;end if;end;
 update enrollment_requests set phone='600123456' where id=r2;
 update children set archived_at=now() where id=c;
 begin perform convert_enrollment_request(r2);raise exception 'Archived child duplicated';exception when others then if sqlerrm='Archived child duplicated' then raise;end if;end;
 update children set archived_at=null,birth_date=null where id=c;
 begin perform convert_enrollment_request(r2);raise exception 'Unknown birthday duplicated';exception when others then if sqlerrm='Unknown birthday duplicated' then raise;end if;end;
 update children set birth_date='2015-02-03' where id=c;
 update enrollment_requests set email='changed@example.invalid' where id=r2;
 begin perform convert_enrollment_request(r2);raise exception 'Changed email duplicated tutor';exception when others then if sqlerrm='Changed email duplicated tutor' then raise;end if;end;
 update enrollment_requests set guardian_name='Other tutor',phone='600999999' where id=r2;
 begin perform convert_enrollment_request(r2);raise exception 'Cross-family identical child attached';exception when others then if sqlerrm='Cross-family identical child attached' then raise;end if;end;
 -- All-or-nothing direct creation path: the family link rejects the second child.
 begin
  insert into children(full_name,birth_date,birth_year) values('Jose jugador','2015-02-03',2015) returning id into e;
  insert into child_guardians values(e,g,'Tutor',true);
  raise exception 'Duplicate family link accepted';
 exception when others then if sqlerrm='Duplicate family link accepted' then raise;end if;end;
 if (select count(*) from children)<>before_count then raise exception 'Orphan child survived rejected duplicate';end if;
 -- Campus retries and a second request reuse both the player and enrollment.
 insert into campuses(name,status) values('Identity campus','published') returning id into camp;
 update enrollment_requests set service='campus',activity_id=camp,guardian_name='Alex Tutor',phone='600123456',email='identity@example.invalid' where id=r2;
 e:=accept_campus_request(r2);
 if accept_campus_request(r2)<>e or not exists(select 1 from campus_enrollments where id=e and child_id=c) then raise exception 'Campus retry duplicated';end if;
 insert into enrollment_requests(service,activity_id,child_name,birth_date,guardian_name,email,phone)
 values('campus',camp,'Jose Jugador','2015-02-03','Alex Tutor','identity@example.invalid','600123456') returning id into r2;
 if accept_campus_request(r2)<>e or (select count(*) from campus_enrollments where campus_id=camp and child_id=c)<>1 then raise exception 'Repeated Campus request duplicated';end if;
 insert into enrollment_requests(service,child_name,birth_date,guardian_name,email,phone)
 values('academy','New sibling','2018-03-04','Alex Tutor','identity@example.invalid','600123456') returning id into r2;
 -- A new sibling is allowed and reuses the existing tutor.
 update enrollment_requests set child_name='New sibling',birth_date='2018-03-04',guardian_name='Alex Tutor',phone='600123456',email='identity@example.invalid' where id=r2;
 e:=convert_enrollment_request(r2);
 if e=c or not exists(select 1 from child_guardians where guardian_id=g and child_id=e) then raise exception 'Sibling not linked to existing tutor';end if;
 -- Existing parent may deliberately be linked to another child from the admin UI.
 insert into children(full_name,birth_date,birth_year) values('Unlinked player','2016-09-08',2016) returning id into e;
 insert into child_guardians values(e,g,'Tutor',false);
 if not exists(select 1 from child_guardians where child_id=e and guardian_id=g) then raise exception 'Manual existing-parent link failed';end if;
 raise notice 'PASS: Campus retries/repeated requests, normalized reuse, legacy retry, DOB/phone conflicts, archived/missing DOB, cross-family guard, atomic link protection, sibling and deliberate existing-tutor linking';
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$begin
 begin perform academy_request_review_context(gen_random_uuid());raise exception 'Nonadmin review allowed';exception when others then if sqlerrm='Nonadmin review allowed' then raise;end if;end;
 begin perform accept_reviewed_academy_request(gen_random_uuid(),current_date,false,'x');raise exception 'Nonadmin acceptance allowed';exception when others then if sqlerrm='Nonadmin acceptance allowed' then raise;end if;end;
 if has_function_privilege('anon','public.academy_request_review_context(uuid)','execute') or has_function_privilege('anon','public.accept_reviewed_academy_request(uuid,date,boolean,text)','execute') then raise exception 'Public review allowed';end if;
end $$;
reset role;
rollback;
