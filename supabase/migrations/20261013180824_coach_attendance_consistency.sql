create or replace function private.guard_coach_attendance()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if public.has_role(array['coach']) and new.event_id is not null then
   if not public.can_manage_calendar_event(new.event_id) or not exists (
     select 1 from public.calendar_events e join public.children c on c.id=new.child_id
     where e.id=new.event_id and (
       (e.team_id is not null and c.team_id=e.team_id) or
       (e.team_id is null and e.category_id is not null and c.category_id=e.category_id)
     ) and new.session_date=(e.start_date at time zone 'UTC')::date
   ) then raise exception 'El jugador o la fecha no corresponden a esta sesión asignada';end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_coach_attendance() from public,anon,authenticated;
create trigger coach_attendance_consistency before insert or update on public.training_sessions
for each row execute function private.guard_coach_attendance();
