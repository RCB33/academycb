-- Create CALENDAR_EVENTS table
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  color text default 'blue', -- blue, red, green, yellow, purple
  is_all_day boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.calendar_events enable row level security;

-- Policies
create policy "Admins can manage calendar events" on calendar_events
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
