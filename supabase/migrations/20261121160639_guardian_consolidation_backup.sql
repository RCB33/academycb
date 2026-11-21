-- Private recovery evidence for reviewed contact consolidations; never exposed to the Data API.
create table private.guardian_consolidation_backup (
 removed_guardian_id uuid primary key,
 kept_guardian_id uuid not null,
 removed_guardian jsonb not null,
 kept_guardian_before jsonb not null,
 removed_links jsonb not null,
 kept_links_before jsonb not null,
 recorded_at timestamptz not null default now(),
 reason text not null
);
alter table private.guardian_consolidation_backup enable row level security;
revoke all on private.guardian_consolidation_backup from public,anon,authenticated,service_role;
comment on table private.guardian_consolidation_backup is 'Restricted administrative recovery backup. No client grants or RLS policies by design.';
