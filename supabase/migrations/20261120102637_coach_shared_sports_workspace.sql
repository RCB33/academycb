-- Owner-authorized shared sporting workspace. No financial grants or enrollment changes.
create or replace function private.active_coach()
returns boolean language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and public.has_role(array['coach']) and public.current_worker_id() is not null;
$$;
revoke all on function private.active_coach() from public,anon;
grant execute on function private.active_coach() to authenticated,service_role;

create policy children_shared_coach_read on public.children for select to authenticated
using ((select private.active_coach()) and archived_at is null);
create policy teams_shared_coach_read on public.teams for select to authenticated using ((select private.active_coach()));
create policy calendar_shared_coach_read on public.calendar_events for select to authenticated using ((select private.active_coach()));
create policy assignments_shared_coach_read on public.academy_group_assignments for select to authenticated using ((select private.active_coach()));
create policy notices_shared_coach_read on public.team_notices for select to authenticated using ((select private.active_coach()));
create policy observations_shared_coach_read on public.coach_observations for select to authenticated using ((select private.active_coach()));
create policy observations_shared_coach_insert on public.coach_observations for insert to authenticated
with check ((select private.active_coach()) and author_id=(select auth.uid()) and exists(select 1 from public.children c where c.id=child_id and c.archived_at is null));
create policy metrics_shared_coach_read on public.child_metrics for select to authenticated using ((select private.active_coach()));
create policy metrics_shared_coach_insert on public.child_metrics for insert to authenticated
with check ((select private.active_coach()) and evaluated_by=(select auth.uid()) and exists(select 1 from public.children c where c.id=child_id and c.archived_at is null));
create policy metrics_shared_coach_update on public.child_metrics for update to authenticated
using ((select private.active_coach()))
with check ((select private.active_coach()) and evaluated_by=(select auth.uid()) and exists(select 1 from public.children c where c.id=child_id and c.archived_at is null));

create or replace function private.guard_evaluation_identity()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if private.active_coach() and (new.child_id,new.recorded_at) is distinct from (old.child_id,old.recorded_at) then
  raise exception 'No se puede trasladar una evaluación a otro jugador o fecha';
 end if;
 return new;
end $$;
revoke all on function private.guard_evaluation_identity() from public,anon,authenticated;
create trigger coach_evaluation_identity before update on public.child_metrics for each row execute function private.guard_evaluation_identity();

create table public.coach_session_roster (
 event_id uuid not null references public.calendar_events(id) on delete cascade,
 child_id uuid not null references public.children(id) on delete cascade,
 included boolean not null,
 updated_by uuid not null references public.profiles(id),
 updated_at timestamptz not null default now(),
 primary key(event_id,child_id)
);
create index coach_session_roster_child_idx on public.coach_session_roster(child_id);
create index coach_session_roster_author_idx on public.coach_session_roster(updated_by);
alter table public.coach_session_roster enable row level security;
revoke all on public.coach_session_roster from public,anon,authenticated;
grant select,insert,update on public.coach_session_roster to authenticated;
grant all on public.coach_session_roster to service_role;
create policy roster_sports_read on public.coach_session_roster for select to authenticated
using (public.has_role(array['admin','staff']) or (select private.active_coach()));
create policy roster_sports_insert on public.coach_session_roster for insert to authenticated
with check ((public.is_admin() or (select private.active_coach())) and updated_by=(select auth.uid()));
create policy roster_sports_update on public.coach_session_roster for update to authenticated
using (public.is_admin() or (select private.active_coach()))
with check ((public.is_admin() or (select private.active_coach())) and updated_by=(select auth.uid()));

create or replace function public.can_manage_calendar_event(event_uuid uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.has_role(array['admin','staff']) or private.active_coach())
 and exists(select 1 from public.calendar_events e where e.id=event_uuid);
$$;

-- Narrow existing definer RPC: only IDs/names, never billing or enrollment details.
create or replace function public.get_session_players(event_uuid uuid)
returns table(id uuid,full_name text) language plpgsql stable security definer set search_path='' as $$
declare e public.calendar_events%rowtype;
begin
 if auth.uid() is null or not public.can_manage_calendar_event(event_uuid) then raise exception 'No tienes acceso a esta sesión';end if;
 select * into e from public.calendar_events where calendar_events.id=event_uuid and status<>'cancelled';
 if not found then raise exception 'Sesión no disponible';end if;
 return query select c.id,c.full_name from public.children c
 left join public.coach_session_roster o on o.event_id=e.id and o.child_id=c.id
 where c.archived_at is null and coalesce(o.included,
  case
   when e.source_type='campus' then exists(select 1 from public.campus_enrollments ce where ce.child_id=c.id and ce.campus_id=e.source_id and ce.status<>'cancelled' and (e.team_id is null or c.team_id=e.team_id))
   when e.source_type='tournament' then
    exists(select 1 from public.tournament_players tp where tp.child_id=c.id and tp.tournament_id=e.source_id and tp.status<>'cancelled' and (e.team_id is null or tp.team_id=e.team_id))
    or exists(select 1 from public.tournament_teams tt where tt.team_id=c.team_id and tt.tournament_id=e.source_id and tt.status<>'cancelled' and (e.team_id is null or tt.team_id=e.team_id))
   when e.team_id is not null then private.child_in_academy_team(c.id,e.team_id,(e.start_date at time zone 'Europe/Madrid')::date)
   when e.category_id is not null then c.category_id=e.category_id
   else false
  end
 ) order by c.full_name;
end $$;

create or replace function private.guard_session_roster()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user='authenticated' and not (public.is_admin() or private.active_coach()) then raise exception 'No autorizado' using errcode='42501';end if;
 if tg_op='UPDATE' and (new.event_id,new.child_id) is distinct from (old.event_id,old.child_id) then raise exception 'La convocatoria no se puede trasladar';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.event_id::text,71));
 if not exists(select 1 from public.calendar_events e where e.id=new.event_id and e.status<>'cancelled') then raise exception 'Sesión no disponible';end if;
 if not exists(select 1 from public.children c where c.id=new.child_id and c.archived_at is null) then raise exception 'Jugador no disponible';end if;
 if not new.included and exists(select 1 from public.training_sessions s where s.event_id=new.event_id and s.child_id=new.child_id) then
  raise exception 'Este jugador ya tiene asistencia registrada. Se conserva su historial';
 end if;
 new.updated_at=now();return new;
end $$;
revoke all on function private.guard_session_roster() from public,anon,authenticated;
create trigger guard_session_roster before insert or update on public.coach_session_roster for each row execute function private.guard_session_roster();

create or replace function private.guard_coach_attendance()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and private.active_coach() and (new.event_id,new.child_id,new.session_date) is distinct from (old.event_id,old.child_id,old.session_date) then raise exception 'No se puede trasladar una asistencia';end if;
 if new.event_id is not null and public.has_role(array['coach','admin','staff']) then
  perform pg_advisory_xact_lock(hashtextextended(new.event_id::text,71));
  if not exists(select 1 from public.get_session_players(new.event_id) p where p.id=new.child_id)
   or not exists(select 1 from public.calendar_events e where e.id=new.event_id and new.session_date=(e.start_date at time zone 'Europe/Madrid')::date)
  then raise exception 'El jugador o la fecha no corresponden a esta sesión';end if;
 end if;return new;
end $$;
notify pgrst,'reload schema';
