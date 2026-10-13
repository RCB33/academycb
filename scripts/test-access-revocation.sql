\set ON_ERROR_STOP on
begin;
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table profiles(id uuid primary key,role text);
create table workers(id uuid primary key,user_id uuid,access_enabled boolean);
create table calendar_events(id uuid primary key,worker_id uuid);
create table calendar_event_workers(event_id uuid,worker_id uuid);
alter table workers enable row level security;
grant usage on schema auth to authenticated;
grant select on workers to authenticated;
\ir ../supabase/migrations/20261013180359_karen_access_revocation.sql
insert into profiles values('00000000-0000-0000-0000-000000000001','coach');
insert into workers values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',true);
insert into calendar_events values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$begin
 if not public.has_role(array['coach']) or public.current_worker_id() is null or not public.can_manage_calendar_event('00000000-0000-0000-0000-000000000003') then raise exception 'Active coach denied';end if;
end$$;
reset role;
update workers set access_enabled=false;
set local role authenticated;
do $$begin
 if public.has_role(array['coach']) or public.current_worker_id() is not null or public.can_manage_calendar_event('00000000-0000-0000-0000-000000000003') or exists(select 1 from workers) then raise exception 'Disabled coach still authorized';end if;
end$$;
reset role;
update workers set access_enabled=true;
update profiles set role='parent';
set local role authenticated;
do $$begin
 if public.can_manage_calendar_event('00000000-0000-0000-0000-000000000003') then raise exception 'Wrong role allowed';end if;
end$$;
rollback;
\echo Access revocation, coach role and worker privacy: PASS
