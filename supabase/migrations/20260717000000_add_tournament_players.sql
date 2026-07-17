create table if not exists public.tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_internal(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'selected'
    check (status in ('selected', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  unique (tournament_id, child_id)
);

create index if not exists tournament_players_tournament_idx
  on public.tournament_players(tournament_id);
create index if not exists tournament_players_child_idx
  on public.tournament_players(child_id);

alter table public.tournament_players enable row level security;

drop policy if exists "tournament_players_admin_all" on public.tournament_players;
create policy "tournament_players_admin_all"
  on public.tournament_players for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tournament_players_guardian_read" on public.tournament_players;
create policy "tournament_players_guardian_read"
  on public.tournament_players for select to authenticated
  using (public.is_guardian_of(child_id));

grant select, insert, update, delete on public.tournament_players to authenticated;
