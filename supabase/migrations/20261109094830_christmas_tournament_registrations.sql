-- New registrations are isolated from historical payments and team finance triggers.
create table public.event_campaign_settings (
 id text primary key check(id='christmas-2026'), bank_holder text,
 iban text not null default 'ES0621006176920200072768'
);
alter table public.event_campaign_settings enable row level security;
grant select on public.event_campaign_settings to authenticated;
grant all on public.event_campaign_settings to service_role;
create policy event_campaign_read on public.event_campaign_settings for select to authenticated using(true);
insert into public.event_campaign_settings(id,bank_holder) values('christmas-2026','Manuel Matias Martínez');
create table public.event_registrations (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 user_id uuid not null references auth.users(id), child_id uuid not null references public.children(id),
 campaign text not null default 'christmas-2026' check(campaign='christmas-2026'),
 details jsonb not null, tournaments text[] not null,
 status text not null default 'requested' check(status in ('requested','awaiting_payment','proof_review','confirmed','cancelled')),
 quoted_amount numeric(10,2) not null check(quoted_amount>=0), approved_amount numeric(10,2),
 approved_tournaments text[], admin_note text not null default '', due_date date,
 payment_id uuid references public.payments(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint approved_amount_positive check(approved_amount is null or approved_amount>0)
);
create unique index event_registration_active_child on public.event_registrations(child_id,campaign) where status<>'cancelled';
create index event_registration_owner on public.event_registrations(user_id,created_at desc);
create index event_registration_status on public.event_registrations(status,created_at desc);
create index event_registration_payment on public.event_registrations(payment_id);
create table public.event_registration_files (
 id uuid primary key default gen_random_uuid(), registration_id uuid not null references public.event_registrations(id),
 kind text not null check(kind in ('proof','federation','identity','health')),
 path text not null unique, filename text not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index event_files_registration on public.event_registration_files(registration_id);
create index event_files_creator on public.event_registration_files(created_by);
create table public.event_registration_history (
 id uuid primary key default gen_random_uuid(), registration_id uuid not null references public.event_registrations(id),
 actor_id uuid not null references auth.users(id), action text not null, note text not null default '', created_at timestamptz not null default now()
);
create index event_history_registration on public.event_registration_history(registration_id,created_at);
create index event_history_actor on public.event_registration_history(actor_id);
alter table public.event_registrations enable row level security;
alter table public.event_registration_files enable row level security;
alter table public.event_registration_history enable row level security;
revoke all on public.event_registrations,public.event_registration_files,public.event_registration_history from anon,authenticated;
grant select on public.event_registrations,public.event_registration_files,public.event_registration_history to authenticated;
grant all on public.event_registrations,public.event_registration_files,public.event_registration_history to service_role;
create policy event_owner_read on public.event_registrations for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy event_file_read on public.event_registration_files for select to authenticated using(exists(select 1 from public.event_registrations r where r.id=registration_id and (r.user_id=(select auth.uid()) or public.is_admin())));
create policy event_history_admin_read on public.event_registration_history for select to authenticated using(public.is_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('event-documents','event-documents',false,5242880,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing;
-- Storage has no client policies: authenticated server actions issue short-lived signed URLs after authorization.

create function public.submit_event_registration(actor uuid, payload jsonb, quote numeric)
returns uuid language plpgsql security invoker set search_path='' as $$
declare email_value text; g uuid; c uuid; r uuid; matches integer;
begin
 select lower(btrim(email)) into email_value from auth.users where id=actor and email_confirmed_at is not null;
 if email_value is null then raise exception 'Verifica tu correo antes de inscribirte'; end if;
 perform pg_advisory_xact_lock(hashtextextended(email_value,0));
 select id into r from public.event_registrations where request_id=(payload->>'request_id')::uuid and user_id=actor;
 if r is not null then return r; end if;
 select count(*),min(id::text)::uuid into matches,g from public.guardians where user_id=actor;
 if matches>1 then raise exception 'Contacta con Academy para revisar tu ficha familiar'; end if;
 if g is null then
   select count(*),min(id::text)::uuid into matches,g from public.guardians where lower(btrim(email))=email_value;
   if matches>1 then raise exception 'Contacta con Academy para revisar tu ficha familiar'; end if;
   if g is not null then
     if exists(select 1 from public.guardians where id=g and user_id is not null and user_id<>actor) then raise exception 'Contacta con Academy para revisar tu acceso'; end if;
     update public.guardians set user_id=actor where id=g and user_id is null;
   else
     insert into public.guardians(user_id,full_name,email,phone) values(actor,payload->>'guardian_name',email_value,payload->>'phone') returning id into g;
   end if;
 end if;
 c=nullif(payload->>'child_id','')::uuid;
 if c is not null then
   if not exists(select 1 from public.child_guardians cg join public.guardians gu on gu.id=cg.guardian_id join public.children ch on ch.id=cg.child_id where cg.child_id=c and gu.user_id=actor and ch.archived_at is null) then raise exception 'El jugador no pertenece a tu cuenta'; end if;
 else
   select ch.id into c from public.children ch join public.child_guardians cg on cg.child_id=ch.id where cg.guardian_id=g and lower(btrim(ch.full_name))=lower(btrim(payload->>'child_name')) and ch.birth_date=(payload->>'birth_date')::date and ch.archived_at is null limit 1;
   if c is null then
     insert into public.children(full_name,birth_date,birth_year,notes) values(payload->>'child_name',(payload->>'birth_date')::date,extract(year from (payload->>'birth_date')::date),'Alta de participante externo en torneos. Sin matrícula ni plan Academy.') returning id into c;
     insert into public.child_guardians(child_id,guardian_id,relationship,is_primary) values(c,g,'Tutor',true);
   end if;
 end if;
 if exists(select 1 from public.event_registrations where child_id=c and campaign='christmas-2026' and status<>'cancelled') then raise exception 'Este jugador ya tiene una solicitud. Contacta con Academy para modificarla.'; end if;
 insert into public.event_registrations(request_id,user_id,child_id,details,tournaments,quoted_amount)
 values((payload->>'request_id')::uuid,actor,c,payload || jsonb_build_object('email',email_value,'consent_version','christmas-2026-v1','accepted_at',now()),array(select jsonb_array_elements_text(payload->'tournaments')),quote) returning id into r;
 insert into public.event_registration_history(registration_id,actor_id,action) values(r,actor,'requested');
 insert into public.notifications(user_id,title,message,type,link_url)
 select id,'Nueva inscripción de Navidad','Hay una solicitud de jugador pendiente de revisión.','info','/admin/torneos/inscripciones' from public.profiles where role='admin';
 return r;
end $$;
revoke all on function public.submit_event_registration(uuid,jsonb,numeric) from public,anon,authenticated;
grant execute on function public.submit_event_registration(uuid,jsonb,numeric) to service_role;

create function public.review_event_registration(registration uuid, actor uuid, operation text, selections text[], amount numeric, deadline date, note text)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.event_registrations%rowtype; p uuid;
begin
 if not exists(select 1 from public.profiles where id=actor and role='admin') then raise exception 'No autorizado'; end if;
 select * into r from public.event_registrations where id=registration for update;
 if not found then raise exception 'Solicitud no encontrada'; end if;
 if operation='approve' then
   if not exists(select 1 from public.event_campaign_settings where id='christmas-2026' and length(btrim(bank_holder))>=3) then raise exception 'Configura primero el titular de la cuenta de transferencia'; end if;
   if r.status not in ('requested','awaiting_payment') or exists(select 1 from public.event_registration_files where registration_id=r.id and kind='proof') then raise exception 'No se puede cambiar una solicitud con justificante o ya cerrada'; end if;
   if amount is null or amount<=0 or deadline is null or deadline<current_date or cardinality(selections)<1 or not selections<@r.tournaments then raise exception 'Revisa torneos, importe y fecha límite'; end if;
   update public.event_registrations set status='awaiting_payment',approved_amount=amount,approved_tournaments=selections,due_date=deadline,admin_note=note,updated_at=now() where id=r.id;
 elsif operation='confirm' then
   if r.status='confirmed' then return; end if;
   if r.status<>'proof_review' or r.approved_amount is null then raise exception 'Primero revisa el justificante'; end if;
   insert into public.payments(type,ref_id,child_id,amount,status,method,paid_at,description,concept_code,created_by)
   values('tournament',r.id,r.child_id,r.approved_amount,'paid','transferencia',now(),'Torneos Navidad 2026–2027 · '||array_to_string(r.approved_tournaments,', '),'tournament',actor) returning id into p;
   update public.event_registrations set status='confirmed',payment_id=p,admin_note=note,updated_at=now() where id=r.id;
 elsif operation='reject_proof' then
   if r.status<>'proof_review' or length(btrim(note))<3 then raise exception 'Indica por qué hay que corregir el justificante'; end if;
   update public.event_registrations set status='awaiting_payment',admin_note=note,updated_at=now() where id=r.id;
 elsif operation='cancel' then
   if r.payment_id is not null or r.status='confirmed' then raise exception 'Un pago confirmado se gestiona desde Finanzas; no se borra aquí'; end if;
   if length(btrim(note))<3 then raise exception 'Indica el motivo de anulación'; end if;
   update public.event_registrations set status='cancelled',admin_note=note,updated_at=now() where id=r.id;
 else raise exception 'Acción no válida'; end if;
 insert into public.event_registration_history(registration_id,actor_id,action,note) values(r.id,actor,operation,note);
 insert into public.notifications(user_id,title,message,type,link_url) values(r.user_id,'Actualización de tu inscripción de Navidad','Academy ha actualizado tu solicitud. Entra para revisar el estado y los siguientes pasos.','info','/torneos/inscripcion');
end $$;
revoke all on function public.review_event_registration(uuid,uuid,text,text[],numeric,date,text) from public,anon,authenticated;
grant execute on function public.review_event_registration(uuid,uuid,text,text[],numeric,date,text) to service_role;

create function public.attach_event_file(registration uuid, actor uuid, file_kind text, file_path text, file_name text)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.event_registrations%rowtype;
begin
 select * into r from public.event_registrations where id=registration and user_id=actor for update;
 if not found or r.status='cancelled' then raise exception 'Solicitud no disponible'; end if;
 if file_kind='proof' and r.status<>'awaiting_payment' then raise exception 'El justificante no se puede adjuntar en este estado'; end if;
 if split_part(file_path,'/',1)<>r.id::text then raise exception 'Archivo no válido'; end if;
 insert into public.event_registration_files(registration_id,kind,path,filename,created_by) values(r.id,file_kind,file_path,file_name,actor);
 if file_kind='proof' then update public.event_registrations set status='proof_review',updated_at=now() where id=r.id; end if;
 insert into public.event_registration_history(registration_id,actor_id,action,note) values(r.id,actor,'file_uploaded',file_kind);
end $$;
revoke all on function public.attach_event_file(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.attach_event_file(uuid,uuid,text,text,text) to service_role;
