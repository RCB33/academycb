-- Complete only unpriced legacy requests (or their own pending admin draft).
-- Saving a draft does not accept a place, send mail or create any receipts.
create or replace function public.academy_request_completion_context(request_uuid uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo administración puede completar solicitudes'; end if;
 select * into strict r from public.enrollment_requests where id=request_uuid;
 if r.service<>'academy' or r.status not in ('new','contacted','interested') then raise exception 'Esta solicitud no está pendiente de revisión de Academia'; end if;
 if r.academy_details is not null and r.academy_details->'admin_completion' is null then raise exception 'Esta solicitud ya tiene un plan elegido por la familia'; end if;
 return jsonb_build_object('revision',md5(to_jsonb(r)::text),'request',jsonb_build_object('id',r.id,'child_name',r.child_name,'birth_date',r.birth_date,'guardian_name',r.guardian_name,'email',r.email,'phone',r.phone,'notes',r.notes,'academy_details',r.academy_details));
end $$;

create or replace function public.complete_academy_request(request_uuid uuid, details_input jsonb, charge_enrollment_input boolean, revision_input text)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; p public.membership_plans%rowtype; t public.teams%rowtype;
 ctx jsonb; g jsonb; d jsonb; q jsonb; remaining jsonb; starts date; ends date; pct integer; first_amount numeric; fee numeric; extra numeric; group_ids uuid[]:='{}'; field_count int:=0; sunday_count int:=0; birth_year int;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo administración puede completar solicitudes'; end if;
 select * into strict r from public.enrollment_requests where id=request_uuid for update;
 ctx:=public.academy_request_completion_context(request_uuid);
 if revision_input is null or revision_input is distinct from ctx->>'revision' then raise exception 'La solicitud ha cambiado. Recarga antes de guardar'; end if;
 if charge_enrollment_input is null or details_input->>'payment_choice' is null or details_input->>'payment_choice' not in ('cash','monthly_card') then raise exception 'Elige matrícula y pago en efectivo o tarjeta'; end if;
 select * into p from public.membership_plans where id=(details_input->'plan'->>'id')::uuid for share;
 if not found or p.is_active is not true or p.sessions_per_week not in (1,2) or p.price is null or p.price<=0 or p.enrollment_fee is null then raise exception 'Plan no disponible'; end if;
 if details_input->'plan'->>'name' is distinct from p.name
  or (details_input->'plan'->>'price')::numeric is distinct from p.price
  or (details_input->'plan'->>'enrollment_fee')::numeric is distinct from p.enrollment_fee
  or (details_input->'plan'->>'season_start')::date is distinct from p.season_start
  or (details_input->'plan'->>'season_end')::date is distinct from p.season_end
  or (details_input->'plan'->>'sessions_per_week')::integer is distinct from p.sessions_per_week
  or (details_input->'plan'->>'updated_at')::timestamptz is distinct from p.updated_at then raise exception 'La tarifa ha cambiado. Recarga y revisa los importes'; end if;
 starts:=(details_input->>'start_date')::date; ends:=p.season_end;
 if starts is null or starts<p.season_start or starts>ends or ends<current_date then raise exception 'La incorporación debe estar dentro de la temporada'; end if;
 if jsonb_typeof(details_input->'groups') is distinct from 'array' or jsonb_array_length(details_input->'groups') is distinct from p.sessions_per_week then raise exception 'Selecciona los grupos del plan'; end if;
 birth_year:=extract(year from r.birth_date)::int;
 for g in select value from jsonb_array_elements(details_input->'groups') loop
  if (g->>'id')::uuid=any(group_ids) then raise exception 'No repitas el mismo grupo'; end if;
  group_ids:=array_append(group_ids,(g->>'id')::uuid);
  select * into t from public.teams where id=(g->>'id')::uuid for share;
  if not found or t.status<>'active' or (t.public_offer->>'published')::boolean is not true then raise exception 'Grupo no disponible'; end if;
  if g->>'name' is distinct from t.name or g->>'schedule' is distinct from t.schedule or g->'public_offer' is distinct from t.public_offer then raise exception 'El grupo u horario ha cambiado. Recarga antes de guardar'; end if;
  if t.public_offer->>'birth_from' is not null and (birth_year<(t.public_offer->>'birth_from')::int or birth_year>(t.public_offer->>'birth_to')::int) then raise exception 'El grupo no corresponde al año de nacimiento'; end if;
  if t.public_offer->>'kind'='sunday' then sunday_count:=sunday_count+1;else field_count:=field_count+1;end if;
 end loop;
 if p.sessions_per_week=2 and (sunday_count<>1 or field_count<>1) then raise exception 'Dos sesiones incluyen un grupo entre semana y otro el domingo'; end if;
 extra:=(details_input->'quote'->>'plus')::numeric;
 if extra is null or extra not in (0,50) then raise exception 'Plus no válido'; end if;
 pct:=case when extract(day from starts)<=7 then 100 when extract(day from starts)<=15 then 75 when extract(day from starts)<=22 then 50 else 25 end;
 first_amount:=round(p.price*pct/100,2);fee:=case when charge_enrollment_input then p.enrollment_fee else 0 end;
 select coalesce(jsonb_agg(jsonb_build_object('month',to_char(m,'YYYY-MM'),'amount',p.price,'due_date',to_char(m,'YYYY-MM-DD')) order by m),'[]'::jsonb) into remaining
  from generate_series(date_trunc('month',starts)+interval '1 month',date_trunc('month',ends),interval '1 month') m;
 q:=jsonb_build_object('percent',pct,'first_month',first_amount,'monthly_price',p.price,'enrollment_fee',fee,'plus',extra,'first_total',first_amount+fee+extra,'remaining',remaining,'season_end',ends,'payment_day',1,'follow_up_day',5);
 d:=jsonb_build_object('version',details_input->'version','plan',details_input->'plan','groups',details_input->'groups','start_date',starts,'payment_choice',details_input->'payment_choice','quote',q,
  'admin_completion',jsonb_build_object('source','legacy_request','completed_by',auth.uid(),'completed_at',now(),'charge_enrollment',charge_enrollment_input));
 update public.enrollment_requests set academy_details=d where id=request_uuid;
 -- Validate family identity before committing; duplicates do not create a half-saved draft.
 perform public.academy_request_review_context(request_uuid);
end $$;

revoke all on function public.academy_request_completion_context(uuid) from public,anon;
revoke all on function public.complete_academy_request(uuid,jsonb,boolean,text) from public,anon;
grant execute on function public.academy_request_completion_context(uuid) to authenticated;
grant execute on function public.complete_academy_request(uuid,jsonb,boolean,text) to authenticated;
