alter table public.enrollment_requests add column linked_child_id uuid references public.children(id);
create index enrollment_linked_child on public.enrollment_requests(linked_child_id);
create function private.validate_enrollment_child_link() returns trigger language plpgsql security invoker set search_path='' as $$
declare family_email text; player_name text; player_birth date;
begin
 if tg_op='UPDATE' then
   if new.linked_child_id is distinct from old.linked_child_id then raise exception 'El vínculo verificado de la solicitud no se puede cambiar'; end if;
   return new;
 end if;
 if new.linked_child_id is null then return new; end if;
 if auth.uid() is null or not public.is_guardian_of(new.linked_child_id) then raise exception 'El jugador no pertenece a tu cuenta'; end if;
 select g.email into family_email from public.guardians g join public.child_guardians cg on cg.guardian_id=g.id where cg.child_id=new.linked_child_id and g.user_id=auth.uid() limit 1;
 if family_email is null then raise exception 'Revisa el correo de tu ficha familiar'; end if;
 select full_name,birth_date into player_name,player_birth from public.children where id=new.linked_child_id and archived_at is null;
 if player_name is null then raise exception 'Jugador no disponible'; end if;
 new.child_name=player_name; new.birth_date=coalesce(player_birth,new.birth_date); new.email=lower(btrim(family_email));
 return new;
end $$;
revoke all on function private.validate_enrollment_child_link() from public,anon,authenticated;
create trigger validate_enrollment_child_link before insert or update of linked_child_id on public.enrollment_requests for each row execute function private.validate_enrollment_child_link();

create or replace function public.convert_enrollment_request(request_uuid uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare request_row public.enrollment_requests%rowtype; child_uuid uuid; guardian_uuid uuid; matches integer; email_value text;
begin
 if auth.uid() is null or not public.has_role(array['admin']) then raise exception 'No autorizado';end if;
 select * into request_row from public.enrollment_requests where id=request_uuid for update;
 if not found then raise exception 'Solicitud de inscripción no encontrada';end if;
 if request_row.status='enrolled' then raise exception 'Esta solicitud ya se ha convertido en ficha.';end if;
 if request_row.linked_child_id is not null then
   if not exists(select 1 from public.children c join public.child_guardians cg on cg.child_id=c.id join public.guardians g on g.id=cg.guardian_id where c.id=request_row.linked_child_id and c.archived_at is null and lower(btrim(g.email))=lower(btrim(request_row.email))) then raise exception 'Revisa el vínculo familiar antes de aceptar'; end if;
   update public.enrollment_requests set status='enrolled',last_contact_at=now() where id=request_uuid;
   return request_row.linked_child_id;
 end if;
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
