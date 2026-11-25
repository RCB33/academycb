drop function public.submit_travel_tournament_request(uuid,jsonb);
create function public.submit_travel_tournament_request(actor uuid,verified_email text,payload jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare email_value text; t public.tournaments_internal%rowtype; d jsonb; existing public.enrollment_requests%rowtype;
 request_id uuid; child_input uuid; name_value text; birth_value date; installments jsonb; amount integer; expected integer[];
begin
 if current_user not in ('postgres','service_role') then raise exception 'No autorizado'; end if;
 -- Auth.getUser() and email confirmation are checked by the server action. Only service_role can call this function.
 email_value:=lower(btrim(verified_email));
 if actor is null or email_value is null or email_value='' or position('@' in email_value)<2 then raise exception 'Verifica tu correo antes de inscribirte'; end if;
 if octet_length(payload::text)>20000 or payload->>'payment_choice'<>'transfer'
  or payload->>'privacy_consent' is distinct from 'true' or payload->>'terms_consent' is distinct from 'true'
  or payload->>'participation_consent' is distinct from 'true' or payload->>'image_consent' not in ('true','false')
  then raise exception 'Revisa las condiciones de la solicitud'; end if;
 request_id:=(payload->>'request_id')::uuid; child_input:=nullif(payload->>'child_id','')::uuid;
 name_value:=btrim(payload->>'child_name');birth_value:=(payload->>'birth_date')::date;d:=payload->'details';
 if name_value is null or length(name_value)<2 or birth_value is null or birth_value>current_date then raise exception 'Revisa el jugador'; end if;
 select * into t from public.tournaments_internal where id=(payload->>'tournament_id')::uuid for share;
 if not found or t.status<>'open' or t.end_date is null or t.end_date<current_date then raise exception 'El torneo no está abierto'; end if;
 if t.id='15f0483d-26a8-450e-a6a8-8f7a7c957277' and t.price=450 then
   expected:=case when payload->>'plan_choice'='two' then array[21500,21500] else array[11250,11250,11250,11250] end;
 elsif t.id='9b6c8ac0-a542-49ab-a116-6679c8640932' and t.price=1025 then
   expected:=case when payload->>'plan_choice'='two' then array[51250,51250] else array[15000,15000,15000,15000,15000,15000,12500] end;
 elsif t.id='c93d7e14-a316-4dab-b240-a6e4b3d0ee81' and t.price=599 then
   expected:=case when payload->>'plan_choice'='two' then array[29950,29950] else array[10000,10000,10000,10000,10000,9900] end;
 else raise exception 'Revisa el precio actualizado del torneo'; end if;
 select sum(x) into amount from unnest(expected) x;
 installments:=to_jsonb(expected);
 if payload->>'plan_choice' not in ('monthly','two') or d->>'version' is distinct from 'travel-2027-v1'
  or d->>'payment_choice' is distinct from 'transfer' or d->>'plan_choice' is distinct from payload->>'plan_choice'
  or d->'installments_cents' is distinct from installments or (d->>'total_cents')::integer is distinct from amount
  or d->'tournament'->>'id' is distinct from t.id::text or d->'tournament'->>'title' is distinct from t.title
  or d->'tournament'->>'start_date' is distinct from t.start_date::text or d->'tournament'->>'end_date' is distinct from t.end_date::text
  or d->>'image_consent' is distinct from payload->>'image_consent'
 then raise exception 'Los datos del torneo han cambiado. Recarga y revisa la solicitud'; end if;
 if child_input is not null then
   if not exists(select 1 from public.child_guardians cg join public.guardians g on g.id=cg.guardian_id
     where cg.child_id=child_input and g.user_id=actor and lower(btrim(g.email))=email_value) then raise exception 'El jugador no pertenece a tu cuenta'; end if;
   select full_name,birth_date into name_value,birth_value from public.children where id=child_input and archived_at is null;
   if name_value is null or birth_value is null then raise exception 'Revisa la ficha del jugador'; end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||t.id::text,2027));
 select * into existing from public.enrollment_requests where id=request_id;
 if found then
   if existing.submitted_by=actor and existing.activity_id=t.id and existing.tournament_details->>'plan_choice'=payload->>'plan_choice' then return existing.id; end if;
   raise exception 'La solicitud no coincide con el envío anterior';
 end if;
 select * into existing from public.enrollment_requests where submitted_by=actor and activity_id=t.id
  and private.enrollment_name_key(child_name)=private.enrollment_name_key(name_value) and birth_date=birth_value and status<>'lost' order by created_at limit 1;
 if found then
   if existing.tournament_details->>'plan_choice'=payload->>'plan_choice' then return existing.id; end if;
   raise exception 'Ya existe una solicitud para este jugador y torneo. Contacta con Academy para cambiar las cuotas';
 end if;
 if (select count(*) from public.enrollment_requests where submitted_by=actor and tournament_details is not null and created_at>now()-interval '1 hour')>=30 then raise exception 'Demasiadas solicitudes. Contacta con Academy'; end if;
 insert into public.enrollment_requests(id,service,activity_id,activity_name,child_name,birth_date,guardian_name,email,phone,notes,status,submitted_by,linked_child_id,tournament_details)
 values(request_id,'tournament',t.id,t.title,name_value,birth_value,btrim(payload->>'guardian_name'),email_value,btrim(payload->>'phone'),
   concat_ws(E'\n',payload->>'summary','Club: '||(payload->>'club'),'Modalidad: '||case when payload->>'position'='keeper' then 'Portero' else 'Jugador de campo' end,
   'Imágenes: '||case when payload->>'image_consent'='true' then 'Autoriza para este torneo' else 'No autoriza' end,payload->>'notes'),
   'new',actor,child_input,d||jsonb_build_object('consented_at',now(),'consent_version','travel-2027-v1'));
 return request_id;
end $$;
revoke all on function public.submit_travel_tournament_request(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_travel_tournament_request(uuid,text,jsonb) to service_role;
