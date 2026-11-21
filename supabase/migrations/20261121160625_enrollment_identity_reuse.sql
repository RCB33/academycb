-- Shared, conservative identity checks. No receipts, Auth users or emails are changed.
create or replace function private.enrollment_name_key(value text) returns text
language sql immutable security invoker set search_path='' as $$
 select lower(translate(regexp_replace(btrim(coalesce(value,'')), '[[:space:]]+', ' ', 'g'), 'áàäâéèëêíìïîóòöôúùüûçÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÇ', 'aaaaeeeeiiiioooouuuucAAAAEEEEIIIIOOOOUUUUC'));
$$;
create or replace function private.enrollment_phone_key(value text) returns text
language sql immutable security invoker set search_path='' as $$
 with digits as (select regexp_replace(regexp_replace(coalesce(value,''),'[^0-9]','','g'),'^00','') as v)
 select case when length(v)=9 then '34'||v else v end from digits;
$$;
revoke all on function private.enrollment_name_key(text),private.enrollment_phone_key(text) from public,anon;
grant execute on function private.enrollment_name_key(text),private.enrollment_phone_key(text) to authenticated,service_role;

create or replace function public.enrollment_identity_context(request_uuid uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; g public.guardians%rowtype; c public.children%rowtype; matches integer; gid uuid; cid uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo administración puede revisar identidades'; end if;
 select * into strict r from public.enrollment_requests where id=request_uuid;
 if nullif(btrim(r.email),'') is null or r.birth_date is null or private.enrollment_name_key(r.child_name)='' then raise exception 'Completa correo, nombre y fecha de nacimiento antes de aceptar'; end if;
 select count(*),min(id::text)::uuid into matches,gid from public.guardians where lower(btrim(email))=lower(btrim(r.email));
 if matches>1 then raise exception 'Hay tutores duplicados con este correo. Revisa las fichas antes de aceptar'; end if;
 if gid is not null then
  select * into strict g from public.guardians where id=gid;
  if (private.enrollment_name_key(g.full_name)<>'' and private.enrollment_name_key(r.guardian_name)<>'' and private.enrollment_name_key(g.full_name)<>private.enrollment_name_key(r.guardian_name))
   or (private.enrollment_phone_key(g.phone)<>'' and private.enrollment_phone_key(r.phone)<>'' and private.enrollment_phone_key(g.phone)<>private.enrollment_phone_key(r.phone)) then
   raise exception 'El correo ya tiene tutor, pero el nombre o teléfono no coincide. Revisa la ficha del tutor antes de aceptar; no se ha creado otra';
  end if;
 elsif private.enrollment_phone_key(r.phone)<>'' and exists(select 1 from public.guardians x where private.enrollment_name_key(x.full_name)=private.enrollment_name_key(r.guardian_name) and private.enrollment_phone_key(x.phone)=private.enrollment_phone_key(r.phone)) then
  raise exception 'Ya hay un tutor con ese nombre y teléfono, pero otro correo. Revisa su ficha antes de aceptar';
 end if;
 cid:=coalesce(r.accepted_child_id,r.linked_child_id);
 if cid is not null then
  if not exists(select 1 from public.child_guardians where child_id=cid and guardian_id=gid) then raise exception 'Revisa el vínculo familiar antes de aceptar'; end if;
  select * into strict c from public.children where id=cid;
  if private.enrollment_name_key(c.full_name)<>private.enrollment_name_key(r.child_name) or c.birth_date is distinct from r.birth_date then raise exception 'El nombre o nacimiento no coincide con el jugador vinculado. Revisa su ficha'; end if;
 else
  select count(*),min(ch.id::text)::uuid into matches,cid from public.children ch join public.child_guardians cg on cg.child_id=ch.id
   where cg.guardian_id=gid and private.enrollment_name_key(ch.full_name)=private.enrollment_name_key(r.child_name) and ch.birth_date=r.birth_date;
  if matches>1 then raise exception 'Hay jugadores duplicados. Revisa la ficha antes de aceptar'; end if;
  if cid is not null then select * into strict c from public.children where id=cid;
  elsif exists(select 1 from public.children ch join public.child_guardians cg on cg.child_id=ch.id where cg.guardian_id=gid and private.enrollment_name_key(ch.full_name)=private.enrollment_name_key(r.child_name)) then
   raise exception 'Ya hay un jugador con ese nombre en la familia, pero su nacimiento falta o es distinto. Revisa la ficha antes de crear otra';
  elsif exists(select 1 from public.children ch where private.enrollment_name_key(ch.full_name)=private.enrollment_name_key(r.child_name) and ch.birth_date=r.birth_date) then
   raise exception 'Ya hay un jugador con ese nombre y nacimiento, pero otro vínculo familiar. Revisa la ficha antes de aceptar';
  end if;
 end if;
 if cid is not null and c.archived_at is not null then raise exception 'El jugador ya existe en el archivo. Revisa su ficha antes de aceptar'; end if;
 return jsonb_build_object('guardian_id',gid,'child_id',cid,'guardian_name',g.full_name,'guardian_phone',g.phone,'child_name',c.full_name,'birth_date',c.birth_date,
  'match',case when cid is not null then 'existing_player' when gid is not null then 'existing_guardian' else 'new_family' end);
end $$;
revoke all on function public.enrollment_identity_context(uuid) from public,anon;
grant execute on function public.enrollment_identity_context(uuid) to authenticated;

create or replace function public.convert_enrollment_request(request_uuid uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; identity jsonb; child uuid; tutor uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'No autorizado'; end if;
 select * into strict r from public.enrollment_requests where id=request_uuid for update;
 if r.status='enrolled' and r.accepted_child_id is not null then return r.accepted_child_id; end if;
 if r.status not in ('new','contacted','interested') then raise exception 'Esta solicitud está cerrada. Revisa su ficha antes de continuar'; end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(btrim(r.email)),46));
 identity:=public.enrollment_identity_context(request_uuid);
 tutor:=(identity->>'guardian_id')::uuid;child:=(identity->>'child_id')::uuid;
 if tutor is null then insert into public.guardians(full_name,email,phone) values(r.guardian_name,lower(btrim(r.email)),r.phone) returning id into tutor; end if;
 if child is null then
  insert into public.children(full_name,birth_year,birth_date) values(r.child_name,extract(year from r.birth_date)::integer,r.birth_date) returning id into child;
  insert into public.child_guardians(child_id,guardian_id,relationship,is_primary) values(child,tutor,'Tutor',true);
 end if;
 update public.enrollment_requests set status='enrolled',accepted_child_id=child,last_contact_at=now() where id=request_uuid;
 return child;
end $$;
revoke all on function public.convert_enrollment_request(uuid) from public,anon;
grant execute on function public.convert_enrollment_request(uuid) to authenticated;

create or replace function public.accept_academy_request(request_uuid uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; d jsonb; g jsonb; t public.teams%rowtype;
 identity jsonb; child uuid; tutor uuid; members integer; membership uuid; starts date; ends date; month_date date;
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
 identity:=public.enrollment_identity_context(request_uuid);
 tutor:=(identity->>'guardian_id')::uuid;child:=(identity->>'child_id')::uuid;
 if tutor is null then
  insert into public.guardians(full_name,email,phone) values(r.guardian_name,lower(btrim(r.email)),r.phone) returning id into tutor;
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

-- Read-only review plus atomic acceptance. Existing receipts are never updated.
create or replace function public.academy_request_review_context(request_uuid uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; tutor uuid; child uuid; matches integer;
 identity jsonb; fee_exempt boolean; plus_recorded boolean; context jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo administración puede revisar plazas'; end if;
 select * into strict r from public.enrollment_requests where id=request_uuid;
 if r.service<>'academy' or r.academy_details is null then raise exception 'Esta solicitud no tiene un plan de Academia para revisar'; end if;
 identity:=public.enrollment_identity_context(request_uuid);
 tutor:=(identity->>'guardian_id')::uuid;child:=(identity->>'child_id')::uuid;
 fee_exempt:=exists(select 1 from public.academy_memberships where child_id=child)
  or exists(select 1 from public.payments where child_id=child and concept_code='registration' and status not in ('cancelled','refunded'));
 plus_recorded:=exists(select 1 from public.payments where child_id=child and concept_code='plus' and status not in ('cancelled','refunded')
  and (due_date is null or due_date between (r.academy_details->'plan'->>'season_start')::date and (r.academy_details->'plan'->>'season_end')::date));
 context:=jsonb_build_object('request',jsonb_build_object('id',r.id,'child_name',r.child_name,'guardian_name',r.guardian_name,'email',r.email,'phone',r.phone,'status',r.status,'notes',r.notes,'created_at',r.created_at,'academy_details',r.academy_details),
  'identity',identity,'child_id',child,'fee_exempt',fee_exempt,'plus_recorded',plus_recorded);
 return context||jsonb_build_object('revision',md5(to_jsonb(r)::text||context::text));
end $$;


create or replace function public.accept_campus_request(request_uuid uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.enrollment_requests%rowtype; c uuid; e uuid; matches integer; campus_status text;
begin
 if auth.uid() is null or not public.has_role(array['admin']) then raise exception 'No autorizado';end if;
 select * into r from public.enrollment_requests where id=request_uuid for update;
 if not found or r.service<>'campus' then raise exception 'Solicitud de campus no encontrada';end if;
 select enrollment_id into e from public.campus_request_links where request_id=request_uuid;
 if e is not null then return e;end if;
 if r.status in ('enrolled','lost') then raise exception 'Revisa esta solicitud antes de aceptarla: ya está cerrada';end if;
 select status into campus_status from public.campuses where id=r.activity_id for update;
 if not found or campus_status<>'published' then raise exception 'El campus no está abierto';end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(btrim(r.email)),46));
 c:=public.convert_enrollment_request(request_uuid);
 select id into e from public.campus_enrollments where campus_id=r.activity_id and child_id=c;
 if e is not null and exists(select 1 from public.campus_enrollments where id=e and status='cancelled') then raise exception 'Ya existe una inscripción cancelada. Revísala antes de reactivarla';end if;
 if e is null then
   insert into public.campus_enrollments(campus_id,child_id,status,emergency_contact,emergency_phone,notes) values(r.activity_id,c,'pending_payment',r.guardian_name,r.phone,r.notes) returning id into e;
 end if;
 insert into public.campus_request_links(request_id,enrollment_id,accepted_by) values(request_uuid,e,auth.uid());
 return e;
end $$;
revoke all on function public.accept_campus_request(uuid) from public,anon;
grant execute on function public.accept_campus_request(uuid) to authenticated;

-- Last-line protection for atomic manual, tournament and combined-registration creation.
create or replace function private.prevent_duplicate_family_player() returns trigger
language plpgsql security invoker set search_path='' as $$
declare email_value text; player public.children%rowtype;
begin
 if tg_op='UPDATE' and new.child_id=old.child_id and new.guardian_id=old.guardian_id then return new; end if;
 select lower(btrim(email)) into email_value from public.guardians where id=new.guardian_id;
 if nullif(email_value,'') is null then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(email_value,46));
 select * into strict player from public.children where id=new.child_id;
 if exists(select 1 from public.child_guardians cg join public.children c on c.id=cg.child_id join public.guardians g on g.id=cg.guardian_id
  where c.id<>new.child_id and lower(btrim(g.email))=email_value and private.enrollment_name_key(c.full_name)=private.enrollment_name_key(player.full_name)
   and (c.birth_date=player.birth_date or (c.birth_date is null and c.birth_year=player.birth_year) or (player.birth_date is null and c.birth_year=player.birth_year))) then
  raise exception 'Ya existe un jugador coincidente en esta familia. Reutiliza su ficha o revisa el archivo; no se ha creado otro';
 end if;
 return new;
end $$;
revoke all on function private.prevent_duplicate_family_player() from public,anon,authenticated;
create trigger prevent_duplicate_family_player before insert or update of child_id,guardian_id on public.child_guardians
 for each row execute function private.prevent_duplicate_family_player();
