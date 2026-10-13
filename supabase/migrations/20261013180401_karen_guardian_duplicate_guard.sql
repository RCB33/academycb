-- Prevent new duplicates; existing records are never merged or rewritten.
create or replace function private.guard_guardian_email()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.email is not distinct from old.email then return new; end if;
 new.email:=nullif(lower(btrim(new.email)), '');
 if new.email is null then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.email, 46));
 if exists(select 1 from public.guardians g where lower(btrim(g.email))=new.email and g.id is distinct from new.id) then
   raise exception 'Este correo ya pertenece a un tutor. Vincula la ficha existente; no crees otra.';
 end if;
 return new;
end $$;
revoke all on function private.guard_guardian_email() from public,anon,authenticated;
create trigger guardian_email_duplicate_guard before insert or update of email on public.guardians
for each row execute function private.guard_guardian_email();

create or replace function public.convert_enrollment_request(request_uuid uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare request_row public.enrollment_requests%rowtype; child_uuid uuid; guardian_uuid uuid; matches integer; email_value text;
begin
 if auth.uid() is null or not public.has_role(array['admin']) then raise exception 'No autorizado';end if;
 select * into request_row from public.enrollment_requests where id=request_uuid for update;
 if not found then raise exception 'Solicitud de inscripción no encontrada';end if;
 if request_row.status='enrolled' then raise exception 'Esta solicitud ya se ha convertido en ficha.';end if;
 email_value:=lower(btrim(request_row.email));
 perform pg_advisory_xact_lock(hashtextextended(email_value,46));
 select count(*) into matches from public.guardians where lower(btrim(email))=email_value;
 if matches>1 then raise exception 'Hay varios tutores con este correo. Revisa los duplicados antes de aceptar la solicitud.';end if;
 select id into guardian_uuid from public.guardians where lower(btrim(email))=email_value;
 if guardian_uuid is null then
   insert into public.guardians(full_name,email,phone) values(request_row.guardian_name,email_value,request_row.phone) returning id into guardian_uuid;
 end if;
 insert into public.children(full_name,birth_year,birth_date) values(request_row.child_name,extract(year from request_row.birth_date)::integer,request_row.birth_date) returning id into child_uuid;
 insert into public.child_guardians(child_id,guardian_id,relationship,is_primary) values(child_uuid,guardian_uuid,'Tutor',true);
 update public.enrollment_requests set status='enrolled',last_contact_at=now() where id=request_uuid;
 return child_uuid;
end $$;
revoke all on function public.convert_enrollment_request(uuid) from public,anon;
grant execute on function public.convert_enrollment_request(uuid) to authenticated;
