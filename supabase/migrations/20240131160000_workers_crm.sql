create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  position text,
  color text default 'blue',
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.calendar_events 
add column if not exists worker_id uuid references public.workers(id) on delete set null;

alter table public.workers enable row level security;

-- Drop policy if it exists to clean slate
drop policy if exists "Admins can manage workers" on public.workers;

create policy "Admins can manage workers" on public.workers
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
