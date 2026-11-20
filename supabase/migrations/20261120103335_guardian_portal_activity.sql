-- Actual visible portal visits, separate from Auth activation or password recovery.
create table public.guardian_portal_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint portal_activity_dates check (last_seen_at >= first_seen_at)
);
alter table public.guardian_portal_activity enable row level security;
revoke all on public.guardian_portal_activity from public, anon, authenticated;
grant select on public.guardian_portal_activity to authenticated;
grant all on public.guardian_portal_activity to service_role;
create policy "Administrators read portal visits" on public.guardian_portal_activity
  for select to authenticated using (public.has_role(array['admin']::text[]));

-- Only the server may record the verified session user. No client-provided timestamps.
create function public.record_guardian_portal_visit(p_user_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles p join public.guardians g on g.user_id = p.id
    where p.id = p_user_id and p.role = 'guardian'
  ) then
    raise exception 'Family account required' using errcode = '42501';
  end if;
  insert into public.guardian_portal_activity(user_id) values (p_user_id)
  on conflict (user_id) do update set last_seen_at = greatest(now(), guardian_portal_activity.last_seen_at)
  where guardian_portal_activity.last_seen_at < now() - interval '1 minute';
end;
$$;
revoke all on function public.record_guardian_portal_visit(uuid) from public, anon, authenticated;
grant execute on function public.record_guardian_portal_visit(uuid) to service_role;
comment on table public.guardian_portal_activity is 'Visible authenticated family portal visits since deployment; no historical Auth backfill.';
