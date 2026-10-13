\set ON_ERROR_STOP on
begin;
create role anon;create role authenticated;
create schema auth;create schema private;
create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
create function public.has_role(text[]) returns boolean language sql as $$select true$$;
create table guardians(id uuid primary key default gen_random_uuid(),full_name text,email text,phone text);
create table children(id uuid primary key default gen_random_uuid(),full_name text,birth_year int,birth_date date);
create table child_guardians(child_id uuid,guardian_id uuid,relationship text,is_primary boolean);
create table enrollment_requests(id uuid primary key default gen_random_uuid(),child_name text,birth_date date,guardian_name text,email text,phone text,status text,last_contact_at timestamptz);
insert into guardians(full_name,email) values('A','duplicate@example.org'),('B','DUPLICATE@example.org');
\ir ../supabase/migrations/20261013180401_karen_guardian_duplicate_guard.sql
do $$declare req uuid;begin
 begin insert into guardians(email) values(' Duplicate@example.org ');raise exception 'Duplicate allowed';exception when raise_exception then if sqlerrm='Duplicate allowed' then raise;end if;end;
 insert into enrollment_requests(child_name,birth_date,email,status) values('Child','2015-01-01','duplicate@example.org','pending') returning id into req;
 begin perform public.convert_enrollment_request(req);raise exception 'Ambiguous guardian chosen';exception when raise_exception then if sqlerrm='Ambiguous guardian chosen' then raise;end if;end;
 if exists(select 1 from children) or exists(select 1 from child_guardians) then raise exception 'Partial conversion remained';end if;
 insert into enrollment_requests(child_name,birth_date,email,status) values('Child','2015-01-01',' New@example.org ','pending') returning id into req;
 perform public.convert_enrollment_request(req);
 if (select count(*) from children)<>1 or not exists(select 1 from guardians where email='new@example.org') then raise exception 'Valid conversion failed';end if;
 begin perform public.convert_enrollment_request(req);raise exception 'Repeat conversion allowed';exception when raise_exception then if sqlerrm='Repeat conversion allowed' then raise;end if;end;
end$$;
rollback;
\echo Guardian duplicates, normalized email and atomic conversion: PASS
