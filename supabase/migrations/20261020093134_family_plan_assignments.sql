-- Additive only: existing payments and memberships are never rewritten.
alter table public.membership_plans drop constraint membership_plans_frequency_valid;
alter table public.membership_plans add constraint membership_plans_frequency_valid
  check (frequency in ('mensual','trimestral','anual','temporada'));
alter table public.academy_memberships
  add column assignment_request_id uuid unique,
  add column plan_snapshot jsonb;

create or replace function public.assign_family_plan(
  p_request_id uuid, p_child_id uuid, p_plan_id uuid, p_plan_version timestamptz,
  p_start date, p_due_day integer, p_discount numeric, p_promotion text,
  p_enrollment boolean, p_plus numeric, p_team_id uuid default null
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_plan public.membership_plans%rowtype;
  v_existing public.academy_memberships%rowtype;
  v_id uuid;
  v_end date;
  v_interval integer;
  v_cents bigint;
  v_gross bigint;
  v_offset integer;
  v_index integer;
  v_month text;
  v_due date;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo administración puede asignar planes';
  end if;
  if p_request_id is null or p_child_id is null or p_plan_id is null or p_start is null
     or extract(day from p_start) <> 1 or p_due_day is null or p_due_day not between 1 and 28
     or p_discount is null or p_discount < 0 or p_discount <> round(p_discount,2)
     or p_plus is null or p_plus < 0 or p_plus > 1000000 or p_plus <> round(p_plus,2)
     or p_enrollment is null then
    raise exception 'Revisa el mes de inicio, vencimiento e importes';
  end if;
  -- Serializes simultaneous assignments for one child.
  perform 1 from public.children where id=p_child_id for update;
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
  v_interval := case v_plan.frequency when 'mensual' then 1 when 'trimestral' then 3
    when 'anual' then 12 when 'temporada' then v_plan.duration_months end;
  if v_interval is null or v_plan.duration_months % v_interval <> 0 then
    raise exception 'La duración debe contener periodos completos. Usa pago de temporada para un único importe total';
  end if;
  v_end := (p_start + make_interval(months=>v_plan.duration_months))::date - 1;
  if exists(select 1 from public.academy_memberships where child_id=p_child_id
      and status in ('active','paused','pending_payment') and start_date<=v_end and end_date>=p_start) then
    raise exception 'El alumno ya tiene un plan en ese periodo. Revisa su ficha antes de asignar otro';
  end if;
  if exists(select 1 from public.payments where child_id=p_child_id and concept_code='monthly'
      and status not in ('cancelled','refunded') and covered_month between to_char(p_start,'YYYY-MM') and to_char(v_end,'YYYY-MM')) then
    raise exception 'Ya hay cuotas registradas para esos meses. No se ha modificado ningún pago';
  end if;
  if p_team_id is not null then
    perform 1 from public.teams where id=p_team_id and status='active';
    if not found then raise exception 'Equipo no disponible'; end if;
    update public.children set team_id=p_team_id where id=p_child_id;
  end if;
  insert into public.academy_memberships(child_id,plan_id,start_date,end_date,status,payment_status,
    payment_method,monthly_price,assignment_request_id,plan_snapshot)
  values(p_child_id,p_plan_id,p_start,v_end,'active','pending','transferencia',v_plan.price-p_discount,p_request_id,
    jsonb_build_object('name',v_plan.name,'description',v_plan.description,'frequency',v_plan.frequency,
      'duration_months',v_plan.duration_months,'period_price',v_plan.price,'discount_per_period',p_discount,
      'promotion',left(trim(coalesce(p_promotion,'')),200),'enrollment_fee',case when p_enrollment then v_plan.enrollment_fee else 0 end,
      'plus',p_plus,'due_day',p_due_day,'team_id',p_team_id,'assigned_by',auth.uid()))
  returning id into v_id;
  v_cents := round((v_plan.price-p_discount)*100);
  v_gross := round(v_plan.price*100);
  for v_offset in 0..v_plan.duration_months-1 loop
    v_index := v_offset % v_interval;
    v_month := to_char(p_start+make_interval(months=>v_offset),'YYYY-MM');
    v_due := (p_start+make_interval(months=>v_offset-v_index))::date+p_due_day-1;
    insert into public.payments(type,ref_id,child_id,amount,gross_amount,discount_amount,
      promotion_label,status,method,due_date,concept_code,covered_month,description)
    values('academy',v_id,p_child_id,
      (v_cents/v_interval+case when v_index<v_cents%v_interval then 1 else 0 end)::numeric/100,
      (v_gross/v_interval+case when v_index<v_gross%v_interval then 1 else 0 end)::numeric/100,
      ((v_gross/v_interval+case when v_index<v_gross%v_interval then 1 else 0 end)-
       (v_cents/v_interval+case when v_index<v_cents%v_interval then 1 else 0 end))::numeric/100,
      nullif(left(trim(p_promotion),200),''),case when v_cents=0 then 'paid' else 'pending' end,
      'transferencia',v_due,'monthly',v_month,v_plan.name||' · mes '||v_month);
  end loop;
  if p_enrollment and v_plan.enrollment_fee>0 then
    insert into public.payments(type,ref_id,child_id,amount,status,method,due_date,concept_code,description)
    values('academy',v_id,p_child_id,v_plan.enrollment_fee,'pending','transferencia',p_start+p_due_day-1,'registration','Matrícula · '||v_plan.name);
  end if;
  if p_plus>0 then
    insert into public.payments(type,ref_id,child_id,amount,status,method,due_date,concept_code,description)
    values('academy',v_id,p_child_id,p_plus,'pending','transferencia',p_start+p_due_day-1,'plus','Plan Plus · pago único');
  end if;
  return v_id;
end;
$$;
revoke all on function public.assign_family_plan(uuid,uuid,uuid,timestamptz,date,integer,numeric,text,boolean,numeric,uuid) from public,anon;
grant execute on function public.assign_family_plan(uuid,uuid,uuid,timestamptz,date,integer,numeric,text,boolean,numeric,uuid) to authenticated;
