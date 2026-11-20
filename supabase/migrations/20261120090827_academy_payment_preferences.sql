-- Agreed collection method is separate from historical receipt/payment evidence.
-- Nullable, no backfill: existing agreements must be reviewed by Karen.
alter table public.academy_memberships add column agreed_payment_method text
 check (agreed_payment_method in ('cash','stripe'));
comment on column public.academy_memberships.agreed_payment_method is 'Agreed method; not proof of payment or an activated Stripe subscription. NULL means not reviewed.';

create function public.set_academy_payment_method(membership_input uuid, method_input text) returns void
language plpgsql security invoker set search_path='' as $$
declare m public.academy_memberships%rowtype;
begin
 if auth.uid() is null or not public.has_role(array['admin']) then raise exception 'No autorizado'; end if;
 if method_input is null or method_input not in ('cash','stripe') then raise exception 'Academia admite efectivo o Stripe'; end if;
 select * into m from public.academy_memberships where id=membership_input for update;
 if not found or m.status not in ('active','pending_payment') then raise exception 'Plaza no disponible'; end if;
 if exists(select 1 from public.children where id=m.child_id and archived_at is not null) then raise exception 'Jugador archivado'; end if;
 if method_input='cash' and (
   exists(select 1 from public.academy_checkout_contracts where membership_id=m.id and mode='live' and state in ('creating','open','active')) or
   exists(select 1 from public.billing_requests r join public.billing_request_items i on i.request_id=r.id join public.payments p on p.id=i.payment_id
     where p.ref_id=m.id and r.mode='live' and r.state in ('ready','processing','active','cancelling'))
 ) then raise exception 'Hay un enlace o una suscripción de Stripe pendiente de cerrar. Revísalo en Finanzas antes de cambiar a efectivo.'; end if;
 update public.academy_memberships set agreed_payment_method=method_input where id=m.id;
end $$;
revoke all on function public.set_academy_payment_method(uuid,text) from public,anon;
grant execute on function public.set_academy_payment_method(uuid,text) to authenticated;

create or replace function public.assign_family_plan_v2(
  p_request_id uuid, p_child_id uuid, p_plan_id uuid, p_plan_version timestamptz,
  p_start date, p_due_day integer, p_discount numeric, p_promotion text,
  p_enrollment boolean, p_plus numeric, p_team_id uuid default null, p_second_team_id uuid default null
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_plan public.membership_plans%rowtype;
  v_existing public.academy_memberships%rowtype;
  v_id uuid;
  v_end date;
  v_interval integer;
  v_duration integer;
  v_cents bigint;
  v_gross bigint;
  v_offset integer;
  v_index integer;
  v_month text;
  v_due date;
  v_origin date;
  v_percent integer := 100;
  v_first_cents bigint;
  v_child public.children%rowtype;
  v_team public.teams%rowtype;
  v_teams uuid[];
  v_group_snapshot jsonb := '[]';
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo administración puede asignar planes';
  end if;
  if p_request_id is null or p_child_id is null or p_plan_id is null or p_start is null
     or p_due_day is null or p_due_day not between 1 and 28
     or p_discount is null or p_discount < 0 or p_discount <> round(p_discount,2)
     or p_plus is null or p_plus not in (0,50)
     or p_enrollment is null then
    raise exception 'Revisa el mes de inicio, vencimiento e importes';
  end if;
  -- Serializes simultaneous assignments for one child.
  select * into v_child from public.children where id=p_child_id and archived_at is null for update;
  if not found then raise exception 'Alumno no encontrado'; end if;
  select * into v_existing from public.academy_memberships where assignment_request_id=p_request_id;
  if found then
    if v_existing.child_id<>p_child_id or v_existing.plan_id<>p_plan_id then
      raise exception 'Solicitud de asignación reutilizada';
    end if;
    return v_existing.id;
  end if;
  select * into v_plan from public.membership_plans where id=p_plan_id for share;
  if not found or not v_plan.is_active then raise exception 'Plan no disponible'; end if;
  if p_plan_version is distinct from v_plan.updated_at then
    raise exception 'El plan ha cambiado. Recarga y revisa de nuevo los importes';
  end if;
  if v_plan.price is null or v_plan.price<0 or v_plan.price>1000000
     or v_plan.duration_months not between 1 and 60 or p_discount>v_plan.price then
    raise exception 'Revisa el precio y la duración del plan';
  end if;
  if p_discount>0 and length(trim(coalesce(p_promotion,'')))=0 then
    raise exception 'Indica el motivo del descuento';
  end if;
  if exists(select 1 from public.payments where child_id=p_child_id and type='academy'
    and covered_month is null and status in ('paid','pending','failed','overdue') and amount>0
    and (concept_code is null or concept_code='monthly')) then
    raise exception 'Hay pagos antiguos sin mes o concepto. Revisa el historial antes de crear nuevas cuotas';
  end if;
  if p_enrollment and exists(select 1 from public.payments where child_id=p_child_id
    and type='academy' and concept_code in ('registration','enrollment') and status not in ('cancelled','refunded')) then
    raise exception 'Ya existe una matrícula. Desmarca la matrícula y revisa su estado';
  end if;
  v_origin := date_trunc('month',p_start)::date;
  if v_plan.frequency='mensual' then
    if p_due_day<>1 then raise exception 'Las mensualidades vencen el día 1'; end if;
    v_percent := case when extract(day from p_start)<=7 then 100 when extract(day from p_start)<=15 then 75 when extract(day from p_start)<=22 then 50 else 25 end;
  elsif p_start<>v_origin then raise exception 'Los planes no mensuales deben empezar el primer día del mes'; end if;
  v_duration := v_plan.duration_months;
  if v_plan.season_start is not null then
    if p_start < v_plan.season_start or p_start > v_plan.season_end then
      raise exception 'La incorporación debe estar dentro de la temporada';
    end if;
    v_duration := (extract(year from v_plan.season_end)::int-extract(year from p_start)::int)*12
      +extract(month from v_plan.season_end)::int-extract(month from p_start)::int+1;
    if v_duration < 1 or v_duration > v_plan.duration_months then raise exception 'Duración fuera de temporada'; end if;
  end if;
  v_interval := case v_plan.frequency when 'mensual' then 1 when 'trimestral' then 3
    when 'anual' then 12 when 'temporada' then v_duration end;
  if v_interval is null or v_duration % v_interval <> 0 then
    raise exception 'La duración debe contener periodos completos. Usa pago de temporada para un único importe total';
  end if;
  v_end := (v_origin + make_interval(months=>v_duration))::date - 1;
  if v_plan.season_end is not null and v_end<>v_plan.season_end then raise exception 'La temporada debe finalizar el último día del mes'; end if;
  if exists(select 1 from public.academy_memberships where child_id=p_child_id
      and status in ('active','paused','pending_payment') and start_date<=v_end and end_date>=p_start) then
    raise exception 'El alumno ya tiene un plan en ese periodo. Revisa su ficha antes de asignar otro';
  end if;
  if exists(select 1 from public.payments where child_id=p_child_id and concept_code='monthly'
      and status not in ('cancelled','refunded') and covered_month between to_char(p_start,'YYYY-MM') and to_char(v_end,'YYYY-MM')) then
    raise exception 'Ya hay cuotas registradas para esos meses. No se ha modificado ningún pago';
  end if;
  -- A selected Plus is one annual supplement, never a monthly charge.
  if p_plus > 0 and exists(
    select 1 from public.payments where child_id=p_child_id and concept_code='plus'
      and status not in ('cancelled','refunded')
      and (due_date is null or
        (v_plan.season_start is not null and due_date between v_plan.season_start and v_plan.season_end) or
        (v_plan.season_start is null and due_date > p_start-interval '1 year' and due_date < p_start+interval '1 year'))
  ) then
    raise exception 'Ya hay un Plus anual registrado o pendiente de revisar. Desmarca Plus para evitar duplicarlo';
  end if;
  if v_plan.sessions_per_week is not null and p_team_id is null then raise exception 'Selecciona el grupo principal'; end if;
  if v_plan.sessions_per_week=2 and p_second_team_id is null then raise exception 'Selecciona también el domingo'; end if;
  if p_second_team_id is not null and (v_plan.sessions_per_week is distinct from 2 or p_team_id=p_second_team_id) then raise exception 'Revisa los dos grupos del plan'; end if;
  v_teams:=array_remove(array[p_team_id,p_second_team_id],null);
  -- Lock in deterministic order before capacity checks to serialize two-group registrations.
  perform 1 from public.teams where id=any(v_teams) order by id for update;
  foreach v_id in array v_teams loop
    select * into v_team from public.teams where id=v_id and status='active';
    if not found then raise exception 'Grupo no disponible'; end if;
    if v_plan.sessions_per_week is not null then
      if coalesce((v_team.public_offer->>'published')::boolean,false)=false then raise exception 'Grupo no publicado'; end if;
      if v_plan.sessions_per_week=2 and ((v_id=p_second_team_id and (v_team.public_offer->>'kind') is distinct from 'sunday') or (v_id=p_team_id and v_team.public_offer->>'kind'='sunday')) then raise exception 'Elige un grupo entre semana y otro de domingo'; end if;
      if v_team.public_offer->>'birth_from' is not null and v_team.public_offer->>'birth_to' is not null and
        (coalesce(extract(year from v_child.birth_date)::int,v_child.birth_year) is null or coalesce(extract(year from v_child.birth_date)::int,v_child.birth_year) not between (v_team.public_offer->>'birth_from')::int and (v_team.public_offer->>'birth_to')::int) then raise exception 'La edad no corresponde al grupo'; end if;
    end if;
    if v_team.max_players is not null and (select count(distinct c.id) from public.children c where c.archived_at is null and c.id<>p_child_id and (
      (c.team_id=v_id and not exists(select 1 from public.academy_group_assignments ga where ga.child_id=c.id and ga.team_id=v_id)) or
      exists(select 1 from public.academy_group_assignments ga join public.academy_memberships m on m.id=ga.membership_id where ga.child_id=c.id and ga.team_id=v_id and m.status in ('active','pending_payment') and m.start_date<=v_end and m.end_date>=p_start)
    ))>=v_team.max_players then raise exception 'Grupo completo'; end if;
    v_group_snapshot:=v_group_snapshot||jsonb_build_array(jsonb_build_object('id',v_id,'name',v_team.name,'schedule',v_team.schedule,'public_offer',v_team.public_offer));
  end loop;
  if p_team_id is not null then update public.children set team_id=p_team_id,category_id=(select category_id from public.teams where id=p_team_id) where id=p_child_id; end if;
  insert into public.academy_memberships(child_id,plan_id,start_date,end_date,status,payment_status,
    payment_method,monthly_price,assignment_request_id,plan_snapshot)
  values(p_child_id,p_plan_id,p_start,v_end,'active','pending','cash',v_plan.price-p_discount,p_request_id,
    jsonb_build_object('name',v_plan.name,'description',v_plan.description,'frequency',v_plan.frequency,
      'duration_months',v_duration,'season_start',v_plan.season_start,'season_end',v_plan.season_end,'period_price',v_plan.price,'discount_per_period',p_discount,
      'promotion',left(trim(coalesce(p_promotion,'')),200),'enrollment_fee',case when p_enrollment then v_plan.enrollment_fee else 0 end,
      'plus',p_plus,'due_day',p_due_day,'team_id',p_team_id,'assigned_by',auth.uid(),'manual_v2',true,'start_date',p_start,'first_percent',v_percent,'groups',v_group_snapshot))
  returning id into v_id;
  insert into public.academy_group_assignments(membership_id,team_id,child_id) select v_id,t,p_child_id from unnest(v_teams) t;
  v_cents := round((v_plan.price-p_discount)*100);
  v_gross := round(v_plan.price*100);
  for v_offset in 0..v_duration-1 loop
    v_index := v_offset % v_interval;
    v_month := to_char(v_origin+make_interval(months=>v_offset),'YYYY-MM');
    v_due := case when v_offset=0 and v_plan.frequency='mensual' then greatest(p_start,(now() at time zone 'Europe/Madrid')::date) else (v_origin+make_interval(months=>v_offset-v_index))::date+p_due_day-1 end;
    v_first_cents := case when v_offset=0 and v_plan.frequency='mensual' then round(v_cents*v_percent/100.0) else v_cents end;
    insert into public.payments(type,ref_id,child_id,amount,gross_amount,discount_amount,
      promotion_label,status,method,due_date,concept_code,covered_month,description)
    values('academy',v_id,p_child_id,
      (v_first_cents/v_interval+case when v_index<v_first_cents%v_interval then 1 else 0 end)::numeric/100,
      (v_gross/v_interval+case when v_index<v_gross%v_interval then 1 else 0 end)::numeric/100,
      ((v_gross/v_interval+case when v_index<v_gross%v_interval then 1 else 0 end)-
       (v_first_cents/v_interval+case when v_index<v_first_cents%v_interval then 1 else 0 end))::numeric/100,
      nullif(concat_ws(' · ',nullif(left(trim(p_promotion),200),''),case when v_offset=0 and v_percent<100 then 'Cuota de incorporación · '||v_percent||' %' end),''),case when v_cents=0 then 'paid' else 'pending' end,
      null,v_due,'monthly',v_month,v_plan.name||' · mes '||v_month);
  end loop;
  if p_enrollment and v_plan.enrollment_fee>0 then
    insert into public.payments(type,ref_id,child_id,amount,status,method,due_date,concept_code,description)
    values('academy',v_id,p_child_id,v_plan.enrollment_fee,'pending',null,case when v_plan.frequency='mensual' then greatest(p_start,(now() at time zone 'Europe/Madrid')::date) else p_start+p_due_day-1 end,'registration','Matrícula · '||v_plan.name);
  end if;
  if p_plus>0 then
    insert into public.payments(type,ref_id,child_id,amount,status,method,due_date,concept_code,description)
    values('academy',v_id,p_child_id,p_plus,'pending',null,case when v_plan.frequency='mensual' then greatest(p_start,(now() at time zone 'Europe/Madrid')::date) else p_start+p_due_day-1 end,'plus','Plan Plus · pago anual único');
  end if;
  return v_id;
end;
$$;



-- Atomic manual assignment + explicit choice, preserving v2 retries and outbox.
create function public.assign_family_plan_v3(
 p_request_id uuid,p_child_id uuid,p_plan_id uuid,p_plan_version timestamptz,p_start date,
 p_due_day integer,p_discount numeric,p_promotion text,p_enrollment boolean,p_plus numeric,
 p_team_id uuid,p_second_team_id uuid,p_payment_method text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare m uuid;
begin
 if p_payment_method is null or p_payment_method not in ('cash','stripe') then raise exception 'Elige efectivo o Stripe'; end if;
 m:=public.assign_family_plan_v2(p_request_id,p_child_id,p_plan_id,p_plan_version,p_start,p_due_day,p_discount,p_promotion,p_enrollment,p_plus,p_team_id,p_second_team_id);
 -- An idempotent retry must not overwrite a subsequent agreement.
 if (select agreed_payment_method from public.academy_memberships where id=m) is null then
   perform public.set_academy_payment_method(m,p_payment_method);
 end if;
 return m;
end $$;
revoke all on function public.assign_family_plan_v3(uuid,uuid,uuid,timestamptz,date,integer,numeric,text,boolean,numeric,uuid,uuid,text) from public,anon;
grant execute on function public.assign_family_plan_v3(uuid,uuid,uuid,timestamptz,date,integer,numeric,text,boolean,numeric,uuid,uuid,text) to authenticated;

create or replace function public.accept_academy_request(request_uuid uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; d jsonb; g jsonb; t public.teams%rowtype;
 child uuid; tutor uuid; members integer; membership uuid; starts date; ends date; month_date date;
 price numeric; percentage integer; v_amount numeric; fee numeric; plus numeric; plan uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo administración puede aceptar plazas'; end if;
 select * into strict r from public.enrollment_requests where id=request_uuid for update;
 if r.service<>'academy' or r.academy_details is null then raise exception 'Esta solicitud requiere revisión manual del plan'; end if;
 if r.status='enrolled' and r.accepted_child_id is not null then return r.accepted_child_id; end if;
 if r.status not in ('new','contacted','interested') then raise exception 'Solicitud cerrada o ya tramitada'; end if;
 d:=r.academy_details;starts:=(d->>'start_date')::date;ends:=(d->'plan'->>'season_end')::date;
 price:=(d->'plan'->>'price')::numeric;plan:=(d->'plan'->>'id')::uuid;
 if starts>ends or starts<(d->'plan'->>'season_start')::date or price<=0 or price>10000 or ends<current_date then raise exception 'Temporada o tarifa no válida'; end if;
 percentage:=case when extract(day from starts)<=7 then 100 when extract(day from starts)<=15 then 75 when extract(day from starts)<=22 then 50 else 25 end;
 if (d->'quote'->>'percent')::integer is distinct from percentage or (d->'quote'->>'first_month')::numeric is distinct from round(price*percentage/100,2) then raise exception 'Revisa el cálculo de la primera cuota'; end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(btrim(r.email)),46));
 select count(*) into members from public.guardians where lower(btrim(email))=lower(btrim(r.email));
 if members>1 then raise exception 'Hay tutores duplicados con este correo. Revisa las fichas antes de aceptar'; end if;
 select id into tutor from public.guardians where lower(btrim(email))=lower(btrim(r.email));
 if tutor is null then
  insert into public.guardians(full_name,email,phone) values(r.guardian_name,lower(btrim(r.email)),r.phone) returning id into tutor;
 end if;
 child:=r.linked_child_id;
 if child is not null then
  if not exists(select 1 from public.child_guardians where guardian_id=tutor and child_id=child) then raise exception 'Vínculo familiar no válido'; end if;
 else
  select count(*),min(c.id::text)::uuid into members,child from public.children c join public.child_guardians cg on cg.child_id=c.id where cg.guardian_id=tutor and c.archived_at is null and lower(btrim(c.full_name))=lower(btrim(r.child_name)) and c.birth_date=r.birth_date;
  if members>1 then raise exception 'Hay jugadores duplicados. Revisa la ficha antes de aceptar'; end if;
 end if;
 if child is null then
  insert into public.children(full_name,birth_date,birth_year) values(r.child_name,r.birth_date,extract(year from r.birth_date)::int) returning id into child;
  insert into public.child_guardians(child_id,guardian_id,relationship,is_primary) values(child,tutor,'Tutor',true);
 end if;
 perform 1 from public.children where id=child and archived_at is null for update;
 if not found then raise exception 'Jugador archivado o no disponible'; end if;
 if exists(select 1 from public.academy_memberships where child_id=child and status in ('active','paused','pending_payment') and start_date<=ends and end_date>=starts) then raise exception 'El jugador ya tiene un plan en este periodo. Revisa su ficha'; end if;
 if exists(select 1 from public.payments where child_id=child and type='academy' and status in ('paid','pending','failed') and amount>0 and (concept_code is null or concept_code='monthly') and (covered_month is null or covered_month between to_char(starts,'YYYY-MM') and to_char(ends,'YYYY-MM'))) then raise exception 'Hay cuotas anteriores que deben revisarse. No se ha modificado ningún pago'; end if;
 for g in select value from jsonb_array_elements(d->'groups') loop
  select * into t from public.teams where id=(g->>'id')::uuid for update;
  if not found or t.status<>'active' then raise exception 'Uno de los grupos ya no está disponible'; end if;
  if t.schedule is distinct from g->>'schedule' or t.public_offer->>'day' is distinct from g->'public_offer'->>'day' then raise exception 'El horario ha cambiado desde la solicitud. Acuerda el nuevo horario con la familia antes de tramitar la plaza'; end if;
  if t.max_players is not null and (select count(distinct c.id) from public.children c where c.archived_at is null and c.id<>child and (c.team_id=t.id or exists(select 1 from public.academy_group_assignments ga join public.academy_memberships am on am.id=ga.membership_id where ga.child_id=c.id and ga.team_id=t.id and am.status in ('active','pending_payment') and am.end_date>=starts)))>=t.max_players then raise exception 'Grupo completo. Revisa la disponibilidad'; end if;
 end loop;
 fee:=(d->'quote'->>'enrollment_fee')::numeric;
 if exists(select 1 from public.academy_memberships where child_id=child) or exists(select 1 from public.payments where child_id=child and concept_code='registration' and status not in ('cancelled','refunded')) then fee:=0; end if;
 plus:=(d->'quote'->>'plus')::numeric;
 if plus not in (0,50) then raise exception 'Plus no válido'; end if;
 if plus=50 and exists(select 1 from public.payments where child_id=child and concept_code='plus' and status not in ('cancelled','refunded') and (due_date is null or due_date between (d->'plan'->>'season_start')::date and ends)) then plus:=0; end if;
 insert into public.academy_memberships(child_id,plan_id,start_date,end_date,status,payment_status,payment_method,monthly_price,assignment_request_id,agreed_payment_method,plan_snapshot)
 values(child,plan,starts,ends,'active','pending',case when d->>'payment_choice'='cash' then 'cash' when d->>'payment_choice'='monthly_card' then 'stripe' else 'transferencia' end,price,r.id,case when d->>'payment_choice'='cash' then 'cash' when d->>'payment_choice'='monthly_card' then 'stripe' else null end,
  jsonb_build_object('name',d->'plan'->>'name','frequency','mensual','period_price',price,'enrollment_fee',fee,'plus',plus,'due_day',1,'season_start',d->'plan'->>'season_start','season_end',ends,'offering',d,'assigned_by',auth.uid())) returning id into membership;
 insert into public.academy_group_assignments(membership_id,team_id,child_id) select membership,(x->>'id')::uuid,child from jsonb_array_elements(d->'groups') x;
 month_date:=date_trunc('month',starts)::date;
 while month_date<=ends loop
  v_amount:=case when month_date=date_trunc('month',starts)::date then round(price*percentage/100,2) else price end;
  insert into public.payments(type,ref_id,child_id,amount,gross_amount,discount_amount,promotion_label,status,method,due_date,concept_code,covered_month,description)
  values('academy',membership,child,v_amount,price,price-v_amount,case when v_amount<price then 'Cuota de incorporación · '||percentage||' %' end,'pending',null,case when month_date=date_trunc('month',starts)::date then greatest(starts,current_date) else month_date end,'monthly',to_char(month_date,'YYYY-MM'),(d->'plan'->>'name')||' · '||to_char(month_date,'YYYY-MM'));
  month_date:=(month_date+interval '1 month')::date;
 end loop;
 if fee>0 then insert into public.payments(type,ref_id,child_id,amount,status,method,due_date,concept_code,description) values('academy',membership,child,fee,'pending',null,greatest(starts,current_date),'registration','Matrícula · nuevo jugador'); end if;
 if plus>0 then insert into public.payments(type,ref_id,child_id,amount,status,method,due_date,concept_code,description) values('academy',membership,child,plus,'pending',null,greatest(starts,current_date),'plus','Plan Plus · pago anual único'); end if;
 update public.children set team_id=(d->'groups'->0->>'id')::uuid,category_id=(select category_id from public.teams where id=(d->'groups'->0->>'id')::uuid) where id=child;
 update public.enrollment_requests set status='enrolled',accepted_child_id=child,last_contact_at=now(),academy_details=jsonb_set(d,'{accepted}',jsonb_build_object('membership_id',membership,'enrollment_fee',fee,'plus',plus,'first_month',round(price*percentage/100,2),'first_total',round(price*percentage/100,2)+fee+plus,'accepted_at',now())) where id=r.id;
 return child;
end $$;
