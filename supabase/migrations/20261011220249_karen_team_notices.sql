-- Explicit internal notices, not historical guardian/email messages.
create table public.team_notices (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id),
 author_id uuid not null references auth.users(id),
 title text not null check(length(btrim(title)) between 3 and 150),
 body text not null check(length(btrim(body)) between 2 and 3000),
 created_at timestamptz not null default now()
);
create index team_notices_team_idx on public.team_notices(team_id,created_at desc);
create index team_notices_author_idx on public.team_notices(author_id);
alter table public.team_notices enable row level security;
revoke all on public.team_notices from public,anon,authenticated;
grant select,insert on public.team_notices to authenticated;
create policy team_notices_read on public.team_notices for select to authenticated using(public.is_admin() or (public.has_role(array['coach']) and exists(select 1 from public.teams t join public.workers w on w.id=t.coach_id where t.id=team_id and w.user_id=auth.uid() and w.access_enabled=true)));
create policy team_notices_insert on public.team_notices for insert to authenticated with check(public.is_admin() and author_id=auth.uid());
create index if not exists manual_charge_requests_actor_idx on public.manual_charge_requests(actor_id);
create index if not exists coach_observations_author_idx on public.coach_observations(author_id);
