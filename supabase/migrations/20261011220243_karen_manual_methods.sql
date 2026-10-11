-- Existing values are retained. External card means a payment already received outside this app, not a Stripe charge.
alter table public.payments drop constraint payments_method_check;
alter table public.payments add constraint payments_method_check check(method in ('cash','efectivo','transfer','transferencia','stripe','tarjeta','bizum','external_card'));
alter table public.manual_collection_batches drop constraint manual_collection_batches_method_check;
alter table public.manual_collection_batches add constraint manual_collection_batches_method_check check(method in ('cash','transfer','bizum','external_card'));
create or replace function private.collect_manual_batch(batch_input uuid,lines_input jsonb,total_input numeric,date_input date,method_input text,note_input text)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.payments%rowtype; line jsonb; collected numeric; value numeric; payload jsonb; prior public.manual_collection_batches%rowtype; n int; child_count int; online_open boolean;
begin
 if auth.uid() is null or not public.has_role(array['admin','finance']) then raise exception 'Sin permisos'; end if;
 if batch_input is null or jsonb_typeof(lines_input) is distinct from 'array' or jsonb_array_length(lines_input) not between 1 and 30
 or total_input is null or total_input<=0 or total_input>1000000 or total_input<>round(total_input,2)
 or date_input is null or date_input>current_date or method_input is null or method_input not in ('cash','transfer','bizum','external_card') or length(coalesce(note_input,''))>500 then raise exception 'Datos del cobro no válidos'; end if;
 if exists(select 1 from public.academy_settings s where s.key=case method_input when 'cash' then 'payment_cash_enabled' when 'transfer' then 'payment_transfer_enabled' when 'bizum' then 'payment_bizum_enabled' else 'payment_external_card_enabled' end and s.value='false') then raise exception 'Método desactivado'; end if;
 payload:=jsonb_build_object('lines',lines_input,'total',total_input,'date',date_input,'method',method_input,'note',coalesce(note_input,''));
 perform pg_advisory_xact_lock(hashtextextended(batch_input::text,0));
 select * into prior from public.manual_collection_batches where id=batch_input;
 if found then
  if prior.created_by is distinct from auth.uid() or prior.request_payload<>payload then raise exception 'Identificador de cobro ya utilizado'; end if;
  return prior.id;
 end if;
 select count(distinct (x->>'id')::uuid) into n from jsonb_array_elements(lines_input) x;
 if n<>jsonb_array_length(lines_input) then raise exception 'No repitas un recibo'; end if;
 if (select sum((x->>'amount')::numeric) from jsonb_array_elements(lines_input) x) is distinct from total_input then raise exception 'El reparto no coincide con el importe recibido'; end if;
 -- Stable locking order avoids two sibling batches deadlocking.
 perform 1 from public.payments where id in(select (x->>'id')::uuid from jsonb_array_elements(lines_input) x) order by id for update;
 if (select count(*) from public.payments where id in(select (x->>'id')::uuid from jsonb_array_elements(lines_input) x))<>n then raise exception 'Recibo inexistente'; end if;
 select count(distinct child_id) into child_count from public.payments where id in(select (x->>'id')::uuid from jsonb_array_elements(lines_input) x);
 if child_count>1 then
  if exists(select 1 from public.payments where id in(select (x->>'id')::uuid from jsonb_array_elements(lines_input) x) and child_id is null)
   or not exists(select cg.guardian_id from public.child_guardians cg where cg.child_id in(select child_id from public.payments where id in(select (x->>'id')::uuid from jsonb_array_elements(lines_input) x)) group by cg.guardian_id having count(distinct cg.child_id)=child_count)
  then raise exception 'Para repartir entre jugadores deben compartir un tutor'; end if;
 end if;
 insert into public.manual_collection_batches(id,created_by,paid_date,method,total,note,request_payload) values(batch_input,auth.uid(),date_input,method_input,total_input,coalesce(note_input,''),payload);
 perform set_config('app.manual_allocation_write','on',true);
 for line in select * from jsonb_array_elements(lines_input) loop
  select * into p from public.payments where id=(line->>'id')::uuid;
  value:=(line->>'amount')::numeric;
  if p.updated_at is distinct from (line->>'version')::timestamptz then raise exception 'El recibo ha cambiado. Recarga antes de cobrar'; end if;
  if p.status not in ('pending','failed') or p.stripe_payment_intent_id is not null or p.stripe_invoice_id is not null then raise exception 'Recibo no disponible para cobro manual'; end if;
  if to_regclass('public.receipt_checkout_attempts') is not null then
   execute 'select exists(select 1 from public.receipt_checkout_attempts where payment_id=$1 and mode=''live'' and state in (''creating'',''open''))' into online_open using p.id;
   if online_open then raise exception 'Cancela primero el cobro online en curso'; end if;
  end if;
  if p.ref_id is not null and to_regclass('public.academy_checkout_contracts') is not null then
   execute 'select exists(select 1 from public.academy_checkout_contracts where membership_id=$1 and mode=''live'' and state in (''creating'',''open'',''active'',''completed''))' into online_open using p.ref_id;
   if online_open then raise exception 'Membresía gestionada por Stripe'; end if;
  end if;
  select coalesce(sum(amount),0) into collected from public.manual_receipt_allocations where payment_id=p.id and voided_at is null;
  if value is null or value<=0 or value<>round(value,2) or value>p.amount-collected then raise exception 'El importe supera el saldo pendiente o no es válido'; end if;
  insert into public.manual_receipt_allocations(batch_id,payment_id,amount,paid_date,method) values(batch_input,p.id,value,date_input,method_input);
  update public.payments set status=case when collected+value=amount then 'paid' else 'pending' end,
   paid_at=case when collected+value=amount then (date_input::text||'T12:00:00Z')::timestamptz else null end,
   method=method_input,updated_at=clock_timestamp() where id=p.id;
 end loop;
 perform set_config('app.manual_allocation_write','',true);
 return batch_input;
end $$;
