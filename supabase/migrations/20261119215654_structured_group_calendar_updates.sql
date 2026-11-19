-- Structured public groups use their explicit day and their accepted membership dates.
-- Installing this trigger does not rebuild any existing calendar.
create function private.sync_structured_group_calendar()
returns trigger language plpgsql security definer set search_path='' as $$
declare day_number int; times text[]; d date; event_uuid uuid;
begin
 if tg_op='UPDATE' and (new.name,new.schedule,new.status,new.coach_id,new.category_id,new.color,new.public_offer->>'day',new.public_offer->>'location')
 is not distinct from (old.name,old.schedule,old.status,old.coach_id,old.category_id,old.color,old.public_offer->>'day',old.public_offer->>'location') then return new;end if;
 if not exists(select 1 from public.academy_group_assignments where team_id=new.id) then
  if exists(select 1 from public.calendar_events where source_type='team' and source_id=new.id and start_date>now()) then
   raise exception 'Este grupo tiene una agenda anterior sin matrículas vinculadas. Revisa esas sesiones antes de cambiar el horario';
  end if;
  return new;
 end if;
 if exists(select 1 from public.calendar_events e where e.source_type='team' and e.source_id=new.id and e.start_date>now() and (
   exists(select 1 from public.training_sessions s where s.event_id=e.id) or e.status<>'confirmed'
   or coalesce(e.description,'')<>'Sesión del grupo de Academia'
 )) then raise exception 'Hay sesiones futuras con asistencia o cambios manuales. Revísalas antes de cambiar el grupo';end if;
 if new.status='active' then
  day_number:=case new.public_offer->>'day' when 'Lunes' then 1 when 'Martes' then 2 when 'Miércoles' then 3 when 'Jueves' then 4 when 'Viernes' then 5 when 'Sábado' then 6 when 'Domingo' then 7 end;
  times:=regexp_match(translate(new.schedule,'–—','--'),'([0-9]{1,2}:[0-9]{2})\s*-\s*([0-9]{1,2}:[0-9]{2})');
  if day_number is null or times is null or times[2]::time<=times[1]::time then raise exception 'Revisa el día y horario del grupo';end if;
 end if;
 delete from public.calendar_events where source_type='team' and source_id=new.id and start_date>now();
 if new.status<>'active' then return new;end if;
 for d in
  select distinct dates::date from public.academy_group_assignments ga
  join public.academy_memberships m on m.id=ga.membership_id
  join public.children c on c.id=ga.child_id and c.archived_at is null
  cross join lateral generate_series(greatest(m.start_date,(now() at time zone 'Europe/Madrid')::date),m.end_date,'1 day') dates
  where ga.team_id=new.id and m.status in ('active','pending_payment')
 loop
  if extract(isodow from d)::int=day_number and (d+times[1]::time) at time zone 'Europe/Madrid'>now() then
   insert into public.calendar_events(title,description,start_date,end_date,color,is_all_day,worker_id,category_id,team_id,event_type,status,visibility,source_type,source_id,location)
   values('Entrenamiento · '||new.name,'Sesión del grupo de Academia',(d+times[1]::time) at time zone 'Europe/Madrid',(d+times[2]::time) at time zone 'Europe/Madrid',coalesce(new.color,'#22c55e'),false,new.coach_id,new.category_id,new.id,'training','confirmed','families','team',new.id,new.public_offer->>'location')
   returning id into event_uuid;
   if new.coach_id is not null then insert into public.calendar_event_workers(event_id,worker_id) values(event_uuid,new.coach_id) on conflict do nothing;end if;
  end if;
 end loop;
 return new;
end$$;
revoke all on function private.sync_structured_group_calendar() from public,anon,authenticated;
drop trigger team_calendar_sync on public.teams;
create trigger team_calendar_sync after insert or update of name,category_id,coach_id,schedule,status,color on public.teams for each row when(new.public_offer is null) execute function public.sync_team_calendar();
create trigger legacy_team_calendar_delete after delete on public.teams for each row when(old.public_offer is null) execute function public.sync_team_calendar();
create trigger structured_team_calendar_sync after insert or update of name,category_id,coach_id,schedule,status,color,public_offer on public.teams for each row when(new.public_offer is not null) execute function private.sync_structured_group_calendar();
