-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Users matching auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role text check (role in ('admin','staff','finance','marketing','guardian')) default 'guardian',
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- 2. CATEGORIES (Internal)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);
alter table categories enable row level security;

-- 3. GUARDIANS
create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique null references auth.users(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text null,
  notes text null,
  created_at timestamptz default now()
);
alter table guardians enable row level security;

-- 4. CHILDREN
create table public.children (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_year int not null,
  category_id uuid references categories(id),
  notes text null,
  created_at timestamptz default now()
);
alter table children enable row level security;

-- 5. CHILD_GUARDIANS (Relation)
create table public.child_guardians (
  child_id uuid references children(id) on delete cascade,
  guardian_id uuid references guardians(id) on delete cascade,
  relationship text null,
  is_primary boolean default true,
  primary key (child_id, guardian_id)
);
alter table child_guardians enable row level security;

-- 6. LEADS
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  child_name text not null,
  birth_year int not null,
  category_text text not null,
  guardian_name text not null,
  phone text not null,
  status text check (status in ('new','contacted','interested','enrolled','lost')) default 'new',
  source text check (source in ('web_agent','form','whatsapp','other')) default 'web_agent',
  notes text null,
  last_contact_at timestamptz null,
  created_at timestamptz default now()
);
alter table leads enable row level security;

-- 7. PLANS
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  duration_months int not null,
  price numeric null,
  created_at timestamptz default now()
);
alter table membership_plans enable row level security;

-- 8. ACADEMY_MEMBERSHIPS
create table public.academy_memberships (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  plan_id uuid not null references membership_plans(id),
  start_date date not null,
  end_date date not null,
  status text check (status in ('active','paused','cancelled','pending_payment')) default 'pending_payment',
  payment_status text check (payment_status in ('paid','pending','overdue')) default 'pending',
  created_at timestamptz default now()
);
alter table academy_memberships enable row level security;

-- 9. CAMPUSES
create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  capacity int not null default 0,
  price numeric null,
  status text check (status in ('draft','published','closed')) default 'draft',
  created_at timestamptz default now()
);
alter table campuses enable row level security;

-- 10. CAMPUS_ENROLLMENTS
create table public.campus_enrollments (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references campuses(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  status text check (status in ('reserved','pending_payment','confirmed','cancelled')) default 'pending_payment',
  created_at timestamptz default now(),
  unique (campus_id, child_id)
);
alter table campus_enrollments enable row level security;

-- 11. PAYMENTS
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('academy','campus')) not null,
  ref_id uuid not null, 
  amount numeric not null default 0,
  status text check (status in ('pending','paid','failed','refunded')) default 'pending',
  method text check (method in ('cash','transfer','stripe')) default 'transfer',
  paid_at timestamptz null,
  stripe_payment_intent_id text null,
  stripe_invoice_id text null,
  created_at timestamptz default now()
);
alter table payments enable row level security;

-- 12. EXPENSES
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category text not null,
  vendor text null,
  amount numeric not null,
  notes text null,
  attachment_path text null,
  created_at timestamptz default now()
);
alter table expenses enable row level security;

-- 13. MESSAGES
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references guardians(id) on delete set null,
  channel text check (channel in ('whatsapp')) default 'whatsapp',
  direction text check (direction in ('outgoing','incoming')) not null,
  content text not null,
  status text check (status in ('queued','sent','delivered','failed')) default 'sent',
  provider_message_id text null,
  created_at timestamptz default now()
);
alter table messages enable row level security;

-- 14. DOCUMENTS
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid null references children(id) on delete cascade,
  guardian_id uuid null references guardians(id) on delete cascade,
  doc_type text not null,
  file_path text not null,
  visibility text check (visibility in ('admin_only','guardian_visible')) default 'admin_only',
  created_at timestamptz default now()
);
alter table documents enable row level security;

-- 15. TOURNAMENTS (Internal)
create table public.tournaments_internal (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date date null,
  end_date date null,
  external_url text null,
  checklist jsonb default '[]'::jsonb,
  notes text null,
  created_at timestamptz default now()
);
alter table tournaments_internal enable row level security;

-- 16. SETTINGS
create table public.settings (
  id int primary key default 1,
  academy_name text not null default 'Academia',
  logo_url text null,
  public_tournaments_url text null,
  created_at timestamptz default now(),
  constraint single_row check (id = 1)
);
alter table settings enable row level security;

-- 17. CHILD_METRICS (FIFA stats)
create table public.child_metrics (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  recorded_at date not null,
  pace int not null default 50,
  shooting int not null default 50,
  passing int not null default 50,
  dribbling int not null default 50,
  defending int not null default 50,
  physical int not null default 50,
  discipline int not null default 50,
  notes text null,
  visible_to_guardian boolean default true,
  created_at timestamptz default now()
);
alter table child_metrics enable row level security;

-- 18. COACH_NOTES
create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  note_date date not null,
  title text not null,
  content text not null,
  visibility text check (visibility in ('admin_only','guardian_visible')) default 'guardian_visible',
  created_by uuid null references profiles(id),
  created_at timestamptz default now()
);
alter table coach_notes enable row level security;

-- 19. TRAINING_SESSIONS
create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  session_date date not null,
  attendance text check (attendance in ('present','absent','excused')) default 'present',
  focus text null,
  summary text null,
  created_by uuid null references profiles(id),
  visible_to_guardian boolean default true,
  created_at timestamptz default now()
);
alter table training_sessions enable row level security;

-- 20. ACHIEVEMENTS
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text null,
  icon text null,
  created_at timestamptz default now()
);
alter table achievements enable row level security;

-- 21. CHILD_ACHIEVEMENTS
create table public.child_achievements (
  child_id uuid references children(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete cascade,
  earned_at date not null default current_date,
  note text null,
  primary key (child_id, achievement_id)
);
alter table child_achievements enable row level security;

-- 22. GOALS
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  title text not null,
  description text null,
  status text check (status in ('active','completed','archived')) default 'active',
  due_date date null,
  created_at timestamptz default now()
);
alter table goals enable row level security;

-- 23. PROGRESS_EVENTS
create table public.progress_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  event_date date not null,
  type text check (type in ('milestone','injury','highlight','behavior','other')) default 'milestone',
  title text not null,
  details text null,
  visibility text check (visibility in ('admin_only','guardian_visible')) default 'guardian_visible',
  created_at timestamptz default now()
);
alter table progress_events enable row level security;

-- RLS POLICIES
-- Helper function to check if user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Helper function to check if user is guardian of a child
create or replace function public.is_guardian_of(child_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.guardians g
    join public.child_guardians cg on cg.guardian_id = g.id
    where g.user_id = auth.uid()
    and cg.child_id = child_uuid
  );
end;
$$ language plpgsql security definer;

-- Profiles: Admin sees all, User sees own.
create policy "Admin sees all profiles" on profiles for select using (is_admin());
-- Guardians: Admin full, User sees own.
create policy "Admin full access guardians" on guardians for all using (is_admin());
create policy "Guardian sees self" on guardians for select using (user_id = auth.uid());
-- Children: Admin full, Guardian sees associated.
create policy "Admin full access children" on children for all using (is_admin());
create policy "Guardian sees own children" on children for select using (is_guardian_of(id));

-- Child Guardians: Admin full, Guardian view own.
create policy "Admin full access child_guardians" on child_guardians for all using (is_admin());
create policy "Guardian sees own relations" on child_guardians for select using (
  exists (select 1 from guardians g where g.id = guardian_id and g.user_id = auth.uid())
);

-- General Read for authenticated (for selects in UI)
-- Categories: Public read
create policy "Public read categories" on categories for select using (true);

-- Metrics, Notes, Sessions, Achievements, Goals, Events: Admin full, Guardian see if visible
create policy "Admin full metrics" on child_metrics for all using (is_admin());
create policy "Guardian read metrics" on child_metrics for select using (is_guardian_of(child_id) and visible_to_guardian);

create policy "Admin full notes" on coach_notes for all using (is_admin());
create policy "Guardian read notes" on coach_notes for select using (is_guardian_of(child_id) and visibility = 'guardian_visible');

create policy "Admin full sessions" on training_sessions for all using (is_admin());
create policy "Guardian read sessions" on training_sessions for select using (is_guardian_of(child_id) and visible_to_guardian);

create policy "Admin full achievements" on achievements for all using (is_admin());
create policy "Public read achievements" on achievements for select using (true); -- icons/names are generic

create policy "Admin full child_achievements" on child_achievements for all using (is_admin());
create policy "Guardian read child_achievements" on child_achievements for select using (is_guardian_of(child_id));

create policy "Admin full goals" on goals for all using (is_admin());
create policy "Guardian read goals" on goals for select using (is_guardian_of(child_id));

create policy "Admin full events" on progress_events for all using (is_admin());
create policy "Guardian read events" on progress_events for select using (is_guardian_of(child_id) and visibility = 'guardian_visible');

-- Leads: Admin full, Public insert (web_agent)
create policy "Admin full leads" on leads for all using (is_admin());
create policy "Public insert leads" on leads for insert with check (true);

-- Settings: Public read
create policy "Public read settings" on settings for select using (true);
create policy "Admin update settings" on settings for update using (is_admin());

-- SEED DATA
insert into settings (id, academy_name) values (1, 'Academia de Fútbol') on conflict do nothing;
insert into membership_plans (name, duration_months, price) values
('Mensual', 1, 40),
('Trimestral', 3, 110),
('Anual', 12, 400);

insert into categories (name) values ('Benjamín'), ('Alevín'), ('Infantil'), ('Cadete'), ('Juvenil');

insert into achievements (name, description, icon) values 
('MVP del Mes', 'Mejor jugador del mes', 'trophy'),
('Asistencia Perfecta', 'No ha faltado a ningún entreno', 'calendar-check'),
('Goleador', 'Ha marcado 5 goles', 'goal'),
('Muro Defensivo', 'Defensa impasable', 'shield');
