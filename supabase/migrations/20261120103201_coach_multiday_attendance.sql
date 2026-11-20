-- Preserve existing attendance rows; allow one record per event/player/day.
alter table public.training_sessions drop constraint training_sessions_event_child_key;
alter table public.training_sessions add constraint training_sessions_event_child_date_key unique(event_id,child_id,session_date);
create or replace function private.guard_coach_attendance()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and private.active_coach() and (new.event_id,new.child_id,new.session_date) is distinct from (old.event_id,old.child_id,old.session_date) then raise exception 'No se puede trasladar una asistencia';end if;
 if new.event_id is not null and public.has_role(array['coach','admin','staff']) then
  perform pg_advisory_xact_lock(hashtextextended(new.event_id::text,71));
  if not exists(select 1 from public.get_session_players(new.event_id) p where p.id=new.child_id)
   or not exists(select 1 from public.calendar_events e where e.id=new.event_id
    and new.session_date between (e.start_date at time zone 'Europe/Madrid')::date and ((e.end_date-interval '1 microsecond') at time zone 'Europe/Madrid')::date)
  then raise exception 'El jugador o la fecha no corresponden a esta sesión';end if;
 end if;return new;
end $$;
notify pgrst,'reload schema';
