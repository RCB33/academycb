-- Keep former players and their history without deleting any related records.
alter table public.children add column if not exists archived_at timestamptz;
alter table public.children add column if not exists archived_by uuid references auth.users(id) on delete set null;
create index if not exists children_archived_at_idx on public.children(archived_at) where archived_at is not null;
