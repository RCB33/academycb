-- Applied through the connected project; filename matches remote migration history.
-- No backfill: existing families and payments are deliberately untouched.
create table public.registration_email_outbox (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('enrollment','event')),
  source_id uuid not null,
  event_kind text not null,
  recipient text not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  last_error text,
  provider_id text,
  created_at timestamptz not null default now(),
  attempted_at timestamptz,
  first_attempted_at timestamptz,
  sent_at timestamptz,
  unique (source_type,source_id,event_kind)
);
alter table public.registration_email_outbox enable row level security;
revoke all on public.registration_email_outbox from anon, authenticated;
grant select on public.registration_email_outbox to authenticated;
grant all on public.registration_email_outbox to service_role;
create policy admin_read_registration_email on public.registration_email_outbox
  for select to authenticated using ((select public.has_role(array['admin'])));
create index registration_email_source on public.registration_email_outbox(source_type,source_id);
create index registration_email_recipient on public.registration_email_outbox(recipient,attempted_at);

create function private.queue_registration_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare destination text; kind text; source text;
begin
  if TG_TABLE_NAME='enrollment_requests' then
    source='enrollment'; destination=lower(new.email);
    if TG_OP='INSERT' then kind='received';
    elsif new.status is distinct from old.status and new.status='enrolled' then kind='reviewed';
    else return new; end if;
  elsif TG_TABLE_NAME='event_registrations' then
    source='event';
    select email into destination from auth.users where id=new.user_id and email_confirmed_at is not null;
    if TG_OP='INSERT' then kind='received';
    elsif new.status is distinct from old.status and new.status in ('awaiting_payment','confirmed','cancelled') then kind=new.status;
    else return new; end if;
  else return new; end if;
  if destination is not null and destination<>'' then
    insert into public.registration_email_outbox(source_type,source_id,event_kind,recipient)
      values(source,new.id,kind,destination) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.queue_registration_email() from public,anon,authenticated;
create trigger registration_email_enrollment after insert or update of status on public.enrollment_requests
  for each row execute function private.queue_registration_email();
create trigger registration_email_event after insert or update of status on public.event_registrations
  for each row execute function private.queue_registration_email();

-- Service-only claim. A lease + provider idempotency prevents concurrent retries.
create function public.claim_registration_email(message_id uuid)
returns setof public.registration_email_outbox language plpgsql set search_path='' as $$
declare target public.registration_email_outbox;
begin
  select * into target from public.registration_email_outbox where id=message_id for update skip locked;
  if not found or target.status='sent' or target.attempts>=5 then return; end if;
  -- Resend retains idempotency keys for 24h. Never blindly retry beyond that window.
  if target.first_attempted_at<now()-interval '23 hours' then return; end if;
  if target.attempted_at>now()-interval '5 minutes' then return; end if;
  -- Serialize sends per address, including simultaneous submissions.
  perform pg_advisory_xact_lock(hashtextextended(target.recipient,7183));
  if (select count(*) from public.registration_email_outbox
      where recipient=target.recipient and attempted_at>now()-interval '1 hour')>=3 then return; end if;
  return query update public.registration_email_outbox
    set status='sending',attempts=attempts+1,attempted_at=now(),first_attempted_at=coalesce(first_attempted_at,now()),last_error=null
    where id=message_id returning *;
end $$;
revoke all on function public.claim_registration_email(uuid) from public,anon,authenticated;
grant execute on function public.claim_registration_email(uuid) to service_role;
