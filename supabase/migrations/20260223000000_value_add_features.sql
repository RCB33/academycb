-- 1. MEDIA ASSETS (Videoteca)
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade,
  title text not null,
  description text null,
  video_url text not null, -- Expected to be YouTube/Vimeo embed URL
  thumbnail_url text null,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.media_assets enable row level security;
create policy "Admin full access media" on public.media_assets for all using (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach'));
create policy "Guardians view category media" on public.media_assets for select using (
  exists (
    select 1 from public.children c
    join public.child_guardians cg on c.id = cg.child_id
    join public.guardians g on cg.guardian_id = g.id
    where c.category_id = media_assets.category_id
    and g.user_id = auth.uid()
  )
);

-- 2. PROGRESS REPORTS (Boletines PDF)
create table public.progress_reports (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  term text not null, -- e.g. "Trimestre 1 2025"
  file_url text not null, -- URL to the Supabase storage or external generated PDF
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.progress_reports enable row level security;
create policy "Admin full access reports" on public.progress_reports for all using (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach'));
create policy "Guardians view own child reports" on public.progress_reports for select using (public.is_guardian_of(child_id));

-- 3. SIGNATURES (Consentimientos)
create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  child_id uuid null references public.children(id) on delete cascade, -- Optional, if document is specific to a child
  document_type text not null, -- e.g. "RGPD", "Derechos Imagen"
  signature_data text not null, -- Base64 string of the signature canvas
  signed_at timestamptz default now(),
  ip_address text null
);
alter table public.signatures enable row level security;
create policy "Admin full access signatures" on public.signatures for all using (public.is_admin());
create policy "Guardians view own signatures" on public.signatures for select using (
  exists (select 1 from public.guardians where id = guardian_id and user_id = auth.uid())
);
create policy "Guardians insert own signatures" on public.signatures for insert with check (
  exists (select 1 from public.guardians where id = guardian_id and user_id = auth.uid())
);
