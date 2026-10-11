\set ON_ERROR_STOP on
begin;
create role anon; create role authenticated;
create schema auth; create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.has_role(text[]) returns boolean language sql as $$select coalesce(current_setting('test.role',true)=any($1),false)$$;
create table public.manual_collection_batches(id uuid primary key);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema auth,storage to authenticated;
grant select,insert on storage.objects to authenticated;
grant select on manual_collection_batches to authenticated;
\ir ../supabase/migrations/20261011220245_karen_payment_proofs.sql
insert into auth.users values('00000000-0000-0000-0000-000000000001');
insert into manual_collection_batches values('10000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('test.role','finance',true);
set local role authenticated;
insert into storage.objects(bucket_id,name) values('payment-proofs','10000000-0000-0000-0000-000000000001/proof.pdf');
insert into payment_proofs(batch_id,path,filename,created_by) values('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001/proof.pdf','proof.pdf',auth.uid());
do $$begin
 begin insert into storage.objects(bucket_id,name) values('payment-proofs','unknown/proof.pdf');raise exception 'Unknown batch accepted';exception when insufficient_privilege then null;end;
 perform set_config('test.role','coach',true);
 if exists(select 1 from payment_proofs) or exists(select 1 from storage.objects) then raise exception 'Coach sees private proofs';end if;
 begin insert into storage.objects(bucket_id,name) values('payment-proofs','10000000-0000-0000-0000-000000000001/other.pdf');raise exception 'Coach upload allowed';exception when insufficient_privilege then null;end;
 perform set_config('test.role','guardian',true);
 if exists(select 1 from payment_proofs) or exists(select 1 from storage.objects) then raise exception 'Guardian sees admin proofs';end if;
end $$;
rollback;
\echo Private proofs: finance access, invalid batch rejection, coach and guardian isolation PASS
