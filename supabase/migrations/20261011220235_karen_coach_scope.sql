-- Assigned coaches only; no financial permissions are added.
create or replace function public.is_coach_of(child_uuid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.has_role(array['coach']) and exists(
  select 1 from public.children c join public.teams t on t.id=c.team_id join public.workers w on w.id=t.coach_id
  where c.id=child_uuid and w.user_id=auth.uid() and w.access_enabled=true
 )
$$;
revoke all on function public.is_coach_of(uuid) from public,anon;
grant execute on function public.is_coach_of(uuid) to authenticated;
drop policy if exists teams_staff_read on public.teams;
create policy teams_staff_read on public.teams for select to authenticated using(
 public.has_role(array['staff']) or (public.has_role(array['coach']) and exists(select 1 from public.workers w where w.id=teams.coach_id and w.user_id=auth.uid() and w.access_enabled=true))
);
create policy metrics_assigned_coach_read on public.child_metrics for select to authenticated using(public.is_coach_of(child_id));
create table public.coach_observations (
 id uuid primary key default gen_random_uuid(),
 child_id uuid not null references public.children(id),
 author_id uuid not null references auth.users(id),
 body text not null check(length(btrim(body)) between 2 and 2000),
 created_at timestamptz not null default now()
);
create index coach_observations_child_idx on public.coach_observations(child_id,created_at desc);
alter table public.coach_observations enable row level security;
revoke all on public.coach_observations from public,anon,authenticated;
grant select,insert on public.coach_observations to authenticated;
create policy coach_observations_read on public.coach_observations for select to authenticated using(public.is_admin() or public.is_coach_of(child_id));
create policy coach_observations_insert on public.coach_observations for insert to authenticated with check(author_id=auth.uid() and (public.is_admin() or public.is_coach_of(child_id)));
