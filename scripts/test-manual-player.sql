\set ON_ERROR_STOP on
begin;
create role anon;create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.is_admin() returns boolean language sql as $$select auth.uid()='00000000-0000-4000-8000-000000000001'::uuid$$;
create table guardians(id uuid primary key default gen_random_uuid(),full_name text,email text,phone text);
create table children(id uuid primary key default gen_random_uuid(),full_name text,birth_year int,birth_date date,position text,preferred_foot text,shirt_size text,jersey_number int,archived_at timestamptz);
create table child_guardians(child_id uuid references children,guardian_id uuid references guardians,relationship text,is_primary boolean);
\ir ../supabase/migrations/20261119214731_atomic_manual_player_creation.sql
grant usage on schema auth to authenticated;
grant all on guardians,children,child_guardians to authenticated;
insert into auth.users values('00000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$declare r uuid:=gen_random_uuid();c uuid;d jsonb:='{"full_name":"QA player","birth_date":"2016-01-01","guardian_name":"QA tutor","guardian_email":" Test@example.invalid ","guardian_phone":"600000000"}';denied boolean;
begin
 c:=public.create_player_with_guardian(r,d);
 if public.create_player_with_guardian(r,d)<>c or (select count(*) from children)<>1 then raise exception 'Retry duplicated';end if;
 if not exists(select 1 from child_guardians where child_id=c and is_primary) then raise exception 'Link missing';end if;
 perform public.create_player_with_guardian(gen_random_uuid(),d||'{"full_name":"QA sibling","guardian_name":"Different name"}');
 if (select count(*) from guardians)<>1 or not exists(select 1 from guardians where full_name='QA tutor' and email='test@example.invalid') then raise exception 'Tutor overwritten or duplicated';end if;
 denied:=false;begin perform public.create_player_with_guardian(gen_random_uuid(),d);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Duplicate child accepted';end if;
 update children set archived_at=now() where id=c;
 denied:=false;begin perform public.create_player_with_guardian(gen_random_uuid(),d);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Archived duplicate accepted';end if;
 denied:=false;begin perform public.create_player_with_guardian(r,d||'{"full_name":"Changed"}');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Request payload changed';end if;
 denied:=false;begin perform public.create_player_with_guardian(gen_random_uuid(),d||'{"birth_date":"2999-01-01"}');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Future birthday accepted';end if;
 insert into guardians(email) values('dup@example.invalid'),('DUP@example.invalid');
 denied:=false;begin perform public.create_player_with_guardian(gen_random_uuid(),d||'{"guardian_email":"dup@example.invalid"}');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Ambiguous tutor accepted';end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
 denied:=false;begin perform public.create_player_with_guardian(gen_random_uuid(),d);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Family created player';end if;
 if exists(select 1 from manual_player_requests) then raise exception 'Family read operation data';end if;
end$$;
reset role;
-- Simulate a failed last write: tutor and child must also roll back.
create function reject_link() returns trigger language plpgsql as $$begin raise exception 'Simulated link failure';end$$;
create trigger reject_link before insert on child_guardians for each row execute function reject_link();
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$begin
 begin perform public.create_player_with_guardian(gen_random_uuid(),'{"full_name":"Failure player","birth_date":"2016-01-01","guardian_name":"Failure tutor","guardian_email":"fail@example.invalid","guardian_phone":"600000000"}');exception when raise_exception then if sqlerrm<>'Simulated link failure' then raise;end if;end;
 if exists(select 1 from guardians where email='fail@example.invalid') or exists(select 1 from children where full_name='Failure player') then raise exception 'Partial creation survived';end if;
end$$;
rollback;
\echo PASS atomic player/tutor, reuse, retry, duplicates, archived, dates, roles and failure rollback
