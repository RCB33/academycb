-- Turn the general calendar into the operational source of truth.
-- Existing manual events remain valid while teams, campuses and tournaments
-- receive a durable, automatically synchronized calendar representation.

alter table public.calendar_events
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists event_type text not null default 'general',
  add column if not exists status text not null default 'confirmed',
  add column if not exists visibility text not null default 'internal',
  add column if not exists source_type text not null default 'manual',
  add column if not exists source_id uuid,
  add column if not exists updated_at timestamptz not null default now();

update public.calendar_events
set end_date = case
  when is_all_day then start_date + interval '1 day'
  else start_date + interval '1 hour'
end
where end_date <= start_date;

alter table public.calendar_events drop constraint if exists calendar_events_date_order;
alter table public.calendar_events add constraint calendar_events_date_order check (end_date > start_date);
alter table public.calendar_events drop constraint if exists calendar_events_type_check;
alter table public.calendar_events add constraint calendar_events_type_check
  check (event_type in ('general','training','match','meeting','campus','tournament','absence'));
alter table public.calendar_events drop constraint if exists calendar_events_status_check;
alter table public.calendar_events add constraint calendar_events_status_check
  check (status in ('confirmed','tentative','cancelled'));
alter table public.calendar_events drop constraint if exists calendar_events_visibility_check;
alter table public.calendar_events add constraint calendar_events_visibility_check
  check (visibility in ('internal','families'));
alter table public.calendar_events drop constraint if exists calendar_events_source_check;
alter table public.calendar_events add constraint calendar_events_source_check
  check (source_type in ('manual','team','campus','tournament'));

create unique index if not exists calendar_events_source_occurrence_idx
  on public.calendar_events(source_type, source_id, start_date)
  where source_type <> 'manual' and source_id is not null;
create index if not exists calendar_events_range_idx on public.calendar_events(start_date, end_date);
create index if not exists calendar_events_team_idx on public.calendar_events(team_id);

create table if not exists public.calendar_event_workers (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, worker_id)
);
alter table public.calendar_event_workers enable row level security;
create index if not exists calendar_event_workers_worker_idx on public.calendar_event_workers(worker_id, event_id);

insert into public.calendar_event_workers(event_id, worker_id)
select id, worker_id from public.calendar_events where worker_id is not null
on conflict do nothing;

create or replace function public.sync_calendar_primary_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.worker_id is distinct from new.worker_id and old.worker_id is not null then
    delete from public.calendar_event_workers
    where event_id = new.id and worker_id = old.worker_id;
  end if;
  if new.worker_id is not null then
    insert into public.calendar_event_workers(event_id, worker_id)
    values (new.id, new.worker_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_primary_worker_sync on public.calendar_events;
create trigger calendar_primary_worker_sync
after insert or update of worker_id on public.calendar_events
for each row execute function public.sync_calendar_primary_worker();

create or replace function public.sync_team_calendar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cursor_date date;
  day_code text;
  day_codes text[];
  starts_at time;
  ends_at time;
  event_start timestamptz;
  event_end timestamptz;
  generated_event_id uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.calendar_events where source_type = 'team' and source_id = old.id;
    return old;
  end if;

  delete from public.calendar_events
  where source_type = 'team' and source_id = new.id and start_date::date >= current_date;

  if new.status <> 'active' or new.schedule is null or btrim(new.schedule) = '' then
    return new;
  end if;

  day_codes := string_to_array(replace(split_part(btrim(new.schedule), ' ', 1), ' ', ''), ',');
  starts_at := substring(new.schedule from '(\d{1,2}:\d{2})')::time;
  ends_at := substring(new.schedule from '\d{1,2}:\d{2}\s*-\s*(\d{1,2}:\d{2})')::time;
  if starts_at is null or ends_at is null or ends_at <= starts_at then return new; end if;

  for cursor_date in select generate_series(current_date, current_date + 365, interval '1 day')::date loop
    day_code := case extract(isodow from cursor_date)::int
      when 1 then 'L' when 2 then 'M' when 3 then 'X'
      when 4 then 'J' when 5 then 'V' when 6 then 'S' else 'D'
    end;
    if day_code = any(day_codes) then
      event_start := (cursor_date + starts_at) at time zone 'Europe/Madrid';
      event_end := (cursor_date + ends_at) at time zone 'Europe/Madrid';
      insert into public.calendar_events(
        title, description, start_date, end_date, color, is_all_day,
        worker_id, category_id, team_id, event_type, status, visibility,
        source_type, source_id
      ) values (
        'Entrenamiento · ' || new.name,
        'Sesión generada desde el horario del equipo ' || new.name,
        event_start, event_end, coalesce(new.color, '#22c55e'), false,
        new.coach_id, new.category_id, new.id, 'training', 'confirmed', 'families',
        'team', new.id
      ) returning id into generated_event_id;

      if new.coach_id is not null then
        insert into public.calendar_event_workers(event_id, worker_id)
        values (generated_event_id, new.coach_id)
        on conflict do nothing;
      end if;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists team_calendar_sync on public.teams;
create trigger team_calendar_sync
after insert or update of name, category_id, coach_id, schedule, status, color or delete on public.teams
for each row execute function public.sync_team_calendar();

create or replace function public.sync_campus_calendar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_start timestamptz;
  event_end timestamptz;
begin
  if tg_op = 'DELETE' then
    delete from public.calendar_events where source_type = 'campus' and source_id = old.id;
    return old;
  end if;
  if new.status = 'draft' then
    delete from public.calendar_events where source_type = 'campus' and source_id = new.id;
    return new;
  end if;

  event_start := new.start_date::timestamp at time zone 'Europe/Madrid';
  event_end := (new.end_date + 1)::timestamp at time zone 'Europe/Madrid';
  insert into public.calendar_events(
    title, description, start_date, end_date, color, is_all_day, location,
    event_type, status, visibility, source_type, source_id
  ) values (
    'Campus · ' || new.name, new.description, event_start, event_end,
    '#14b8a6', true, new.location, 'campus', 'confirmed', 'families', 'campus', new.id
  )
  on conflict (source_type, source_id, start_date) where source_type <> 'manual' and source_id is not null
  do update set title = excluded.title, description = excluded.description,
    end_date = excluded.end_date, location = excluded.location, updated_at = now();
  return new;
end;
$$;

drop trigger if exists campus_calendar_sync on public.campuses;
create trigger campus_calendar_sync
after insert or update of name, description, start_date, end_date, location, status or delete on public.campuses
for each row execute function public.sync_campus_calendar();

create or replace function public.sync_tournament_calendar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_start timestamptz;
  event_end timestamptz;
begin
  if tg_op = 'DELETE' then
    delete from public.calendar_events where source_type = 'tournament' and source_id = old.id;
    return old;
  end if;
  if new.status = 'draft' or new.start_date is null then
    delete from public.calendar_events where source_type = 'tournament' and source_id = new.id;
    return new;
  end if;

  event_start := new.start_date::timestamp at time zone 'Europe/Madrid';
  event_end := (coalesce(new.end_date, new.start_date) + 1)::timestamp at time zone 'Europe/Madrid';
  insert into public.calendar_events(
    title, description, start_date, end_date, color, is_all_day, location,
    event_type, status, visibility, source_type, source_id
  ) values (
    'Torneo · ' || new.title, new.notes, event_start, event_end,
    '#f97316', true, new.location, 'tournament', 'confirmed', 'families', 'tournament', new.id
  )
  on conflict (source_type, source_id, start_date) where source_type <> 'manual' and source_id is not null
  do update set title = excluded.title, description = excluded.description,
    end_date = excluded.end_date, location = excluded.location, updated_at = now();
  return new;
end;
$$;

drop trigger if exists tournament_calendar_sync on public.tournaments_internal;
create trigger tournament_calendar_sync
after insert or update of title, notes, start_date, end_date, location, status or delete on public.tournaments_internal
for each row execute function public.sync_tournament_calendar();

-- Rebuild operational events for existing records.
update public.teams set schedule = schedule where schedule is not null;
update public.campuses set status = status where status <> 'draft';
update public.tournaments_internal set status = status where status <> 'draft' and start_date is not null;

create or replace function public.current_worker_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.workers
  where user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt()->>'email',''))
  order by (user_id = auth.uid()) desc
  limit 1
$$;
revoke all on function public.current_worker_id() from public;
grant execute on function public.current_worker_id() to authenticated;

drop policy if exists "calendar_admin_all" on public.calendar_events;
drop policy if exists "calendar_staff_read" on public.calendar_events;
drop policy if exists "calendar_guardian_read" on public.calendar_events;
drop policy if exists "Admins can manage calendar events" on public.calendar_events;
drop policy if exists "Coaches can view calendar events" on public.calendar_events;

create policy "calendar_operations_manage" on public.calendar_events for all to authenticated
using (public.has_role(array['admin','staff']))
with check (public.has_role(array['admin','staff']));

create policy "calendar_coach_assigned_read" on public.calendar_events for select to authenticated
using (
  public.has_role(array['coach']) and (
    worker_id = public.current_worker_id()
    or exists (
      select 1 from public.calendar_event_workers cew
      where cew.event_id = calendar_events.id and cew.worker_id = public.current_worker_id()
    )
  )
);

create policy "calendar_guardian_visible_read" on public.calendar_events for select to authenticated
using (
  visibility = 'families' and (
    (source_type = 'manual' and (
      category_id is null or exists (
        select 1 from public.children c
        where c.category_id = calendar_events.category_id and public.is_guardian_of(c.id)
      )
    ))
    or (source_type = 'team' and exists (
      select 1 from public.children c
      where public.is_guardian_of(c.id) and (
        (calendar_events.team_id is not null and c.team_id = calendar_events.team_id)
        or (calendar_events.team_id is null and c.category_id = calendar_events.category_id)
      )
    ))
    or (source_type = 'campus' and exists (
      select 1 from public.campus_enrollments ce
      where ce.campus_id = calendar_events.source_id and ce.status <> 'cancelled'
        and public.is_guardian_of(ce.child_id)
    ))
    or (source_type = 'tournament' and exists (
      select 1 from public.tournament_players tp
      where tp.tournament_id = calendar_events.source_id and tp.status <> 'cancelled'
        and public.is_guardian_of(tp.child_id)
    ))
    or (source_type = 'tournament' and exists (
      select 1 from public.tournament_teams tt
      join public.children c on c.team_id = tt.team_id
      where tt.tournament_id = calendar_events.source_id and tt.status <> 'cancelled'
        and public.is_guardian_of(c.id)
    ))
  )
);

drop policy if exists "calendar_event_workers_manage" on public.calendar_event_workers;
drop policy if exists "calendar_event_workers_coach_read" on public.calendar_event_workers;
create policy "calendar_event_workers_manage" on public.calendar_event_workers for all to authenticated
using (public.has_role(array['admin','staff']))
with check (public.has_role(array['admin','staff']));
create policy "calendar_event_workers_coach_read" on public.calendar_event_workers for select to authenticated
using (worker_id = public.current_worker_id());

-- Attendance belongs to a concrete calendar session. This prevents two
-- training sessions on the same day from overwriting each other.
alter table public.training_sessions
  add column if not exists event_id uuid references public.calendar_events(id) on delete set null;
alter table public.training_sessions drop constraint if exists training_sessions_event_child_key;
alter table public.training_sessions add constraint training_sessions_event_child_key unique (event_id, child_id);
create index if not exists training_sessions_event_idx on public.training_sessions(event_id);

create or replace function public.can_manage_calendar_event(event_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['admin','staff']) or exists (
    select 1 from public.calendar_events ce
    where ce.id = event_uuid and (
      ce.worker_id = public.current_worker_id()
      or exists (
        select 1 from public.calendar_event_workers cew
        where cew.event_id = ce.id and cew.worker_id = public.current_worker_id()
      )
    )
  )
$$;
revoke all on function public.can_manage_calendar_event(uuid) from public;
grant execute on function public.can_manage_calendar_event(uuid) to authenticated;

drop policy if exists "sessions_admin_coach_all" on public.training_sessions;
drop policy if exists "Coaches can manage training sessions" on public.training_sessions;
create policy "sessions_operations_manage" on public.training_sessions for all to authenticated
using (
  public.has_role(array['admin','staff'])
  or public.is_coach_of(child_id)
  or (event_id is not null and public.can_manage_calendar_event(event_id))
)
with check (
  public.has_role(array['admin','staff'])
  or public.is_coach_of(child_id)
  or (event_id is not null and public.can_manage_calendar_event(event_id))
);

notify pgrst, 'reload schema';
