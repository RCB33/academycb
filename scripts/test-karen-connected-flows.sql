\set ON_ERROR_STOP on
-- Disposable local PostgreSQL only. All fixtures roll back; no Auth/email/Stripe network.
begin;
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema private;
create table public.profiles(id uuid primary key,role text);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.has_role(text[]) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and role=any($1))$$;
create function public.is_admin() returns boolean language sql stable as $$select public.has_role(array['admin'])$$;
create table public.workers(id uuid primary key default gen_random_uuid(),user_id uuid,access_enabled boolean default true);
create function public.current_worker_id() returns uuid language sql stable security definer set search_path='' as $$select id from public.workers where user_id=auth.uid() and access_enabled limit 1$$;
create table public.teams(id uuid primary key default gen_random_uuid(),name text,schedule text,category_id uuid,coach_id uuid,color text,max_players int,status text default 'active',public_offer jsonb);
create table public.children(id uuid primary key default gen_random_uuid(),full_name text,birth_date date,birth_year int,archived_at timestamptz,team_id uuid,category_id uuid);
create table public.guardians(id uuid primary key default gen_random_uuid(),user_id uuid,email text,full_name text);
create table public.child_guardians(child_id uuid,guardian_id uuid,is_primary boolean,primary key(child_id,guardian_id));
create function public.is_guardian_of(uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.child_guardians cg join public.guardians g on g.id=cg.guardian_id where cg.child_id=$1 and g.user_id=auth.uid())$$;
create table public.membership_plans(id uuid primary key default gen_random_uuid(),name text,description text,price numeric,enrollment_fee numeric,duration_months int,frequency text,season_start date,season_end date,sessions_per_week int,is_active boolean default true,updated_at timestamptz default now());
create table public.academy_memberships(id uuid primary key default gen_random_uuid(),child_id uuid,plan_id uuid,start_date date,end_date date,status text,payment_status text,payment_method text,monthly_price numeric,assignment_request_id uuid unique,plan_snapshot jsonb);
create table public.academy_group_assignments(membership_id uuid,team_id uuid,child_id uuid,primary key(membership_id,team_id));
create table public.payments(id uuid primary key default gen_random_uuid(),type text,ref_id uuid,child_id uuid,amount numeric,gross_amount numeric,discount_amount numeric,promotion_label text,status text,method text,due_date date,concept_code text,covered_month text,description text);
create table public.calendar_events(id uuid primary key default gen_random_uuid(),title text,description text,start_date timestamptz,end_date timestamptz,color text,is_all_day boolean,worker_id uuid,category_id uuid,team_id uuid,event_type text,status text,visibility text,source_type text,source_id uuid,location text);
create unique index calendar_source_unique on public.calendar_events(source_type,source_id,start_date) where source_type<>'manual' and source_id is not null;
create table public.calendar_event_workers(event_id uuid,worker_id uuid,primary key(event_id,worker_id));
create function public.can_manage_calendar_event(uuid) returns boolean language sql stable security definer set search_path='' as $$select public.has_role(array['admin','staff']) or (public.has_role(array['coach']) and exists(select 1 from public.calendar_events e where e.id=$1 and (e.worker_id=public.current_worker_id() or exists(select 1 from public.calendar_event_workers w where w.event_id=e.id and w.worker_id=public.current_worker_id()))))$$;
create table public.training_sessions(id uuid primary key default gen_random_uuid(),event_id uuid,child_id uuid,session_date date,attendance text,created_by uuid,visible_to_guardian boolean default true,unique(event_id,child_id));
create table public.campus_enrollments(campus_id uuid,child_id uuid,status text);
create table public.tournament_players(tournament_id uuid,child_id uuid,status text);
create table public.tournament_teams(tournament_id uuid,team_id uuid,status text);
create table public.registration_email_outbox(id uuid primary key default gen_random_uuid(),source_type text constraint registration_email_outbox_source_type_check check(source_type in ('enrollment','event')),source_id uuid,event_kind text,recipient text,status text default 'pending',unique(source_type,source_id,event_kind));
alter table teams enable row level security;
alter table children enable row level security;
alter table academy_memberships enable row level security;
alter table academy_group_assignments enable row level security;
alter table calendar_events enable row level security;
alter table training_sessions enable row level security;
alter table payments enable row level security;
create policy teams_admin on teams for all using(public.is_admin());
create policy teams_coach on teams for select using(coach_id=public.current_worker_id());
create policy memberships_admin on academy_memberships for all using(public.is_admin());
create policy memberships_family on academy_memberships for select using(public.is_guardian_of(child_id));
create policy groups_admin on academy_group_assignments for all using(public.is_admin());
create policy calendar_admin on calendar_events for all using(public.is_admin());
create policy calendar_coach on calendar_events for select using(worker_id=public.current_worker_id());
create policy calendar_guardian_visible_read on calendar_events for select using(false);
create policy payments_admin on payments for all using(public.is_admin());
\ir ../supabase/migrations/20261119193027_manual_academy_proration.sql
\ir ../supabase/migrations/20261119193029_academy_secondary_group_operations.sql
\ir ../supabase/migrations/20261119193030_manual_assignment_notifications.sql
create policy children_admin on children for all using(public.is_admin());
create policy children_coach on children for select using(public.is_coach_of(id));
create policy children_family on children for select using(public.is_guardian_of(id));
create policy sessions_coach on training_sessions for all using(public.is_admin() or public.is_coach_of(child_id) or public.can_manage_calendar_event(event_id));
create trigger consistency before insert or update on training_sessions for each row execute function private.guard_coach_attendance();
grant usage on schema public,private,auth to authenticated;
grant all on all tables in schema public to authenticated;
insert into profiles values('00000000-0000-4000-8000-000000000001','admin'),('00000000-0000-4000-8000-000000000002','coach'),('00000000-0000-4000-8000-000000000003','coach'),('00000000-0000-4000-8000-000000000004','guardian'),('00000000-0000-4000-8000-000000000005','guardian');
insert into workers(id,user_id) values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
create temp table fixture_ids(child uuid,membership uuid,sunday uuid,event uuid,outsider uuid);
do $$
declare p uuid; v timestamptz; g uuid; sunday uuid; c uuid; m uuid; req uuid; d int; pct int; guardian uuid; event uuid; outsider uuid; denied boolean;
begin
 insert into teams(name,schedule,public_offer) values('Entre semana','17:30 – 19:00','{"day":"Martes","kind":"field","published":true,"location":"Prueba"}') returning id into g;
 insert into teams(name,schedule,coach_id,public_offer) values('Domingo','15:00 – 16:30','00000000-0000-4000-8000-000000000002','{"day":"Domingo","kind":"sunday","published":true}') returning id into sunday;
 insert into membership_plans(name,price,enrollment_fee,duration_months,frequency,season_start,season_end,sessions_per_week) values('Dos sesiones',140,30,9,'mensual','2026-09-15','2027-05-31',2) returning id,updated_at into p,v;
 insert into guardians(email,user_id) values('qa@example.invalid','00000000-0000-4000-8000-000000000004') returning id into guardian;
 foreach d in array array[1,7,8,15,16,22,23,30] loop
  insert into children(full_name,birth_date) values('QA '||d,'2016-01-01') returning id into c;
  insert into child_guardians values(c,guardian,true);
  req:=gen_random_uuid();
  m:=public.assign_family_plan_v2(req,c,p,v,make_date(2027,4,d),1,0,'',true,50,g,sunday);
  pct:=case when d<=7 then 100 when d<=15 then 75 when d<=22 then 50 else 25 end;
  if (select amount from payments where ref_id=m and covered_month='2027-04')<>round(140*pct/100.0,2) then raise exception 'Wrong proration %',d; end if;
  if (select sum(amount) from payments where ref_id=m)<>round(140*pct/100.0,2)+140+80 then raise exception 'Wrong total'; end if;
  if (select count(*) from academy_group_assignments where membership_id=m)<>2 then raise exception 'Missing groups'; end if;
  if not exists(select 1 from payments where ref_id=m and covered_month='2027-05' and due_date='2027-05-01') then raise exception 'Wrong May date'; end if;
  if public.assign_family_plan_v2(req,c,p,v,make_date(2027,4,d),1,0,'',true,50,g,sunday)<>m then raise exception 'Idempotency'; end if;
  if (select count(*) from registration_email_outbox where source_id=m)<>1 then raise exception 'Missing/duplicate manual email'; end if;
 end loop;
 if not exists(select 1 from calendar_events where team_id=sunday) then raise exception 'Sunday calendar empty'; end if;
 if exists(select 1 from calendar_events where start_date>'2027-06-01') then raise exception 'Sessions after season'; end if;
 insert into children(full_name) values('Other player') returning id into outsider;
 denied:=false;begin perform public.assign_family_plan_v2(gen_random_uuid(),outsider,p,v,'2027-04-16',1,0,'',false,0,g,null);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Missing Sunday accepted';end if;
 denied:=false;begin perform public.assign_family_plan_v2(gen_random_uuid(),outsider,p,v,'2027-04-16',1,0,'',false,0,sunday,g);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Reversed groups accepted';end if;
 denied:=false;begin perform public.assign_family_plan_v2(gen_random_uuid(),outsider,p,v-interval '1 second','2027-04-16',1,0,'',false,0,g,sunday);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Stale plan accepted';end if;
 update teams set max_players=1 where id=sunday;
 denied:=false;begin perform public.assign_family_plan_v2(gen_random_uuid(),outsider,p,v,'2027-04-16',1,0,'',false,0,g,sunday);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Full Sunday accepted';end if;
 update teams set max_players=null where id=sunday;
 insert into payments(child_id,type,amount,status) values(outsider,'academy',75,'paid');
 denied:=false;begin perform public.assign_family_plan_v2(gen_random_uuid(),outsider,p,v,'2027-04-16',1,0,'',false,0,g,sunday);exception when raise_exception then denied:=true;end;
 if not denied or exists(select 1 from academy_memberships where child_id=outsider) then raise exception 'Historical guard failed'; end if;
 select id into event from calendar_events where team_id=sunday and (start_date at time zone 'Europe/Madrid')::date>='2027-04-30' order by start_date limit 1;
 insert into fixture_ids values(c,m,sunday,event,outsider);
 -- Make membership current for coach profile visibility; no finance update.
 update academy_memberships set start_date=current_date where id=m;
end $$;
grant select on fixture_ids to authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$declare e uuid;c uuid;d date;denied boolean;begin
 select event,child into e,c from fixture_ids;
 if not exists(select 1 from children where id=c) then raise exception 'Sunday coach cannot see assigned child'; end if;
 if exists(select 1 from payments) or exists(select 1 from academy_memberships) then raise exception 'Coach finance leak'; end if;
 if not exists(select 1 from get_session_players(e) where id=c) then raise exception 'Missing Sunday roster'; end if;
 select (start_date at time zone 'Europe/Madrid')::date into d from calendar_events where id=e;
 insert into training_sessions(event_id,child_id,session_date,attendance,created_by) values(e,c,d,'present',auth.uid());
 denied:=false;begin insert into training_sessions(event_id,child_id,session_date,attendance) select e,outsider,d,'present' from fixture_ids;exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Unrelated child accepted'; end if;
 denied:=false;begin update training_sessions set session_date=d+1 where event_id=e;exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Wrong date accepted'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$declare denied boolean:=false;begin
 if exists(select 1 from children) then raise exception 'Other coach child leak'; end if;
 begin perform public.get_session_players((select event from fixture_ids));exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Other coach roster leak'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$begin
 if not exists(select 1 from calendar_events where team_id=(select sunday from fixture_ids)) then raise exception 'Family misses Sunday'; end if;
 if not exists(select 1 from teams where id=(select sunday from fixture_ids)) then raise exception 'Missing team name / RLS recursion'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
do $$begin if exists(select 1 from calendar_events) then raise exception 'Unrelated family sees sessions'; end if; end $$;
reset role;
update academy_memberships set status='cancelled' where id=(select membership from fixture_ids);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin if exists(select 1 from children where id=(select child from fixture_ids)) then raise exception 'Cancelled membership still grants coach access'; end if; end $$;
reset role;
rollback;
\echo PASS: manual proration boundaries, two groups, dated Sunday sessions, idempotent email queue, historical protection, coach/family scope and attendance.
