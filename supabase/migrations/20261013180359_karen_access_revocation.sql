-- Evaluate revocation from current database state, not stale JWT/email claims.
create or replace function public.has_role(allowed_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
   select 1 from public.profiles p where p.id=auth.uid() and p.role=any(allowed_roles)
 ) and not exists (
   select 1 from public.workers w where w.user_id=auth.uid() and w.access_enabled is not true
 );
$$;
create or replace function public.current_worker_id()
returns uuid language sql stable security definer set search_path = '' as $$
 select w.id from public.workers w
 where auth.uid() is not null and w.user_id=auth.uid() and w.access_enabled is true
 order by w.id limit 1;
$$;
create or replace function public.can_manage_calendar_event(event_uuid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select public.has_role(array['admin','staff']) or (
   public.has_role(array['coach']) and exists (
     select 1 from public.calendar_events ce where ce.id=event_uuid and (
       ce.worker_id=public.current_worker_id() or exists (
         select 1 from public.calendar_event_workers cew
         where cew.event_id=ce.id and cew.worker_id=public.current_worker_id()
       )
     )
   )
 );
$$;
revoke all on function public.has_role(text[]), public.current_worker_id(), public.can_manage_calendar_event(uuid) from public, anon;
grant execute on function public.has_role(text[]), public.current_worker_id(), public.can_manage_calendar_event(uuid) to authenticated, service_role;
drop policy if exists workers_staff_read on public.workers;
create policy workers_staff_read on public.workers for select to authenticated
using (public.has_role(array['staff']) or (public.has_role(array['coach']) and user_id=(select auth.uid())));
