\set ON_ERROR_STOP on
begin;
create role anon;create role authenticated;create schema private;
create function public.has_role(text[]) returns boolean language sql as $$select true$$;
create function public.can_manage_calendar_event(uuid) returns boolean language sql as $$select true$$;
create table children(id uuid primary key,team_id uuid,category_id uuid);
create table calendar_events(id uuid primary key,team_id uuid,category_id uuid,start_date timestamptz);
create table training_sessions(event_id uuid,child_id uuid,session_date date);
\ir ../supabase/migrations/20261013180824_coach_attendance_consistency.sql
insert into children values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',null);
insert into calendar_events values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',null,'2026-10-13T17:00:00Z');
do $$begin
 insert into training_sessions values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','2026-10-13');
 begin update training_sessions set session_date='2026-10-14';raise exception 'Wrong date allowed';exception when raise_exception then if sqlerrm='Wrong date allowed' then raise;end if;end;
 begin update training_sessions set child_id='00000000-0000-0000-0000-000000000004';raise exception 'Wrong child allowed';exception when raise_exception then if sqlerrm='Wrong child allowed' then raise;end if;end;
end$$;
rollback;
\echo Attendance event, child and date consistency: PASS
