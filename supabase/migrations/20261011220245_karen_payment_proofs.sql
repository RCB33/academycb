-- Private proof files; finance roles only. No existing payment is changed.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-proofs','payment-proofs',false,3145728,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
create table public.payment_proofs (
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null references public.manual_collection_batches(id),
 path text not null unique,
 filename text not null check(length(filename) between 1 and 150),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index payment_proofs_batch_idx on public.payment_proofs(batch_id);
create index payment_proofs_author_idx on public.payment_proofs(created_by);
alter table public.payment_proofs enable row level security;
revoke all on public.payment_proofs from public,anon,authenticated;
grant select,insert on public.payment_proofs to authenticated;
create policy payment_proofs_finance_read on public.payment_proofs for select to authenticated using(public.has_role(array['admin','finance']));
create policy payment_proofs_finance_insert on public.payment_proofs for insert to authenticated with check(public.has_role(array['admin','finance']) and created_by=auth.uid() and split_part(path,'/',1)=batch_id::text);
create policy payment_proofs_storage_read on storage.objects for select to authenticated using(bucket_id='payment-proofs' and public.has_role(array['admin','finance']));
create policy payment_proofs_storage_insert on storage.objects for insert to authenticated with check(bucket_id='payment-proofs' and public.has_role(array['admin','finance']) and exists(select 1 from public.manual_collection_batches b where b.id::text=split_part(name,'/',1)));
