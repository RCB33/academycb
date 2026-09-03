-- Accept both the compact schedule saved by the team editor ("L,J 18:00-19:30")
-- and human-readable Spanish schedules ("Lunes y jueves · 18:00–19:30").
-- Invalid active schedules no longer delete previously generated future events.
create or replace function public.sync_team_calendar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cursor_date date;
  day_code text;
  day_codes text[] := array[]::text[];
  day_part text;
  shorthand_days text;
  normalized_schedule text;
  time_matches text[];
  starts_at time;
  ends_at time;
  event_start timestamptz;
  event_end timestamptz;
  generated_event_id uuid;
  position_index integer;
begin
  if tg_op = 'DELETE' then
    delete from public.calendar_events where source_type = 'team' and source_id = old.id;
    return old;
  end if;

  if new.status <> 'active' or new.schedule is null or btrim(new.schedule) = '' then
    delete from public.calendar_events
    where source_type = 'team' and source_id = new.id and start_date::date >= current_date;
    return new;
  end if;

  normalized_schedule := lower(translate(new.schedule, 'áéíóúüñ–—·', 'aeiouun---'));
  normalized_schedule := regexp_replace(normalized_schedule, '\s+a\s+', '-', 'g');
  time_matches := regexp_match(normalized_schedule, '([0-2]?[0-9]:[0-5][0-9])\s*-\s*([0-2]?[0-9]:[0-5][0-9])');

  if time_matches is null then
    return new;
  end if;

  starts_at := time_matches[1]::time;
  ends_at := time_matches[2]::time;
  if ends_at <= starts_at then
    return new;
  end if;

  day_part := split_part(normalized_schedule, time_matches[1], 1);
  if position('lunes' in day_part) > 0 then day_codes := array_append(day_codes, 'L'); end if;
  if position('martes' in day_part) > 0 then day_codes := array_append(day_codes, 'M'); end if;
  if position('miercoles' in day_part) > 0 then day_codes := array_append(day_codes, 'X'); end if;
  if position('jueves' in day_part) > 0 then day_codes := array_append(day_codes, 'J'); end if;
  if position('viernes' in day_part) > 0 then day_codes := array_append(day_codes, 'V'); end if;
  if position('sabado' in day_part) > 0 then day_codes := array_append(day_codes, 'S'); end if;
  if position('domingo' in day_part) > 0 then day_codes := array_append(day_codes, 'D'); end if;

  if cardinality(day_codes) = 0 then
    shorthand_days := regexp_replace(upper(day_part), '[^LMXJVSD]+', '', 'g');
    if shorthand_days is not null and shorthand_days <> '' then
      for position_index in 1..length(shorthand_days) loop
        day_code := substring(shorthand_days from position_index for 1);
        if not day_code = any(day_codes) then
          day_codes := array_append(day_codes, day_code);
        end if;
      end loop;
    end if;
  end if;

  if cardinality(day_codes) = 0 then
    return new;
  end if;

  delete from public.calendar_events
  where source_type = 'team' and source_id = new.id and start_date::date >= current_date;

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

revoke execute on function public.sync_team_calendar() from public, anon, authenticated;

-- Rebuild all future team sessions with the tolerant parser.
update public.teams set schedule = schedule where schedule is not null;
