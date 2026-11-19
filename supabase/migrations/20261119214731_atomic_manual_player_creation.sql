-- New manual registrations only. Existing players/guardians are never rewritten.
create table public.manual_player_requests (
 id uuid primary key,
 actor_id uuid not null references auth.users(id),
 child_id uuid not null references public.children(id) on delete cascade,
 input jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.manual_player_requests enable row level security;
revoke all on public.manual_player_requests from anon;
grant select,insert on public.manual_player_requests to authenticated;
create policy manual_player_requests_admin on public.manual_player_requests for all to authenticated using(public.is_admin()) with check(public.is_admin());
create function public.create_player_with_guardian(request_id uuid, details jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_email text; birth date; v_guardian_id uuid; v_child_id uuid; previous public.manual_player_requests%rowtype; matches int; jersey int;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo administración puede crear jugadores';end if;
 if request_id is null or jsonb_typeof(details) is distinct from 'object' then raise exception 'Datos no válidos';end if;
 v_email:=lower(trim(details->>'guardian_email'));
 if coalesce(length(trim(details->>'full_name')),0) not between 2 and 150 or coalesce(length(trim(details->>'guardian_name')),0) not between 2 and 150 or coalesce(length(v_email),0)>254 or coalesce(v_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or coalesce(details->>'guardian_phone','') !~ '^\+?[0-9 ()-]{9,20}$' then raise exception 'Completa nombre, correo y teléfono del tutor y nombre del jugador';end if;
 begin birth:=(details->>'birth_date')::date;exception when others then raise exception 'Fecha de nacimiento no válida';end;
 if birth is null or birth<'1900-01-01' or birth>(now() at time zone 'Europe/Madrid')::date then raise exception 'La fecha de nacimiento no puede ser futura';end if;
 begin jersey:=nullif(details->>'jersey_number','')::int;exception when others then raise exception 'Dorsal no válido';end;
 if jersey is not null and jersey not between 1 and 99 then raise exception 'El dorsal debe estar entre 1 y 99';end if;
 if length(coalesce(details->>'position',''))>50 or length(coalesce(details->>'preferred_foot',''))>30 or length(coalesce(details->>'shirt_size',''))>30 then raise exception 'Revisa la ficha técnica';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('player-request:'||request_id::text,0));
 select * into previous from public.manual_player_requests where id=request_id;
 if found then
  if previous.actor_id<>auth.uid() or previous.input<>details then raise exception 'Esta operación ya se usó con otros datos. Reabre el formulario';end if;
  return previous.child_id;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email,0));
 select count(*),min(id::text)::uuid into matches,v_guardian_id from public.guardians g where lower(trim(g.email))=v_email;
 if matches>1 then raise exception 'Hay varias fichas de tutor con este correo. Revisa los duplicados antes de continuar';end if;
 if v_guardian_id is not null and exists(select 1 from public.children c join public.child_guardians cg on cg.child_id=c.id where cg.guardian_id=v_guardian_id and lower(trim(c.full_name))=lower(trim(details->>'full_name')) and coalesce(c.birth_date,make_date(c.birth_year,1,1))=birth) then raise exception 'Ya existe un jugador con ese nombre y fecha para este tutor. Revisa su ficha o el archivo';end if;
 if v_guardian_id is null then
  insert into public.guardians(full_name,email,phone) values(trim(details->>'guardian_name'),v_email,trim(details->>'guardian_phone')) returning id into v_guardian_id;
 end if;
 insert into public.children(full_name,birth_date,birth_year,position,preferred_foot,shirt_size,jersey_number)
 values(trim(details->>'full_name'),birth,extract(year from birth)::int,nullif(trim(details->>'position'),''),nullif(trim(details->>'preferred_foot'),''),nullif(trim(details->>'shirt_size'),''),jersey) returning id into v_child_id;
 insert into public.child_guardians(child_id,guardian_id,relationship,is_primary) values(v_child_id,v_guardian_id,'Tutor',true);
 insert into public.manual_player_requests(id,actor_id,child_id,input) values(request_id,auth.uid(),v_child_id,details);
 return v_child_id;
end $$;
revoke all on function public.create_player_with_guardian(uuid,jsonb) from public,anon;
grant execute on function public.create_player_with_guardian(uuid,jsonb) to authenticated;
