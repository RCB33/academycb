-- Public offering stays on the operational rows. No payment or membership backfill.
alter table public.teams alter column max_players drop not null;
alter table public.teams add column public_offer jsonb, add column updated_at timestamptz not null default now();
alter table public.membership_plans add column sessions_per_week integer check(sessions_per_week in (1,2));
alter table public.campuses add column public_program jsonb, add column updated_at timestamptz not null default now();
alter table public.event_campaign_settings add column public_program jsonb, add column updated_at timestamptz not null default now();
alter table public.enrollment_requests add column academy_details jsonb;
create or replace function private.touch_offering() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
revoke all on function private.touch_offering() from public, anon, authenticated;
create trigger teams_offering_version before update on public.teams for each row execute function private.touch_offering();
create trigger campus_offering_version before update on public.campuses for each row execute function private.touch_offering();
update public.membership_plans set sessions_per_week=case when name like '%2 sesiones%' then 2 else 1 end where is_active and season_start='2026-09-15' and season_end='2027-05-31';
update public.campuses set public_program='{"weeks":[{"id":"1","label":"22, 23 y 24 de diciembre","price":89,"dates":["2026-12-22","2026-12-23","2026-12-24"]},{"id":"2","label":"28, 29, 30 y 31 de diciembre","price":99,"dates":["2026-12-28","2026-12-29","2026-12-30","2026-12-31"]},{"id":"3","label":"4, 5 y 7 de enero","price":89,"dates":["2027-01-04","2027-01-05","2027-01-07"]}],"pack_price":197,"birth_from":2013,"birth_to":2022,"sibling_discount":5,"daily_schedule":[["09:00 – 09:15","Llegada"],["09:15 – 10:45","Tecnificación"],["10:45 – 11:15","Almuerzo"],["11:15 – 12:30","Juegos de fútbol"],["12:30 – 13:45","Competición · partidos"],["13:45 – 14:00","Recogida"]],"keeper_training":"09:15 – 10:45","keeper_games":"11:15 – 13:45"}'::jsonb, status='published', location='Campo Municipal de Santa Cristina d’Aro' where name='Campus Navidad 2026–2027' and start_date='2026-12-22' and public_program is null;
update public.event_campaign_settings set public_program='{"events":[{"id":"231","name":"231 Cup","date":"27 diciembre 2026","location":"Santa Coloma de Farners y Sils","categories":["S9","S10","S11","S12"],"image":"/academy-gallery-6.jpg","description":"Representa a Academy en la Winter Edition: fútbol, nuevos compañeros y una jornada para disfrutar compitiendo.","includes":"Welcome pack, agua, fruta y premios deportivos.","dates":"27 de diciembre. Horario y campo por concretar."},{"id":"champions","name":"Champions Dream","date":"27, 28 y 29 diciembre 2026","location":"Zona Garraf y Baix Llobregat","categories":["S7","S8","S9","S10","S11","S12"],"image":"/academy-gallery-1.jpg","description":"Vive el torneo de tus sueños con Academy. Fase de grupos, oro y plata, con partidos de 20 minutos.","includes":"Seguro de accidentes, agua y fruta. Ropa del torneo opcional, sin selección de talla; se devuelve al finalizar.","dates":"27: prebenjamines 2020/2019 y Primera 2018–2015. 28: Preferente 2018/2017. 29: Preferente 2016/2015. Horarios y campos por concretar."},{"id":"costa-brava","name":"Winter Costa Brava Cup","date":"2 y 3 enero 2027","location":"Platja d’Aro (Castell-Platja d’Aro), Sant Feliu de Guíxols y Santa Cristina d’Aro","categories":["S8","S9","S10","S11","S12","Infantil F11"],"image":"/academy-gallery-2.jpg","description":"Nuestro torneo, coorganizado con una entidad colaboradora. Súmate a los equipos Academy y vive una jornada de fútbol en la Costa Brava.","includes":"Mínimo 4 partidos, fases oro y plata, árbitros federados, cobertura para jugadores, agua, fruta y regalo de bienvenida.","dates":"2 enero: S11, S12 e Infantil F11. 3 enero: S8, S9 y S10. Un día por categoría. Campo y horario concretos por confirmar."}],"prices":[65,120,165],"kit_price":55}'::jsonb where id='christmas-2026';
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Benjamines','17:30 – 19:00',(select id from public.categories where name='Benjamín' limit 1),null,'{"day":"Martes","kind":"field","location":"Tipi Park","note":"","order":0,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Benjamines' and public_offer->>'day'='Martes');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Infantiles','19:00 – 20:30',(select id from public.categories where name='Infantil' limit 1),null,'{"day":"Martes","kind":"field","location":"Tipi Park","note":"","order":1,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Infantiles' and public_offer->>'day'='Martes');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Benjamines','17:30 – 19:00',(select id from public.categories where name='Benjamín' limit 1),null,'{"day":"Miércoles","kind":"field","location":"Tipi Park","note":"","order":2,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Benjamines' and public_offer->>'day'='Miércoles');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Infantiles / Cadetes','19:00 – 20:30',null,null,'{"day":"Miércoles","kind":"field","location":"Tipi Park","note":"","order":3,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Infantiles / Cadetes' and public_offer->>'day'='Miércoles');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Alevines','17:30 – 19:00',(select id from public.categories where name='Alevín' limit 1),null,'{"day":"Jueves","kind":"field","location":"Tipi Park","note":"","order":4,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Alevines' and public_offer->>'day'='Jueves');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Escoleta / Prebenjamines','17:30 – 19:00',null,null,'{"day":"Viernes","kind":"field","location":"Tipi Park","note":"","order":5,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Escoleta / Prebenjamines' and public_offer->>'day'='Viernes');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Porteros · Fútbol 7','17:15 – 18:30',null,null,'{"day":"Martes","kind":"keeper","location":"Camp Municipal de Santa Cristina d’Aro","note":"","order":6,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Porteros · Fútbol 7' and public_offer->>'day'='Martes');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Porteros · Fútbol 11','18:30 – 19:45',null,null,'{"day":"Martes","kind":"keeper","location":"Camp Municipal de Santa Cristina d’Aro","note":"","order":7,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Porteros · Fútbol 11' and public_offer->>'day'='Martes');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Porteros · Fútbol 7','17:15 – 18:30',null,null,'{"day":"Miércoles","kind":"keeper","location":"Camp Municipal de Santa Cristina d’Aro","note":"","order":8,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Porteros · Fútbol 7' and public_offer->>'day'='Miércoles');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Porteros · Fútbol 11','18:30 – 19:45',null,null,'{"day":"Miércoles","kind":"keeper","location":"Camp Municipal de Santa Cristina d’Aro","note":"","order":9,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Porteros · Fútbol 11' and public_offer->>'day'='Miércoles');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Domingo · Fútbol 7','15:00 – 16:30',null,null,'{"day":"Domingo","kind":"sunday","location":"Camp Municipal de Sant Feliu de Guíxols","note":"Horario de invierno. Verano: 17:00 – 18:30.","order":10,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Domingo · Fútbol 7' and public_offer->>'day'='Domingo');
insert into public.teams(name,schedule,category_id,max_players,public_offer) select 'Domingo · Fútbol 11','16:45 – 18:15',null,null,'{"day":"Domingo","kind":"sunday","location":"Camp Municipal de Sant Feliu de Guíxols","note":"Horario de invierno. Verano: 18:45 – 20:15.","order":11,"published":true,"birth_from":null,"birth_to":null}'::jsonb where not exists(select 1 from public.teams where name='Domingo · Fútbol 11' and public_offer->>'day'='Domingo');

create trigger events_offering_version before update on public.event_campaign_settings for each row execute function private.touch_offering();

-- Requests are validated/quoted in server routes. Clients cannot forge approved-price snapshots.
-- Keep legacy insert clients working, but only the trusted server may stamp quotes.
create function private.protect_offering_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user not in ('service_role','postgres') and public.is_admin() is not true and (new.academy_details is not null or new.accepted_child_id is not null or new.submitted_by is not null) then raise exception 'Envia la solicitud mediante el formulario público'; end if;
 return new;
end $$;
revoke all on function private.protect_offering_snapshot() from public,anon,authenticated;
alter table public.enrollment_requests add column submitted_by uuid references auth.users(id), add column accepted_child_id uuid references public.children(id);
create trigger protect_offering_snapshot before insert or update on public.enrollment_requests for each row execute function private.protect_offering_snapshot();
create or replace function private.validate_enrollment_child_link() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor uuid; family_email text; player_name text; player_birth date;
begin
 if tg_op='UPDATE' then
  if new.linked_child_id is distinct from old.linked_child_id then raise exception 'El vínculo verificado no se puede cambiar'; end if;
  return new;
 end if;
 if new.linked_child_id is null then return new; end if;
 actor:=case when current_user='service_role' then new.submitted_by else auth.uid() end;
 if actor is null then raise exception 'El jugador no pertenece a tu cuenta'; end if;
 select g.email into family_email from public.guardians g join public.child_guardians cg on cg.guardian_id=g.id where cg.child_id=new.linked_child_id and g.user_id=actor limit 1;
 if family_email is null then raise exception 'El jugador no pertenece a tu cuenta'; end if;
 select full_name,birth_date into player_name,player_birth from public.children where id=new.linked_child_id and archived_at is null;
 if player_name is null then raise exception 'Jugador no disponible'; end if;
 new.child_name=player_name;new.birth_date=coalesce(player_birth,new.birth_date);new.email=lower(btrim(family_email));
 return new;
end $$;
revoke all on function private.validate_enrollment_child_link() from public,anon,authenticated;

-- A two-session plan has both group assignments, without duplicating the child.
create table public.academy_group_assignments (
 membership_id uuid not null references public.academy_memberships(id) on delete cascade,
 team_id uuid not null references public.teams(id),
 child_id uuid not null references public.children(id),
 primary key(membership_id,team_id)
);
create index academy_group_assignments_team_idx on public.academy_group_assignments(team_id);
create index academy_group_assignments_child_idx on public.academy_group_assignments(child_id);
alter table public.academy_group_assignments enable row level security;
grant select,insert,update,delete on public.academy_group_assignments to authenticated;
grant all on public.academy_group_assignments to service_role;
create policy academy_group_assignments_admin on public.academy_group_assignments for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- New requests only: atomic acceptance, reuse player, membership, first partial
-- month and finite full monthly receipts. Existing payments are never updated.
create function public.accept_academy_request(request_uuid uuid) returns uuid
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
 insert into public.academy_memberships(child_id,plan_id,start_date,end_date,status,payment_status,payment_method,monthly_price,assignment_request_id,plan_snapshot)
 values(child,plan,starts,ends,'active','pending','transferencia',price,r.id,
  jsonb_build_object('name',d->'plan'->>'name','frequency','mensual','period_price',price,'enrollment_fee',fee,'plus',plus,'due_day',1,'season_start',d->'plan'->>'season_start','season_end',ends,'offering',d,'assigned_by',auth.uid())) returning id into membership;
 insert into public.academy_group_assignments(membership_id,team_id,child_id) select membership,(x->>'id')::uuid,child from jsonb_array_elements(d->'groups') x;
 month_date:=date_trunc('month',starts)::date;
 while month_date<=ends loop
  v_amount:=case when month_date=date_trunc('month',starts)::date then round(price*percentage/100,2) else price end;
  insert into public.payments(type,ref_id,child_id,amount,gross_amount,discount_amount,promotion_label,status,method,due_date,concept_code,covered_month,description)
  values('academy',membership,child,v_amount,price,price-v_amount,case when v_amount<price then 'Cuota de incorporación · '||percentage||' %' end,'pending','transferencia',case when month_date=date_trunc('month',starts)::date then greatest(starts,current_date) else month_date end,'monthly',to_char(month_date,'YYYY-MM'),(d->'plan'->>'name')||' · '||to_char(month_date,'YYYY-MM'));
  month_date:=(month_date+interval '1 month')::date;
 end loop;
 if fee>0 then insert into public.payments(type,ref_id,child_id,amount,status,method,due_date,concept_code,description) values('academy',membership,child,fee,'pending','transferencia',greatest(starts,current_date),'registration','Matrícula · nuevo jugador'); end if;
 if plus>0 then insert into public.payments(type,ref_id,child_id,amount,status,method,due_date,concept_code,description) values('academy',membership,child,plus,'pending','transferencia',greatest(starts,current_date),'plus','Plan Plus · pago anual único'); end if;
 update public.children set team_id=(d->'groups'->0->>'id')::uuid,category_id=(select category_id from public.teams where id=(d->'groups'->0->>'id')::uuid) where id=child;
 update public.enrollment_requests set status='enrolled',accepted_child_id=child,last_contact_at=now(),academy_details=jsonb_set(d,'{accepted}',jsonb_build_object('membership_id',membership,'enrollment_fee',fee,'plus',plus,'first_month',round(price*percentage/100,2),'first_total',round(price*percentage/100,2)+fee+plus,'accepted_at',now())) where id=r.id;
 return child;
end $$;
revoke all on function public.accept_academy_request(uuid) from public,anon;
grant execute on function public.accept_academy_request(uuid) to authenticated;
-- The server verifies the Auth account via the Auth Admin API before calling.
create function public.link_verified_guardian_account(guardian_input uuid,user_input uuid,email_input text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare g public.guardians%rowtype;
begin
 if user_input is null or email_input is null then raise exception 'Cuenta no verificada';end if;
 perform pg_advisory_xact_lock(hashtextextended(user_input::text,47));
 select * into strict g from public.guardians where id=guardian_input for update;
 if lower(btrim(g.email)) is distinct from lower(btrim(email_input)) then raise exception 'El correo no coincide';end if;
 if g.user_id is not null then
  if g.user_id<>user_input then raise exception 'El tutor tiene otra cuenta';end if;
  return g.user_id;
 end if;
 if exists(select 1 from public.guardians where user_id=user_input and id<>g.id) then raise exception 'Revisa los tutores duplicados';end if;
 update public.guardians set user_id=user_input where id=g.id and user_id is null;
 return user_input;
end $$;
revoke all on function public.link_verified_guardian_account(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.link_verified_guardian_account(uuid,uuid,text) to service_role;

create index enrollment_submitted_by_idx on public.enrollment_requests(submitted_by) where submitted_by is not null;
create index enrollment_accepted_child_idx on public.enrollment_requests(accepted_child_id) where accepted_child_id is not null;
