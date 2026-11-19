-- One transaction for the player and their linked tutor. No backfill.
create function public.update_player_with_guardian(child_uuid uuid,details jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare v_guardian uuid; v_email text; v_birth date; v_jersey int; v_category uuid; g public.guardians%rowtype;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo administración puede editar jugadores';end if;
 if jsonb_typeof(details) is distinct from 'object' or coalesce(length(trim(details->>'full_name')),0) not between 2 and 150 then raise exception 'Revisa el nombre del jugador';end if;
 perform 1 from public.children where id=child_uuid for update;
 if not found then raise exception 'Jugador no encontrado';end if;
 begin
  v_birth:=nullif(details->>'birth_date','')::date;
  v_jersey:=nullif(details->>'jersey_number','')::int;
  v_category:=nullif(nullif(details->>'category_id',''),'null')::uuid;
  v_guardian:=nullif(details->>'guardian_id','')::uuid;
 exception when others then raise exception 'Revisa fecha, categoría y dorsal';end;
 if v_birth is not null and (v_birth<'1900-01-01' or v_birth>(now() at time zone 'Europe/Madrid')::date) then raise exception 'Fecha de nacimiento no válida';end if;
 if v_jersey is not null and v_jersey not between 1 and 99 then raise exception 'El dorsal debe estar entre 1 y 99';end if;
 if length(coalesce(details->>'address',''))>500 or length(coalesce(details->>'position',''))>50 or length(coalesce(details->>'preferred_foot',''))>30 or length(coalesce(details->>'shirt_size',''))>30 then raise exception 'Revisa los datos de la ficha';end if;
 if v_guardian is not null or coalesce(trim(details->>'guardian_name'),'')<>'' then
  v_email:=lower(trim(details->>'guardian_email'));
  if coalesce(length(trim(details->>'guardian_name')),0) not between 2 and 150 or coalesce(v_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email)>254 or coalesce(details->>'guardian_phone','') !~ '^\+?[0-9 ()-]{9,20}$' then raise exception 'Completa nombre, correo y teléfono del tutor';end if;
  if v_guardian is not null then
   if not exists(select 1 from public.child_guardians where child_id=child_uuid and guardian_id=v_guardian) then raise exception 'El tutor no está vinculado al jugador';end if;
   select * into strict g from public.guardians where id=v_guardian for update;
   if g.user_id is not null and lower(trim(g.email)) is distinct from v_email then raise exception 'Este tutor ya tiene acceso. El cambio de correo debe verificarse desde su cuenta para no perder el acceso';end if;
  elsif exists(select 1 from public.child_guardians where child_id=child_uuid) then
   raise exception 'El jugador ya tiene tutores. Selecciona la ficha vinculada';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email,0));
  if exists(select 1 from public.guardians where lower(trim(email))=v_email and (v_guardian is null or id<>v_guardian)) then raise exception 'El correo coincide con otra ficha. Usa Vincular tutor o revisa los duplicados';end if;
  if v_guardian is null then
   insert into public.guardians(full_name,email,phone) values(trim(details->>'guardian_name'),v_email,trim(details->>'guardian_phone')) returning id into v_guardian;
   insert into public.child_guardians(child_id,guardian_id,relationship,is_primary) values(child_uuid,v_guardian,'Tutor',true);
  else
   update public.guardians set full_name=trim(details->>'guardian_name'),email=v_email,phone=trim(details->>'guardian_phone') where id=v_guardian;
  end if;
 end if;
 update public.children set full_name=trim(details->>'full_name'),birth_date=v_birth,
 birth_year=case when v_birth is null then birth_year else extract(year from v_birth)::int end,
 address=details->>'address',category_id=v_category,position=nullif(trim(details->>'position'),''),
 preferred_foot=nullif(trim(details->>'preferred_foot'),''),shirt_size=nullif(trim(details->>'shirt_size'),''),jersey_number=v_jersey where id=child_uuid;
end$$;
revoke all on function public.update_player_with_guardian(uuid,jsonb) from public,anon;
grant execute on function public.update_player_with_guardian(uuid,jsonb) to authenticated;
