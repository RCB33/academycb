-- Server-only prices apply to Campus as well as Academy. Unchanged snapshots
-- must not prevent an otherwise authorized status/contact update.
create or replace function private.protect_offering_snapshot() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('service_role','postgres') or public.is_admin() is true then return new; end if;
 if tg_op='INSERT' then
  if new.academy_details is not null or new.campus_details is not null or new.accepted_child_id is not null or new.submitted_by is not null then
   raise exception 'Envia la solicitud mediante el formulario público';
  end if;
 elsif new.academy_details is distinct from old.academy_details
    or new.campus_details is distinct from old.campus_details
    or new.accepted_child_id is distinct from old.accepted_child_id
    or new.submitted_by is distinct from old.submitted_by then
  raise exception 'Las condiciones verificadas solo se modifican desde administración';
 end if;
 return new;
end $$;
revoke all on function private.protect_offering_snapshot() from public,anon,authenticated;
