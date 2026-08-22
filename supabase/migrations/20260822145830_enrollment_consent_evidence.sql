-- Evidence for the two mandatory acknowledgements in the public enrolment
-- form. Existing requests are intentionally left as NULL: we must not imply
-- that a historical request accepted a version that did not exist yet.
alter table public.enrollment_requests
  add column if not exists privacy_accepted_at timestamptz null,
  add column if not exists privacy_policy_version text null,
  add column if not exists terms_accepted_at timestamptz null,
  add column if not exists terms_version text null,
  add column if not exists consent_source text null;

comment on column public.enrollment_requests.privacy_accepted_at is
  'Server timestamp for the privacy-policy acknowledgement made during public enrolment.';
comment on column public.enrollment_requests.terms_accepted_at is
  'Server timestamp for the general-terms acknowledgement made during public enrolment.';

-- Public inserts never choose their own audit timestamp or document version.
-- The application validates the required checkboxes before inserting; this
-- trigger gives the accepted request an authoritative server-side record.
create or replace function public.stamp_enrollment_consent_evidence()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.privacy_accepted_at := now();
  new.privacy_policy_version := '2026.08';
  new.terms_accepted_at := now();
  new.terms_version := '2026.08';
  new.consent_source := 'public_enrollment';
  return new;
end;
$$;

drop trigger if exists enrollment_consent_evidence on public.enrollment_requests;
create trigger enrollment_consent_evidence
  before insert on public.enrollment_requests
  for each row execute function public.stamp_enrollment_consent_evidence();
