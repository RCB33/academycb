-- Scope follows both groups, dates and membership status. Historical rows are not backfilled.
create or replace function private.child_in_academy_team(child_uuid uuid,team_uuid uuid,on_date date)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.children c where c.id=child_uuid and c.archived_at is null and (
   exists(select 1 from public.academy_group_assignments ga join public.academy_memberships m on m.id=ga.membership_id
     where ga.child_id=c.id and ga.team_id=team_uuid and m.status in ('active','pending_payment') and on_date between m.start_date and m.end_date)
   or (c.team_id=team_uuid and not exists(select 1 from public.academy_group_assignments ga where ga.child_id=c.id and ga.team_id=team_uuid))
 ));
$$;
revoke all on function private.child_in_academy_team(uuid,uuid,date) from public,anon;
grant execute on function private.child_in_academy_team(uuid,uuid,date) to authenticated;

create or replace function public.is_coach_of(child_uuid uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.has_role(array['coach']) and exists(
  select 1 from public.teams t join public.workers w on w.id=t.coach_id
  where w.user_id=auth.uid() and w.access_enabled=true and t.status='active'
    and private.child_in_academy_team(child_uuid,t.id,(now() at time zone 'Europe/Madrid')::date)
 );
$$;
revoke all on function public.is_coach_of(uuid) from public,anon;
grant execute on function public.is_coach_of(uuid) to authenticated;

create policy academy_group_assignments_guardian_read on public.academy_group_assignments for select to authenticated using(public.is_guardian_of(child_id));
create policy academy_group_assignments_coach_read on public.academy_group_assignments for select to authenticated using(
 public.has_role(array['coach']) and exists(select 1 from public.teams t where t.id=team_id and t.coach_id=public.current_worker_id())
);
create or replace function private.guardian_has_academy_team(team_uuid uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.academy_group_assignments ga where ga.team_id=team_uuid and public.is_guardian_of(ga.child_id));
$$;
revoke all on function private.guardian_has_academy_team(uuid) from public,anon;
grant execute on function private.guardian_has_academy_team(uuid) to authenticated;
create policy teams_secondary_guardian_read on public.teams for select to authenticated using(private.guardian_has_academy_team(id));

-- A single minimal roster serves the screen, server action and database guard.
create or replace function public.get_session_players(event_uuid uuid)
returns table(id uuid,full_name text) language plpgsql stable security definer set search_path='' as $$
declare e public.calendar_events%rowtype;
begin
 if auth.uid() is null or not public.can_manage_calendar_event(event_uuid) then raise exception 'No tienes acceso a esta sesión'; end if;
 select * into e from public.calendar_events where calendar_events.id=event_uuid and status<>'cancelled';
 if not found then raise exception 'Sesión no disponible'; end if;
 return query select c.id,c.full_name from public.children c where c.archived_at is null and (
  (e.team_id is not null and private.child_in_academy_team(c.id,e.team_id,(e.start_date at time zone 'Europe/Madrid')::date)) or
  (e.team_id is null and e.category_id is not null and c.category_id=e.category_id)
 ) order by c.full_name;
end $$;
revoke all on function public.get_session_players(uuid) from public,anon;
grant execute on function public.get_session_players(uuid) to authenticated;

create or replace function private.guard_coach_attendance()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.event_id is not null and public.has_role(array['coach','admin','staff']) then
  if not exists(select 1 from public.get_session_players(new.event_id) p where p.id=new.child_id)
     or not exists(select 1 from public.calendar_events e where e.id=new.event_id and new.session_date=(e.start_date at time zone 'Europe/Madrid')::date)
  then raise exception 'El jugador o la fecha no corresponden a esta sesión asignada'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_coach_attendance() from public,anon,authenticated;

-- Team criteria take priority over broad category/general-event criteria.
drop policy calendar_guardian_visible_read on public.calendar_events;
create policy calendar_guardian_visible_read on public.calendar_events for select to authenticated using(
 visibility='families' and (
  (source_type in ('team','manual') and exists(select 1 from public.children c where public.is_guardian_of(c.id) and (
    (calendar_events.team_id is not null and private.child_in_academy_team(c.id,calendar_events.team_id,(calendar_events.start_date at time zone 'Europe/Madrid')::date)) or
    (calendar_events.team_id is null and (calendar_events.category_id=c.category_id or (source_type='manual' and calendar_events.category_id is null)))
  )))
  or (source_type='campus' and exists(select 1 from public.campus_enrollments ce where ce.campus_id=source_id and ce.status<>'cancelled' and public.is_guardian_of(ce.child_id)))
  or (source_type='tournament' and exists(select 1 from public.tournament_players tp where tp.tournament_id=source_id and tp.status<>'cancelled' and public.is_guardian_of(tp.child_id)))
  or (source_type='tournament' and exists(select 1 from public.tournament_teams tt join public.children c on c.team_id=tt.team_id where tt.tournament_id=source_id and tt.status<>'cancelled' and public.is_guardian_of(c.id)))
 )
);

-- Create missing dated sessions only for newly assigned groups. Never rewrite or remove existing events.
create or replace function private.ensure_academy_group_calendar()
returns trigger language plpgsql security definer set search_path='' as $$
declare t public.teams%rowtype; m public.academy_memberships%rowtype; dates date; times text[]; day_number integer;
begin
 select * into t from public.teams where id=new.team_id;
 select * into m from public.academy_memberships where id=new.membership_id;
 if t.public_offer is null or t.status<>'active' then return new; end if;
 day_number:=case t.public_offer->>'day' when 'Lunes' then 1 when 'Martes' then 2 when 'Miércoles' then 3 when 'Jueves' then 4 when 'Viernes' then 5 when 'Sábado' then 6 when 'Domingo' then 7 end;
 times:=regexp_match(translate(t.schedule,'–—','--'),'([0-9]{1,2}:[0-9]{2})\s*-\s*([0-9]{1,2}:[0-9]{2})');
 if day_number is null or times is null or times[2]::time<=times[1]::time then raise exception 'Revisa el día y horario del grupo antes de asignarlo'; end if;
 for dates in select generate_series(greatest(m.start_date,(now() at time zone 'Europe/Madrid')::date),m.end_date,'1 day')::date loop
  if extract(isodow from dates)::int=day_number then
   insert into public.calendar_events(title,description,start_date,end_date,color,is_all_day,worker_id,category_id,team_id,event_type,status,visibility,source_type,source_id,location)
   values('Entrenamiento · '||t.name,'Sesión del grupo de Academia',(dates+times[1]::time) at time zone 'Europe/Madrid',(dates+times[2]::time) at time zone 'Europe/Madrid',coalesce(t.color,'#22c55e'),false,t.coach_id,t.category_id,t.id,'training','confirmed','families','team',t.id,t.public_offer->>'location')
   on conflict (source_type,source_id,start_date) where source_type<>'manual' and source_id is not null do nothing;
  end if;
 end loop;
 return new;
end $$;
revoke all on function private.ensure_academy_group_calendar() from public,anon,authenticated;
create trigger academy_group_calendar after insert on public.academy_group_assignments for each row execute function private.ensure_academy_group_calendar();
