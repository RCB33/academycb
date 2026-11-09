-- Internal operational data is never exposed to families.
create table public.event_registration_operations (
 registration_id uuid primary key references public.event_registrations(id) on delete cascade,
 teams jsonb not null default '{}' check (jsonb_typeof(teams)='object'),
 internal_note text not null default '' check(length(internal_note)<=3000),
 contacted_at timestamptz,
 kit_status text not null default 'pending' check(kit_status in ('pending','ordered','ready','delivered','not_needed')),
 documents_checked boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.event_registration_operations enable row level security;
revoke all on public.event_registration_operations from anon,authenticated;
grant select on public.event_registration_operations to authenticated;
grant all on public.event_registration_operations to service_role;
create policy event_operations_admin_read on public.event_registration_operations for select to authenticated using ((select public.has_role(array['admin'])));

create function public.save_event_operations(registration uuid,actor uuid,changes jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.event_registrations%rowtype; patch jsonb; teams_value jsonb;
begin
 if not exists(select 1 from public.profiles where id=actor and role='admin') then raise exception 'No autorizado';end if;
 select * into r from public.event_registrations where id=registration for update;
 if not found then raise exception 'Inscripción no encontrada';end if;
 teams_value=coalesce(changes->'teams','{}');
 if jsonb_typeof(teams_value)<>'object' or exists(select 1 from jsonb_each_text(teams_value) x where not(x.key=any(coalesce(r.approved_tournaments,r.tournaments))) or length(x.value)>100) then raise exception 'Equipo o torneo no válido';end if;
 if coalesce(changes->>'kit_status','pending') not in ('pending','ordered','ready','delivered','not_needed') or length(coalesce(changes->>'internal_note',''))>3000 then raise exception 'Seguimiento no válido';end if;
 -- Never edit identity, consents, clothing charges or financial state here.
 patch=jsonb_build_object('phone',coalesce(changes->>'phone',r.details->>'phone'),'club',coalesce(changes->>'club',r.details->>'club'),'coach',coalesce(changes->>'coach',r.details->>'coach'));
 if length(patch->>'phone')>20 or length(patch->>'club')>120 or length(patch->>'coach')>120 then raise exception 'Datos demasiado largos';end if;
 update public.event_registrations set details=details||patch,updated_at=now() where id=registration;
 insert into public.event_registration_operations(registration_id,teams,internal_note,contacted_at,kit_status,documents_checked)
 values(registration,teams_value,coalesce(changes->>'internal_note',''),case when changes->>'contacted'='true' then now() else null end,coalesce(changes->>'kit_status','pending'),coalesce((changes->>'documents_checked')::boolean,false))
 on conflict(registration_id) do update set teams=excluded.teams,internal_note=excluded.internal_note,contacted_at=coalesce(excluded.contacted_at,public.event_registration_operations.contacted_at),kit_status=excluded.kit_status,documents_checked=excluded.documents_checked,updated_at=now();
 insert into public.event_registration_history(registration_id,actor_id,action,note) values(registration,actor,'operations_updated','Seguimiento interno actualizado. Equipos: '||teams_value::text||'. Equipación: '||coalesce(changes->>'kit_status','pending')||'. Documentos revisados: '||coalesce(changes->>'documents_checked','false')||'. Contacto registrado: '||coalesce(changes->>'contacted','false'));
end $$;
revoke all on function public.save_event_operations(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_event_operations(uuid,uuid,jsonb) to service_role;

create table public.campus_request_links (
 request_id uuid primary key references public.enrollment_requests(id),
 enrollment_id uuid not null references public.campus_enrollments(id),
 accepted_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index campus_request_enrollment_idx on public.campus_request_links(enrollment_id);
create index campus_request_actor_idx on public.campus_request_links(accepted_by);
alter table public.campus_request_links enable row level security;
revoke all on public.campus_request_links from anon,authenticated;
grant select,insert on public.campus_request_links to authenticated;
grant all on public.campus_request_links to service_role;
create policy campus_links_admin_read on public.campus_request_links for select to authenticated using ((select public.has_role(array['admin'])));
create policy campus_links_admin_insert on public.campus_request_links for insert to authenticated with check ((select public.has_role(array['admin'])) and accepted_by=(select auth.uid()));

create function public.accept_campus_request(request_uuid uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; c uuid; e uuid; matches integer; campus_status text;
begin
 if auth.uid() is null or not public.has_role(array['admin']) then raise exception 'No autorizado';end if;
 select * into r from public.enrollment_requests where id=request_uuid for update;
 if not found or r.service<>'campus' then raise exception 'Solicitud de campus no encontrada';end if;
 select enrollment_id into e from public.campus_request_links where request_id=request_uuid;
 if e is not null then return e;end if;
 if r.status in ('enrolled','lost') then raise exception 'Revisa esta solicitud antes de aceptarla: ya está cerrada';end if;
 select status into campus_status from public.campuses where id=r.activity_id for update;
 if not found or campus_status<>'published' then raise exception 'El campus no está abierto';end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(btrim(r.email)),46));
 c=r.linked_child_id;
 if c is null then
   select count(distinct ch.id) into matches from public.children ch join public.child_guardians cg on cg.child_id=ch.id join public.guardians g on g.id=cg.guardian_id where ch.archived_at is null and lower(btrim(ch.full_name))=lower(btrim(r.child_name)) and ch.birth_date=r.birth_date and lower(btrim(g.email))=lower(btrim(r.email));
   if matches>1 then raise exception 'Hay varias fichas coincidentes. Revisa los duplicados antes de aceptar';end if;
   select ch.id into c from public.children ch join public.child_guardians cg on cg.child_id=ch.id join public.guardians g on g.id=cg.guardian_id where ch.archived_at is null and lower(btrim(ch.full_name))=lower(btrim(r.child_name)) and ch.birth_date=r.birth_date and lower(btrim(g.email))=lower(btrim(r.email)) limit 1;
 end if;
 if c is null then c=public.convert_enrollment_request(request_uuid);
 else
   if not exists(select 1 from public.children ch join public.child_guardians cg on cg.child_id=ch.id join public.guardians g on g.id=cg.guardian_id where ch.id=c and ch.archived_at is null and lower(btrim(g.email))=lower(btrim(r.email))) then raise exception 'Revisa la relación familiar';end if;
   update public.enrollment_requests set status='enrolled',last_contact_at=now() where id=request_uuid;
 end if;
 select id into e from public.campus_enrollments where campus_id=r.activity_id and child_id=c;
 if e is not null and exists(select 1 from public.campus_enrollments where id=e and status='cancelled') then raise exception 'Ya existe una inscripción cancelada. Revísala antes de reactivarla';end if;
 if e is null then
   insert into public.campus_enrollments(campus_id,child_id,status,emergency_contact,emergency_phone,notes) values(r.activity_id,c,'pending_payment',r.guardian_name,r.phone,r.notes) returning id into e;
 end if;
 insert into public.campus_request_links(request_id,enrollment_id,accepted_by) values(request_uuid,e,auth.uid());
 return e;
end $$;
revoke all on function public.accept_campus_request(uuid) from public,anon;
grant execute on function public.accept_campus_request(uuid) to authenticated;
