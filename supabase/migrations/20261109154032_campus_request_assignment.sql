alter table public.enrollment_requests add column campus_details jsonb;
alter table public.enrollment_requests add constraint campus_details_object check(campus_details is null or (jsonb_typeof(campus_details)='object' and octet_length(campus_details::text)<=16000));

-- Christmas requests are received before an operational campus edition is assigned.
-- Admin explicitly validates the edition and amount; no payment is marked received.
create function public.assign_and_accept_campus_request(request_uuid uuid,selected_campus uuid,validated_amount numeric)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; e uuid; before_count integer; after_count integer;
begin
 if auth.uid() is null or not public.has_role(array['admin']) then raise exception 'No autorizado';end if;
 if validated_amount is null or validated_amount<0 or validated_amount>10000 or validated_amount<>round(validated_amount,2) then raise exception 'Revisa el importe validado';end if;
 select * into r from public.enrollment_requests where id=request_uuid for update;
 if not found or r.service<>'campus' then raise exception 'Solicitud no encontrada';end if;
 select enrollment_id into e from public.campus_request_links where request_id=request_uuid;
 if e is not null then return e;end if;
 if r.activity_id is not null and r.activity_id<>selected_campus then raise exception 'La solicitud pertenece a otra edición';end if;
 perform 1 from public.campuses where id=selected_campus and status='published' for update;
 if not found then raise exception 'Selecciona una edición abierta';end if;
 select count(*) into before_count from public.campus_enrollments where campus_id=selected_campus;
 if r.activity_id is null then update public.enrollment_requests set activity_id=selected_campus where id=request_uuid;end if;
 e=public.accept_campus_request(request_uuid);
 select count(*) into after_count from public.campus_enrollments where campus_id=selected_campus;
 if after_count>before_count then
  update public.campus_enrollments set tshirt_size=nullif(r.campus_details->>'size',''),allergies=nullif(r.campus_details->>'allergies','') where id=e;
  update public.payments set amount=validated_amount,updated_at=now() where type='campus' and ref_id=e and status='pending';
 else
  if exists(select 1 from public.payments where type='campus' and ref_id=e and amount<>validated_amount) then raise exception 'Ya existe una inscripción con otro importe. Revisa su recibo sin duplicar el cargo';end if;
 end if;
 return e;
end $$;
revoke all on function public.assign_and_accept_campus_request(uuid,uuid,numeric) from public,anon;
grant execute on function public.assign_and_accept_campus_request(uuid,uuid,numeric) to authenticated;
