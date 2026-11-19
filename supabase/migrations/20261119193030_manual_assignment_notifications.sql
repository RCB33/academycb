-- Only future manual assignments queue confirmations; no historical resend.
alter table public.registration_email_outbox drop constraint registration_email_outbox_source_type_check;
alter table public.registration_email_outbox add constraint registration_email_outbox_source_type_check check(source_type in ('enrollment','event','membership'));
create or replace function private.queue_manual_assignment_email()
returns trigger language plpgsql security definer set search_path='' as $$
declare destination text; matches integer;
begin
 if new.plan_snapshot->>'manual_v2' is distinct from 'true' then return new; end if;
 select count(*),min(lower(trim(g.email))) into matches,destination from public.child_guardians cg join public.guardians g on g.id=cg.guardian_id where cg.child_id=new.child_id and cg.is_primary=true and nullif(trim(g.email),'') is not null;
 if matches=1 then insert into public.registration_email_outbox(source_type,source_id,event_kind,recipient) values('membership',new.id,'reviewed',destination) on conflict do nothing; end if;
 return new;
end $$;
revoke all on function private.queue_manual_assignment_email() from public,anon,authenticated;
create trigger manual_assignment_email after insert on public.academy_memberships for each row execute function private.queue_manual_assignment_email();
