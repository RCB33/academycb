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
\ir ../supabase/migrations/20261121160648_complete_legacy_academy_request.sql
update membership_plans set enrollment_fee=30;
set local role authenticated;
do $$
declare p public.membership_plans%rowtype; g public.teams%rowtype; sunday public.teams%rowtype;
 r uuid; c uuid; ctx jsonb; payload jsonb; d jsonb; before_count int; before_children int; original_created timestamptz;
begin
 select * into p from membership_plans limit 1;
 select * into g from teams where public_offer->>'kind'='field' and public_offer->>'day'='Martes' limit 1;
 select * into sunday from teams where public_offer->>'kind'='sunday' limit 1;
 insert into enrollment_requests(service,activity_name,child_name,birth_date,guardian_name,email,phone,notes)
  values('academy','Academia anual','Legacy fixture','2011-12-10','Legacy tutor','legacy-completion@example.invalid','600000000','Keep original note') returning id,created_at into r,original_created;
 select count(*) into before_count from payments;select count(*) into before_children from children;
 ctx:=academy_request_completion_context(r);
 payload:=jsonb_build_object('plan',to_jsonb(p),'groups',jsonb_build_array(to_jsonb(g)),'start_date','2026-11-23','payment_choice','cash','quote',jsonb_build_object('plus',50));
 begin perform complete_academy_request(r,jsonb_set(payload,'{plan,price}','1'),true,ctx->>'revision');raise exception 'Forged price accepted';exception when others then if sqlerrm='Forged price accepted' then raise;end if;end;
 begin perform complete_academy_request(r,jsonb_set(payload,'{payment_choice}','"transfer"'),true,ctx->>'revision');raise exception 'Transfer accepted';exception when others then if sqlerrm='Transfer accepted' then raise;end if;end;
 begin perform complete_academy_request(r,jsonb_set(payload,'{start_date}','"2027-06-01"'),true,ctx->>'revision');raise exception 'Outside season accepted';exception when others then if sqlerrm='Outside season accepted' then raise;end if;end;
 update teams set public_offer=jsonb_set(jsonb_set(public_offer,'{birth_from}','2015'),'{birth_to}','2018') where id=g.id;
 select * into g from teams where id=g.id;
 begin perform complete_academy_request(r,jsonb_set(payload,'{groups}',jsonb_build_array(to_jsonb(g))),true,ctx->>'revision');raise exception 'Wrong age accepted';exception when others then if sqlerrm='Wrong age accepted' then raise;end if;end;
 update teams set public_offer=jsonb_set(jsonb_set(public_offer,'{birth_from}','null'),'{birth_to}','null') where id=g.id;
 select * into g from teams where id=g.id;payload:=jsonb_set(payload,'{groups}',jsonb_build_array(to_jsonb(g)));
 perform complete_academy_request(r,payload,true,ctx->>'revision');
 select academy_details into d from enrollment_requests where id=r;
 if d->'quote'->>'percent'<>'25' or (d->'quote'->>'first_total')::numeric<>p.price/4+80 then raise exception 'Wrong quote/Plus';end if;
 if not exists(select 1 from enrollment_requests where id=r and status='new' and created_at=original_created and notes='Keep original note' and email='legacy-completion@example.invalid') then raise exception 'Original request changed';end if;
 if (select count(*) from payments)<>before_count or (select count(*) from children)<>before_children or exists(select 1 from guardians where email='legacy-completion@example.invalid') then raise exception 'Draft created operational records';end if;
 begin perform complete_academy_request(r,payload,true,ctx->>'revision');raise exception 'Stale save accepted';exception when others then if sqlerrm='Stale save accepted' then raise;end if;end;
 -- The same pending draft remains editable, including payment and fee choice.
 ctx:=academy_request_completion_context(r);
 payload:=jsonb_set(jsonb_set(payload,'{start_date}','"2026-12-01"'),'{payment_choice}','"monthly_card"');
 perform complete_academy_request(r,payload,false,ctx->>'revision');
 ctx:=academy_request_review_context(r);
 if (ctx->'request'->'academy_details'->'quote'->>'first_total')::numeric<>p.price+50 or ctx->'request'->'academy_details'->'admin_completion'->>'charge_enrollment'<>'false' then raise exception 'Fee choice lost';end if;
 c:=accept_reviewed_academy_request(r,'2026-12-01',false,ctx->>'revision');
 if (select count(*) from payments where child_id=c)<>7 or exists(select 1 from payments where child_id=c and concept_code='registration') then raise exception 'Acceptance wrong receipts';end if;
 begin perform academy_request_completion_context(r);raise exception 'Accepted request editable';exception when others then if sqlerrm='Accepted request editable' then raise;end if;end;
 -- Two-session plans must include the Sunday group, and original family
 -- selections can never be overwritten by this legacy completion workflow.
 update membership_plans set sessions_per_week=2 where id=p.id;select * into p from membership_plans where id=p.id;
 insert into enrollment_requests(service,activity_name,child_name,birth_date,guardian_name,email,phone) values('academy','Academia anual','Two sessions','2011-12-10','Tutor','two-completion@example.invalid','600000000') returning id into r;
 ctx:=academy_request_completion_context(r);payload:=jsonb_set(payload,'{plan}',to_jsonb(p));
 begin perform complete_academy_request(r,payload,false,ctx->>'revision');raise exception 'Missing Sunday accepted';exception when others then if sqlerrm='Missing Sunday accepted' then raise;end if;end;
 payload:=jsonb_set(payload,'{groups}',jsonb_build_array(to_jsonb(g),to_jsonb(sunday)));
 perform complete_academy_request(r,payload,false,ctx->>'revision');
 update enrollment_requests set academy_details=academy_details-'admin_completion' where id=r;
 begin perform academy_request_completion_context(r);raise exception 'Family plan editable';exception when others then if sqlerrm='Family plan editable' then raise;end if;end;
 raise notice 'PASS: preserved legacy identity/notes/date; draft has no receipts or family creation; plan/age/schedule/fee/Plus/payment validation; editable draft; stale and closed guards; normal reviewed acceptance';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$begin
 begin perform academy_request_completion_context(gen_random_uuid());raise exception 'Nonadmin read';exception when others then if sqlerrm='Nonadmin read' then raise;end if;end;
 begin perform complete_academy_request(gen_random_uuid(),'{}',false,'x');raise exception 'Nonadmin write';exception when others then if sqlerrm='Nonadmin write' then raise;end if;end;
 if has_function_privilege('anon','public.complete_academy_request(uuid,jsonb,boolean,text)','execute') then raise exception 'Anon can complete';end if;
end $$;
reset role;
rollback;
