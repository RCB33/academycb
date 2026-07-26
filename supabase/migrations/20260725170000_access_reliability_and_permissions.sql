-- Reliability and least-privilege hardening for worker access and calendar edits.

create table if not exists public.worker_access_audit_log (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid,
  user_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null check (action in (
    'invited',
    'reactivated',
    'updated',
    'revoked',
    'email_resent',
    'deleted',
    'auth_cleanup_failed'
  )),
  previous_role text,
  new_role text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.worker_access_audit_log enable row level security;

create index if not exists worker_access_audit_created_idx
  on public.worker_access_audit_log(created_at desc);

create index if not exists worker_access_audit_worker_idx
  on public.worker_access_audit_log(worker_id, created_at desc);

drop policy if exists "worker_access_audit_admin_read" on public.worker_access_audit_log;
create policy "worker_access_audit_admin_read"
  on public.worker_access_audit_log for select to authenticated
  using (public.is_admin());

-- Updating an event and its assigned workers is one database transaction.
-- If any worker assignment fails, PostgreSQL rolls the whole operation back.
create or replace function public.update_manual_calendar_event(
  event_uuid uuid,
  event_title text,
  event_description text,
  event_start timestamptz,
  event_end timestamptz,
  event_color text,
  event_all_day boolean,
  event_worker_ids uuid[],
  event_category_id uuid,
  event_team_id uuid,
  event_location text,
  event_type_value text,
  event_status_value text,
  event_visibility_value text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.has_role(array['admin', 'staff']) then
    raise exception 'No autorizado';
  end if;

  if coalesce(cardinality(event_worker_ids), 0) > 20 then
    raise exception 'Demasiados trabajadores asignados';
  end if;

  update public.calendar_events
  set title = event_title,
      description = nullif(event_description, ''),
      start_date = event_start,
      end_date = event_end,
      color = event_color,
      is_all_day = event_all_day,
      worker_id = event_worker_ids[1],
      category_id = event_category_id,
      team_id = event_team_id,
      location = event_location,
      event_type = event_type_value,
      status = event_status_value,
      visibility = event_visibility_value,
      updated_at = now()
  where id = event_uuid
    and source_type = 'manual';

  if not found then
    raise exception 'Evento manual no encontrado';
  end if;

  delete from public.calendar_event_workers
  where event_id = event_uuid;

  insert into public.calendar_event_workers(event_id, worker_id)
  select event_uuid, worker_uuid
  from unnest(coalesce(event_worker_ids, array[]::uuid[])) as worker_uuid;
end;
$$;

revoke all on function public.update_manual_calendar_event(
  uuid, text, text, timestamptz, timestamptz, text, boolean, uuid[],
  uuid, uuid, text, text, text, text
) from public;

grant execute on function public.update_manual_calendar_event(
  uuid, text, text, timestamptz, timestamptz, text, boolean, uuid[],
  uuid, uuid, text, text, text, text
) to authenticated;

-- The UI exposes staff only to calendar operations and coaches only to their
-- assigned sessions. Player development and media administration remain admin.
drop policy if exists "metrics_admin_coach_all" on public.child_metrics;
drop policy if exists "metrics_admin_all" on public.child_metrics;
create policy "metrics_admin_all" on public.child_metrics for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "notes_admin_coach_all" on public.coach_notes;
drop policy if exists "notes_admin_all" on public.coach_notes;
create policy "notes_admin_all" on public.coach_notes for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "child_achievements_admin_coach_all" on public.child_achievements;
drop policy if exists "child_achievements_admin_all" on public.child_achievements;
create policy "child_achievements_admin_all" on public.child_achievements for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "media_staff_all" on public.media_assets;
drop policy if exists "media_admin_all" on public.media_assets;
create policy "media_admin_all" on public.media_assets for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sessions_admin_coach_all" on public.training_sessions;
drop policy if exists "sessions_admin_assigned_coach_all" on public.training_sessions;
create policy "sessions_admin_assigned_coach_all" on public.training_sessions for all to authenticated
using (public.is_admin() or public.is_coach_of(child_id))
with check (public.is_admin() or public.is_coach_of(child_id));

drop policy if exists "academy_videos_staff_write" on storage.objects;
drop policy if exists "academy_videos_admin_write" on storage.objects;
create policy "academy_videos_admin_write" on storage.objects for all to authenticated
using (bucket_id = 'videos' and public.is_admin())
with check (bucket_id = 'videos' and public.is_admin());

drop policy if exists "academy_gallery_staff_all" on storage.objects;
drop policy if exists "academy_gallery_admin_all" on storage.objects;
create policy "academy_gallery_admin_all" on storage.objects for all to authenticated
using (bucket_id = 'gallery' and public.is_admin())
with check (bucket_id = 'gallery' and public.is_admin());

notify pgrst, 'reload schema';
