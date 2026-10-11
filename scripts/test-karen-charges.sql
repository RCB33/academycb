\set ON_ERROR_STOP on
-- Local disposable database only. All fixtures roll back.
begin;
create role anon; create role authenticated;
create schema auth; create schema private;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.has_role(text[]) returns boolean language sql as $$select coalesce(current_setting('test.admin',true)='yes',false)$$;
create table public.children(id uuid primary key);
create table public.payments(id uuid primary key default gen_random_uuid(),type text,ref_id uuid,child_id uuid,amount numeric,status text,method text,description text,due_date date,created_by uuid);
grant usage on schema auth,private to authenticated;
grant select on payments to authenticated;
\ir ../supabase/migrations/20261011220231_karen_payment_concepts.sql
insert into auth.users values('00000000-0000-0000-0000-000000000001');
insert into children values('10000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('test.admin','yes',true);
set local role authenticated;
do $$declare child uuid:='10000000-0000-0000-0000-000000000001'; req uuid:=gen_random_uuid(); lines jsonb:='[{"concept":"monthly","month":"2026-10","gross":60,"discount":10,"promotion":"Anticipo","description":"Octubre","due":"2026-10-01"},{"concept":"monthly","month":"2026-11","gross":60,"discount":60,"promotion":"Mes bonificado","description":"Noviembre","due":"2026-11-01"},{"concept":"plus","gross":100,"discount":0,"description":"Plan Plus","due":"2026-10-01"}]'; n int; begin
 perform create_manual_charges(req,child,lines);
 perform create_manual_charges(req,child,lines);
 if (select count(*) from payments)<>3 then raise exception 'Retry duplicated'; end if;
 if not exists(select 1 from payments where covered_month='2026-10' and amount=50 and status='pending') then raise exception 'Discount incorrect'; end if;
 if not exists(select 1 from payments where covered_month='2026-11' and amount=0 and status='paid' and method is null) then raise exception 'Bonification treated as money/debt'; end if;
 if not exists(select 1 from payments where concept_code='plus' and covered_month is null and amount=100) then raise exception 'Plus not independent'; end if;
 begin perform create_manual_charges(req,child,'[]'); raise exception 'Altered retry accepted'; exception when others then if sqlerrm='Altered retry accepted' then raise; end if; end;
 begin perform create_manual_charges(gen_random_uuid(),child,lines); raise exception 'Duplicate month accepted'; exception when others then if sqlerrm='Duplicate month accepted' then raise; end if; end;
 begin perform create_manual_charges(gen_random_uuid(),child,'[{"concept":"kit","gross":30,"discount":0,"description":"Kit","due":"2026-10-01"},{"concept":"monthly","month":"2026-10","gross":60,"discount":0,"description":"Duplicado","due":"2026-10-01"}]'); raise exception 'Batch conflict accepted'; exception when others then if sqlerrm='Batch conflict accepted' then raise; end if; end;
 if (select count(*) from payments)<>3 or (select count(*) from manual_charge_requests)<>1 then raise exception 'Failed transaction persisted'; end if;
 perform set_config('test.admin','no',true);
 begin perform create_manual_charges(gen_random_uuid(),child,lines); raise exception 'Unauthorized accepted'; exception when others then if sqlerrm='Unauthorized accepted' then raise; end if; end;
 if exists(select 1 from manual_charge_requests) then raise exception 'Private request visible'; end if;
end $$;
rollback;
\echo Karen monthly charges, promotions, duplicates, atomicity and permissions: PASS
