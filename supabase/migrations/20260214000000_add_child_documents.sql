-- Create child_documents table to match application logic
create table if not exists public.child_documents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  name text not null,
  url text not null,
  size text not null,
  type text not null,
  created_at timestamptz default now()
);

alter table child_documents enable row level security;

-- Policies
create policy "Admin full access child_documents" on child_documents for all using (is_admin());
create policy "Guardian read child_documents" on child_documents for select using (is_guardian_of(child_id));
