-- Worker accounts are explicit and revocable. A worker record can exist without
-- login access, while linked accounts retain their role and audit history.
alter table public.workers
  add column if not exists access_enabled boolean;

update public.workers
set access_enabled = (user_id is not null)
where access_enabled is null;

alter table public.workers
  alter column access_enabled set default false,
  alter column access_enabled set not null;

create index if not exists workers_active_user_idx
  on public.workers(user_id)
  where user_id is not null and access_enabled;

-- Marketing only receives the commercial inbox. It cannot convert leads into
-- students or access the wider CRM; conversion remains an admin server action.
drop policy if exists "leads_marketing_read" on public.leads;
create policy "leads_marketing_read"
  on public.leads for select to authenticated
  using (public.has_role(array['marketing']));

drop policy if exists "leads_marketing_update" on public.leads;

create or replace function public.update_lead_status_for_marketing(
  lead_uuid uuid,
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

  update public.leads
  set status = next_status,
      last_contact_at = case
        when next_status in ('contacted', 'interested') then now()
        else last_contact_at
      end
  where id = lead_uuid;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
end;
$$;

revoke all on function public.update_lead_status_for_marketing(uuid, text) from public;
grant execute on function public.update_lead_status_for_marketing(uuid, text) to authenticated;

drop policy if exists "contact_messages_marketing_read" on public.contact_messages;
create policy "contact_messages_marketing_read"
  on public.contact_messages for select to authenticated
  using (public.has_role(array['marketing']));

drop policy if exists "contact_messages_marketing_update" on public.contact_messages;
