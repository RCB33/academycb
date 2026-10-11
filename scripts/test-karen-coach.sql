\set ON_ERROR_STOP on
-- Local disposable database only.
begin;
create role anon; create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.has_role(text[]) returns boolean language sql as $$select coalesce(current_setting('test.role',true)=any($1),false)$$;
create function public.is_admin() returns boolean language sql as $$select public.has_role(array['admin'])$$;
create table workers(id uuid primary key,user_id uuid,access_enabled boolean);
create table teams(id uuid primary key,coach_id uuid);
create table children(id uuid primary key,team_id uuid);
create table child_metrics(id uuid primary key,child_id uuid);
create table payments(id uuid primary key,child_id uuid);
alter table teams enable row level security;
alter table children enable row level security;
alter table child_metrics enable row level security;
alter table payments enable row level security;
create policy payments_admin on payments for select using(public.is_admin());
grant usage on schema auth to authenticated;
grant select on workers,teams,children,child_metrics,payments to authenticated;
\ir ../supabase/migrations/20261011220235_karen_coach_scope.sql
create table manual_charge_requests(actor_id uuid);
\ir ../supabase/migrations/20261011220249_karen_team_notices.sql
create policy children_coach on children for select to authenticated using(public.is_coach_of(id));
insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into workers select id,id,true from auth.users;
insert into teams select id,id from workers;
insert into children select id,id from teams;
insert into child_metrics select id,id from children;
insert into payments select id,id from children;
insert into team_notices(team_id,author_id,title,body) select id,id,'Aviso de equipo','Entrenamiento de prueba' from teams;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('test.role','coach',true);
set local role authenticated;
do $$begin
 if (select count(*) from teams)<>1 or (select count(*) from children)<>1 or (select count(*) from child_metrics)<>1 then raise exception 'Scope leak or missing assignment'; end if;
 if exists(select 1 from payments) then raise exception 'Coach sees finances'; end if;
 if (select count(*) from team_notices)<>1 then raise exception 'Notice team scope failed'; end if;
 begin insert into team_notices(team_id,author_id,title,body) values(auth.uid(),auth.uid(),'Aviso falso','Sin permiso');raise exception 'Coach publishes admin notice';exception when insufficient_privilege then null;end;
 insert into coach_observations(child_id,author_id,body) values(auth.uid(),auth.uid(),'Mejora del pase');
 begin insert into coach_observations(child_id,author_id,body) values('00000000-0000-0000-0000-000000000002',auth.uid(),'Otro grupo'); raise exception 'Other team write allowed'; exception when insufficient_privilege then null; end;
 begin insert into coach_observations(child_id,author_id,body) values(auth.uid(),'00000000-0000-0000-0000-000000000002','Autor falso'); raise exception 'Spoof allowed'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
 if exists(select 1 from coach_observations) then raise exception 'Other team notes visible'; end if;
end $$;
reset role;
update workers set access_enabled=false where id='00000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$begin
 if exists(select 1 from teams) or exists(select 1 from children) or exists(select 1 from child_metrics) then raise exception 'Disabled coach still sees assigned data'; end if;
 if exists(select 1 from team_notices) then raise exception 'Disabled coach sees notices';end if;
end $$;
rollback;
\echo Assigned coach scope, notes, disabled access and finance isolation: PASS
