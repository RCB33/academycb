-- Read-only review plus atomic acceptance. Existing receipts are never updated.
create or replace function public.academy_request_review_context(request_uuid uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; tutor uuid; child uuid; matches integer;
 fee_exempt boolean; plus_recorded boolean; context jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo administración puede revisar plazas'; end if;
 select * into strict r from public.enrollment_requests where id=request_uuid;
 if r.service<>'academy' or r.academy_details is null then raise exception 'Esta solicitud no tiene un plan de Academia para revisar'; end if;
 select count(*),min(id::text)::uuid into matches,tutor from public.guardians where lower(btrim(email))=lower(btrim(r.email));
 if matches>1 then raise exception 'Hay tutores duplicados con este correo. Revisa las fichas antes de aceptar'; end if;
 child:=r.linked_child_id;
 if child is not null then
  if not exists(select 1 from public.child_guardians where guardian_id=tutor and child_id=child) then raise exception 'Vínculo familiar no válido'; end if;
 else
  select count(*),min(c.id::text)::uuid into matches,child from public.children c join public.child_guardians cg on cg.child_id=c.id
   where cg.guardian_id=tutor and c.archived_at is null and lower(btrim(c.full_name))=lower(btrim(r.child_name)) and c.birth_date=r.birth_date;
  if matches>1 then raise exception 'Hay jugadores duplicados. Revisa la ficha antes de aceptar'; end if;
 end if;
 fee_exempt:=exists(select 1 from public.academy_memberships where child_id=child)
  or exists(select 1 from public.payments where child_id=child and concept_code='registration' and status not in ('cancelled','refunded'));
 plus_recorded:=exists(select 1 from public.payments where child_id=child and concept_code='plus' and status not in ('cancelled','refunded')
  and (due_date is null or due_date between (r.academy_details->'plan'->>'season_start')::date and (r.academy_details->'plan'->>'season_end')::date));
 context:=jsonb_build_object('request',jsonb_build_object('id',r.id,'child_name',r.child_name,'guardian_name',r.guardian_name,'email',r.email,'phone',r.phone,'status',r.status,'notes',r.notes,'created_at',r.created_at,'academy_details',r.academy_details),
  'child_id',child,'fee_exempt',fee_exempt,'plus_recorded',plus_recorded);
 return context||jsonb_build_object('revision',md5(to_jsonb(r)::text||context::text));
end $$;

create or replace function public.accept_reviewed_academy_request(request_uuid uuid, start_date_input date, charge_enrollment_input boolean, revision_input text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; context jsonb; d jsonb; q jsonb; remaining jsonb;
 child uuid; starts date; ends date; price numeric; fee numeric; plus numeric; pct integer; first_amount numeric; accepted jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo administración puede aceptar plazas'; end if;
 select * into strict r from public.enrollment_requests where id=request_uuid for update;
 if r.status not in ('new','contacted','interested') then raise exception 'Solicitud cerrada o ya aceptada. No se ha modificado ningún recibo'; end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(btrim(r.email)),46));
 context:=public.academy_request_review_context(request_uuid);
 if context->>'child_id' is not null then perform 1 from public.children where id=(context->>'child_id')::uuid for update; end if;
 context:=public.academy_request_review_context(request_uuid);
 if revision_input is null or revision_input is distinct from context->>'revision' then raise exception 'La solicitud o la ficha ha cambiado. Recarga la revisión antes de aceptar'; end if;
 if start_date_input is null or charge_enrollment_input is null then raise exception 'Revisa la fecha de incorporación y la matrícula'; end if;
 d:=r.academy_details; starts:=start_date_input; ends:=(d->'plan'->>'season_end')::date;
 price:=(d->'plan'->>'price')::numeric;
 if starts<(d->'plan'->>'season_start')::date or starts>ends or ends<current_date or price is null or price<=0 or price>10000 then raise exception 'La incorporación debe estar dentro de la temporada del plan'; end if;
 fee:=case when charge_enrollment_input then coalesce((d->'plan'->>'enrollment_fee')::numeric,(d->'quote'->>'enrollment_fee')::numeric) else 0 end;
 if fee is null or fee<0 or fee>10000 or fee<>round(fee,2) then raise exception 'Matrícula no válida'; end if;
 if charge_enrollment_input and (context->>'fee_exempt')::boolean then raise exception 'El jugador ya tiene historial de Academia o matrícula registrada. No vuelvas a cobrarla'; end if;
 plus:=case when (context->>'plus_recorded')::boolean then 0 else (d->'quote'->>'plus')::numeric end;
 if plus is null or plus not in (0,50) then raise exception 'Plus no válido'; end if;
 pct:=case when extract(day from starts)<=7 then 100 when extract(day from starts)<=15 then 75 when extract(day from starts)<=22 then 50 else 25 end;
 first_amount:=round(price*pct/100,2);
 select coalesce(jsonb_agg(jsonb_build_object('month',to_char(m,'YYYY-MM'),'amount',price,'due_date',to_char(m,'YYYY-MM-DD')) order by m),'[]'::jsonb) into remaining
  from generate_series(date_trunc('month',starts)+interval '1 month',date_trunc('month',ends),interval '1 month') m;
 q:=coalesce(d->'quote','{}'::jsonb)||jsonb_build_object('percent',pct,'first_month',first_amount,'monthly_price',price,'enrollment_fee',fee,'plus',plus,'first_total',first_amount+fee+plus,'remaining',remaining,'season_end',ends,'payment_day',1,'follow_up_day',5);
 d:=d||jsonb_build_object('start_date',starts,'quote',q,'admin_review',jsonb_build_object('reviewed_by',auth.uid(),'reviewed_at',now(),'charge_enrollment',charge_enrollment_input,'original_start_date',d->'start_date','original_quote',d->'quote','fee_exempt_from_history',context->'fee_exempt'));
 update public.enrollment_requests set academy_details=d where id=request_uuid;
 child:=public.accept_academy_request(request_uuid);
 select academy_details->'accepted' into accepted from public.enrollment_requests where id=request_uuid;
 if (accepted->>'first_total')::numeric is distinct from first_amount+fee+plus then raise exception 'Los importes han cambiado. Recarga y revisa antes de aceptar'; end if;
 return child;
end $$;

revoke all on function public.academy_request_review_context(uuid) from public,anon;
revoke all on function public.accept_reviewed_academy_request(uuid,date,boolean,text) from public,anon;
grant execute on function public.academy_request_review_context(uuid) to authenticated;
grant execute on function public.accept_reviewed_academy_request(uuid,date,boolean,text) to authenticated;
