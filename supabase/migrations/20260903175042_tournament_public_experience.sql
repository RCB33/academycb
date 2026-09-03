alter table public.tournaments_internal
  add column if not exists image_url text,
  add column if not exists public_summary text,
  add column if not exists season_period text,
  add column if not exists experience_type text,
  add column if not exists categories text,
  add column if not exists birth_years text,
  add column if not exists competitive_level text,
  add column if not exists tournament_format text,
  add column if not exists included_services text,
  add column if not exists preparation_info text,
  add column if not exists travel_info text,
  add column if not exists additional_info text;

alter table public.tournaments_internal
  drop constraint if exists tournaments_internal_status_check,
  drop constraint if exists tournaments_internal_season_period_check,
  drop constraint if exists tournaments_internal_experience_type_check;

alter table public.tournaments_internal
  add constraint tournaments_internal_status_check
    check (status in ('draft', 'coming_soon', 'open', 'closed')),
  add constraint tournaments_internal_season_period_check
    check (season_period is null or season_period in ('navidad', 'semana_santa', 'verano', 'otro')),
  add constraint tournaments_internal_experience_type_check
    check (experience_type is null or experience_type in ('regional', 'nacional', 'internacional'));

create index if not exists tournaments_internal_public_schedule_idx
  on public.tournaments_internal (status, start_date);

drop policy if exists "tournaments_public_read" on public.tournaments_internal;
create policy "tournaments_public_read"
  on public.tournaments_internal for select to anon, authenticated
  using (status in ('coming_soon', 'open', 'closed'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tournament-images',
  'tournament-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tournament_images_public_read" on storage.objects;
create policy "tournament_images_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'tournament-images');

drop policy if exists "tournament_images_admin_all" on storage.objects;
create policy "tournament_images_admin_all"
  on storage.objects for all to authenticated
  using (bucket_id = 'tournament-images' and public.is_admin())
  with check (bucket_id = 'tournament-images' and public.is_admin());

insert into public.tournaments_internal (
  title, start_date, end_date, location, status, type, season_period,
  experience_type, public_summary, capacity, price
)
select values_to_add.*
from (values
  ('Champions Dream', date '2026-12-27', date '2026-12-29', null::text, 'coming_soon', 'externo', 'navidad', null::text, 'Tres días de competición y convivencia con Academy.', 20, 0::numeric),
  ('231 Cup', date '2026-12-27', date '2026-12-27', null::text, 'coming_soon', 'externo', 'navidad', null::text, 'Una nueva experiencia competitiva para nuestros jugadores.', 20, 0::numeric),
  ('Winter Costa Brava Cup', date '2027-01-02', date '2027-01-03', 'Costa Brava', 'coming_soon', 'externo', 'navidad', 'regional', 'Fútbol y equipo para empezar el año compitiendo.', 20, 0::numeric),
  ('Artena Cup', date '2027-03-25', date '2027-03-26', 'Gran Canaria', 'coming_soon', 'externo', 'semana_santa', 'nacional', 'Competición, viaje y convivencia en Gran Canaria.', 20, 0::numeric),
  ('Summer Costa Brava Cup', date '2027-07-02', date '2027-07-04', 'Costa Brava', 'coming_soon', 'externo', 'verano', 'regional', 'Tres días para competir y compartir como equipo.', 20, 0::numeric),
  ('Donosti Cup', date '2027-07-05', date '2027-07-11', 'Donostia / San Sebastián', 'coming_soon', 'externo', 'verano', 'internacional', 'Una semana de fútbol, viaje y convivencia en una competición de referencia.', 20, 0::numeric),
  ('IberCup', null::date, null::date, null::text, 'coming_soon', 'externo', 'verano', 'internacional', 'Experiencia internacional prevista para S16 y Juvenil.', 20, 0::numeric)
) as values_to_add(title, start_date, end_date, location, status, type, season_period, experience_type, public_summary, capacity, price)
where not exists (
  select 1
  from public.tournaments_internal existing
  where lower(existing.title) = lower(values_to_add.title)
    and coalesce(existing.start_date, date '1900-01-01') = coalesce(values_to_add.start_date, date '1900-01-01')
);
