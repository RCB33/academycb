-- Public enrolment is intentionally separate from commercial leads and general
-- contact messages. A request never creates a family, membership or payment
-- automatically: secretariat reviews capacity and the final conditions first.
create table if not exists public.enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  service text not null check (service in ('academy', 'campus', 'tournament')),
  activity_id uuid null,
  activity_name text not null,
  child_name text not null,
  birth_date date not null,
  guardian_name text not null,
  email text not null,
  phone text not null,
  notes text null,
  status text not null default 'new' check (status in ('new', 'contacted', 'interested', 'enrolled', 'lost')),
  last_contact_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists enrollment_requests_created_at_idx
  on public.enrollment_requests(created_at desc);
create index if not exists enrollment_requests_status_idx
  on public.enrollment_requests(status);

alter table public.enrollment_requests enable row level security;

create policy "enrollment_requests_public_insert" on public.enrollment_requests
  for insert to anon, authenticated
  with check (status = 'new');

create policy "enrollment_requests_admin_all" on public.enrollment_requests
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "enrollment_requests_marketing_read" on public.enrollment_requests
  for select to authenticated
  using (public.has_role(array['marketing']));

-- Public submissions also appear in the internal notification bell. This keeps
-- secretariat from relying on a manual refresh of the web requests screen.
create or replace function public.notify_enrollment_request_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, type, link_url)
  select
    id,
    'Nueva solicitud de inscripción',
    new.child_name || ' · ' || new.activity_name,
    'alert',
    '/admin/leads'
  from public.profiles
  where role in ('admin', 'marketing');

  return new;
end;
$$;

drop trigger if exists enrollment_request_notification on public.enrollment_requests;
create trigger enrollment_request_notification
  after insert on public.enrollment_requests
  for each row execute function public.notify_enrollment_request_received();

create or replace function public.update_enrollment_request_status(
  request_uuid uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(array['admin', 'marketing']) then
    raise exception 'No autorizado';
  end if;
  if next_status not in ('new', 'contacted', 'interested', 'lost') then
    raise exception 'Estado no válido';
  end if;

  update public.enrollment_requests
  set status = next_status,
      last_contact_at = case
        when next_status in ('contacted', 'interested') then now()
        else last_contact_at
      end
  where id = request_uuid;

  if not found then
    raise exception 'Solicitud de inscripción no encontrada';
  end if;
end;
$$;

revoke all on function public.update_enrollment_request_status(uuid, text) from public;
grant execute on function public.update_enrollment_request_status(uuid, text) to authenticated;

-- The final conversion is an administrator operation. It creates the family
-- atomically, marks the request as processed and deliberately leaves the
-- specific team/campus/tournament assignment to secretariat after capacity and
-- payment conditions have been reviewed.
create or replace function public.convert_enrollment_request(request_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.enrollment_requests%rowtype;
  child_uuid uuid;
  guardian_uuid uuid;
begin
  if not public.has_role(array['admin']) then
    raise exception 'No autorizado';
  end if;

  select * into request_row
  from public.enrollment_requests
  where id = request_uuid
  for update;

  if not found then
    raise exception 'Solicitud de inscripción no encontrada';
  end if;
  if request_row.status = 'enrolled' then
    raise exception 'Esta solicitud ya se ha convertido en ficha.';
  end if;

  insert into public.children (full_name, birth_year, birth_date)
  values (
    request_row.child_name,
    extract(year from request_row.birth_date)::integer,
    request_row.birth_date
  )
  returning id into child_uuid;

  select id into guardian_uuid
  from public.guardians
  where lower(email) = lower(request_row.email)
  order by created_at asc
  limit 1;

  if guardian_uuid is null then
    insert into public.guardians (full_name, email, phone)
    values (request_row.guardian_name, request_row.email, request_row.phone)
    returning id into guardian_uuid;
  end if;

  insert into public.child_guardians (child_id, guardian_id, relationship, is_primary)
  values (child_uuid, guardian_uuid, 'Tutor', true);

  update public.enrollment_requests
  set status = 'enrolled', last_contact_at = now()
  where id = request_uuid;

  return child_uuid;
end;
$$;

revoke all on function public.convert_enrollment_request(uuid) from public;
grant execute on function public.convert_enrollment_request(uuid) to authenticated;
