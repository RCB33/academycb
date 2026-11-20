-- Server-only atomic submission, with durable retry protection. No payment writes.
create table private.combined_enrollment_submissions (
 id uuid primary key, actor uuid references auth.users(id), fingerprint text not null,
 result jsonb not null, created_at timestamptz not null default now()
);
alter table private.combined_enrollment_submissions enable row level security;
revoke all on private.combined_enrollment_submissions from public,anon,authenticated;
grant usage on schema private to service_role;
grant all on private.combined_enrollment_submissions to service_role;

create function private.submit_combined_enrollment(batch_id uuid, actor uuid, fingerprint text, players jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prior private.combined_enrollment_submissions%rowtype; p jsonb; e jsonb; r uuid; c uuid; g uuid; matches integer;
 previous_sub text; output jsonb='[]'::jsonb; email_value text;
begin
 if batch_id is null or length(fingerprint)<>64 or jsonb_typeof(players)<>'array' or jsonb_array_length(players) not between 1 and 6 then raise exception 'Solicitud no válida'; end if;
 perform pg_advisory_xact_lock(hashtextextended(batch_id::text,31));
 select * into prior from private.combined_enrollment_submissions where id=batch_id;
 if found then
  if prior.actor is distinct from actor or prior.fingerprint<>fingerprint then raise exception 'La solicitud ya fue enviada con otros datos'; end if;
  return prior.result;
 end if;
 if auth.uid() is not null and auth.uid() is distinct from actor then raise exception 'Actor no autorizado'; end if;
 previous_sub=current_setting('request.jwt.claim.sub',true);
 if actor is not null then
  select lower(email) into email_value from auth.users where id=actor and email_confirmed_at is not null;
  if email_value is null then raise exception 'Verifica tu correo'; end if;
  perform pg_advisory_xact_lock(hashtextextended(email_value,0));
 end if;
 -- The verified actor scopes existing ownership triggers while this service-only
 -- transaction runs. Restore the previous claim before returning.
 perform set_config('request.jwt.claim.sub',coalesce(actor::text,''),true);
 for p in select value from jsonb_array_elements(players) loop
  c=null;
  if p->'event' is not null and p->'event'<>'null'::jsonb then
   if actor is null then raise exception 'Verifica tu correo para torneos'; end if;
   r=public.submit_event_registration(actor,p->'event'->'payload',(p->'event'->>'quote')::numeric);
   select child_id into c from public.event_registrations where id=r;
   output=output||jsonb_build_array(jsonb_build_object('source','event','id',r));
  end if;
  -- Without tournaments, two activities still share one verified family ficha.
  -- Single anonymous requests keep their existing review-before-family-creation flow.
  if c is null and jsonb_array_length(p->'enrollments')>1 then
   if actor is null then raise exception 'Verifica tu correo para combinar actividades'; end if;
   e=p->'enrollments'->0;
   c=nullif(e->>'linked_child_id','')::uuid;
   if c is null then
    select count(*),min(id::text)::uuid into matches,g from public.guardians where user_id=actor;
    if matches>1 then raise exception 'Revisa las fichas de tutor duplicadas'; end if;
    if g is null then
     select count(*),min(id::text)::uuid into matches,g from public.guardians where lower(btrim(email))=email_value;
     if matches>1 then raise exception 'Revisa las fichas de tutor duplicadas'; end if;
     if g is not null then
      if exists(select 1 from public.guardians where id=g and user_id is not null and user_id<>actor) then raise exception 'Revisa el acceso a tu ficha'; end if;
      update public.guardians set user_id=actor where id=g and user_id is null;
     else
      insert into public.guardians(user_id,full_name,email,phone) values(actor,e->>'guardian_name',email_value,e->>'phone') returning id into g;
     end if;
    end if;
    select count(*),min(ch.id::text)::uuid into matches,c from public.children ch join public.child_guardians cg on cg.child_id=ch.id where cg.guardian_id=g and lower(btrim(ch.full_name))=lower(btrim(e->>'child_name')) and ch.birth_date=(e->>'birth_date')::date and ch.archived_at is null;
    if matches>1 then raise exception 'Revisa las fichas del jugador duplicadas'; end if;
    if c is null then
     insert into public.children(full_name,birth_date,birth_year,notes) values(e->>'child_name',(e->>'birth_date')::date,extract(year from (e->>'birth_date')::date),'Solicitud conjunta. Sin matrícula ni plaza confirmada.') returning id into c;
     insert into public.child_guardians(child_id,guardian_id,relationship,is_primary) values(c,g,'Tutor',true);
    end if;
   end if;
  end if;
  for e in select value from jsonb_array_elements(p->'enrollments') loop
   if e->>'service' not in ('academy','campus') or (e->>'submitted_by')::uuid is distinct from actor then raise exception 'Solicitud no válida'; end if;
   if actor is not null and lower(e->>'email')<>email_value then raise exception 'Correo no verificado'; end if;
   if c is null then c=nullif(e->>'linked_child_id','')::uuid; end if;
   if c is not null and not exists(select 1 from public.child_guardians cg join public.guardians g on g.id=cg.guardian_id where cg.child_id=c and g.user_id=actor) then raise exception 'Jugador no autorizado'; end if;
   if c is not null and exists(select 1 from public.enrollment_requests x where x.linked_child_id=c and x.service=e->>'service' and x.activity_id is not distinct from nullif(e->>'activity_id','')::uuid and x.status in ('new','contacted','interested','enrolled')) then raise exception 'Ya existe una solicitud para esta actividad'; end if;
   insert into public.enrollment_requests(id,service,activity_id,activity_name,child_name,birth_date,guardian_name,email,phone,notes,status,submitted_by,linked_child_id,academy_details,campus_details)
   values((e->>'id')::uuid,e->>'service',nullif(e->>'activity_id','')::uuid,e->>'activity_name',e->>'child_name',(e->>'birth_date')::date,e->>'guardian_name',e->>'email',e->>'phone',e->>'notes','new',actor,c,nullif(e->'academy_details','null'::jsonb),nullif(e->'campus_details','null'::jsonb)) returning id into r;
   output=output||jsonb_build_array(jsonb_build_object('source','enrollment','id',r));
  end loop;
 end loop;
 if jsonb_array_length(output)=0 then raise exception 'Selecciona actividades'; end if;
 insert into private.combined_enrollment_submissions(id,actor,fingerprint,result) values(batch_id,actor,fingerprint,output);
 perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
 return output;
end $$;
revoke all on function private.submit_combined_enrollment(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function private.submit_combined_enrollment(uuid,uuid,text,jsonb) to service_role;

-- Only the server can call either layer. The private implementation needs owner
-- privileges solely to reuse the existing event-registration transaction (Auth
-- lookup + family creation); do not grant service_role direct reads of auth.users.
create function public.submit_combined_enrollment(batch_id uuid, actor uuid, fingerprint text, players jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select private.submit_combined_enrollment(batch_id,actor,fingerprint,players);
$$;
revoke all on function public.submit_combined_enrollment(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_combined_enrollment(uuid,uuid,text,jsonb) to service_role;
