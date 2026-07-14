-- Complete the schema used by the application before applying production RLS.
-- This migration is intentionally idempotent so existing Supabase projects can
-- adopt it without losing manually-created data.

create extension if not exists "pgcrypto";

-- Core CRM fields used throughout the application.
alter table public.workers add column if not exists user_id uuid unique references auth.users(id) on delete set null;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  coach_id uuid references public.workers(id) on delete set null,
  schedule text,
  max_players integer not null default 16 check (max_players > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  color text not null default '#3b82f6',
  created_at timestamptz not null default now()
);

alter table public.children add column if not exists birth_date date;
alter table public.children add column if not exists address text;
alter table public.children add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.children add column if not exists public_share_token uuid default gen_random_uuid();
alter table public.children add column if not exists position text;
alter table public.children add column if not exists preferred_foot text;
alter table public.children add column if not exists shirt_size text;
alter table public.children add column if not exists jersey_number integer;
create unique index if not exists children_public_share_token_idx on public.children(public_share_token);
update public.children set public_share_token = gen_random_uuid() where public_share_token is null;

alter table public.membership_plans add column if not exists frequency text not null default 'mensual';
alter table public.academy_memberships add column if not exists payment_method text not null default 'transfer';
alter table public.academy_memberships add column if not exists monthly_price numeric;

alter table public.payments add column if not exists child_id uuid references public.children(id) on delete set null;
alter table public.payments add column if not exists description text;
alter table public.payments alter column ref_id drop not null;
alter table public.payments drop constraint if exists payments_type_check;
alter table public.payments add constraint payments_type_check check (type in ('academy','campus','tournament','shop','other'));
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check check (method in ('cash','efectivo','transfer','transferencia','stripe','tarjeta'));

alter table public.expenses add column if not exists concept text;
update public.expenses set concept = coalesce(concept, vendor, category) where concept is null;

-- Campus fields used by the management screen and family records.
alter table public.campuses add column if not exists type text not null default 'verano';
alter table public.campuses add column if not exists location text;
alter table public.campuses add column if not exists description text;
alter table public.campuses add column if not exists schedule text;
alter table public.campus_enrollments add column if not exists tshirt_size text;
alter table public.campus_enrollments add column if not exists allergies text;
alter table public.campus_enrollments add column if not exists emergency_contact text;
alter table public.campus_enrollments add column if not exists emergency_phone text;
alter table public.campus_enrollments add column if not exists notes text;

-- Tournament administration.
alter table public.tournaments_internal add column if not exists location text;
alter table public.tournaments_internal add column if not exists price numeric not null default 0;
alter table public.tournaments_internal add column if not exists capacity integer not null default 20;
alter table public.tournaments_internal add column if not exists status text not null default 'draft';
alter table public.tournaments_internal add column if not exists type text not null default 'propio';

create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_internal(id) on delete cascade,
  team_name text not null,
  contact_phone text,
  contact_email text,
  is_local boolean not null default false,
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'registered' check (status in ('registered', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

-- Store catalogue. Orders keep a snapshot of product name and price.
create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  sizes text[] not null default '{}',
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.broadcast_logs (
  id uuid primary key default gen_random_uuid(),
  category_name text not null,
  message text not null,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.order_items add column if not exists product_id uuid references public.store_products(id) on delete set null;
alter table public.order_items add column if not exists size text;

-- Some early deployments never received the value-add and notifications
-- migrations. Create those tables here as well so this completion migration is
-- sufficient for both fresh and legacy projects.
create table if not exists public.progress_reports (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  term text not null,
  file_url text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type' and typnamespace = 'public'::regnamespace) then
    create type public.notification_type as enum ('info', 'alert', 'success');
  end if;
end
$$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type public.notification_type not null default 'info',
  is_read boolean not null default false,
  link_url text,
  created_at timestamptz not null default now()
);

-- Use one media table for videos and private player galleries.
alter table public.media_assets alter column video_url drop not null;
alter table public.media_assets add column if not exists url text;
alter table public.media_assets add column if not exists context text not null default 'academia';
alter table public.media_assets add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.media_assets add column if not exists child_id uuid references public.children(id) on delete cascade;
alter table public.media_assets add column if not exists media_type text not null default 'video';

-- The signature implementation stores a private object path, not a public URL.
alter table public.signatures add column if not exists signature_data text;
alter table public.signatures alter column signature_data drop not null;
alter table public.signatures add column if not exists document_version text not null default '1.0';
alter table public.signatures add column if not exists signature_image_path text;
alter table public.signatures add column if not exists user_agent text;

-- General academy configuration shares the existing table with a dedicated,
-- non-public WhatsApp credential row.
drop index if exists public.admin_academy_settings_single_row;
alter table public.academy_settings add column if not exists key text;
alter table public.academy_settings add column if not exists value text;
alter table public.academy_settings add column if not exists is_public boolean not null default false;
alter table public.academy_settings add column if not exists greenapi_id_instance text;
alter table public.academy_settings add column if not exists greenapi_api_token_instance text;
create unique index if not exists academy_settings_key_idx on public.academy_settings(key) where key is not null;
update public.academy_settings
set key = 'whatsapp_integration', is_public = false
where key is null and (greenapi_id_instance is not null or greenapi_api_token_instance is not null);
insert into public.academy_settings (key, is_public)
values ('whatsapp_integration', false)
on conflict (key) where key is not null do nothing;

-- Fields controlled from the admin settings screen and safe for public pages.
insert into public.academy_settings (key, value, is_public) values
  ('academy_name', 'Academy Costa Brava', true),
  ('academy_phone', '', true),
  ('academy_email', '', true),
  ('academy_address', '', true),
  ('academy_cif', '', true),
  ('academy_whatsapp', '', true),
  ('tournaments_url', '', true),
  ('current_season', '', true)
on conflict (key) where key is not null do nothing;

-- Public player profile: expose only the deliberately selected fields behind
-- an unguessable token. Private notes, addresses and guardian data are omitted.
create or replace function public.get_public_player_data(token_input uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'child_id', c.id,
    'child', jsonb_build_object(
      'full_name', c.full_name,
      'birth_year', c.birth_year,
      'category_name', cat.name
    ),
    'metrics', (
      select to_jsonb(m) - 'child_id' - 'notes' - 'created_by'
      from public.child_metrics m
      where m.child_id = c.id and m.visible_to_guardian = true
      order by m.recorded_at desc limit 1
    ),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', a.name,
        'description', a.description,
        'icon', a.icon,
        'earned_at', ca.earned_at
      ) order by ca.earned_at desc)
      from public.child_achievements ca
      join public.achievements a on a.id = ca.achievement_id
      where ca.child_id = c.id
    ), '[]'::jsonb),
    'gallery', '[]'::jsonb
  )
  from public.children c
  left join public.categories cat on cat.id = c.category_id
  where c.public_share_token = token_input;
$$;

revoke all on function public.get_public_player_data(uuid) from public;
grant execute on function public.get_public_player_data(uuid) to anon, authenticated;
