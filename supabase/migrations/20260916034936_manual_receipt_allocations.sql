-- Additive only: no backfill or update of existing payments.
create table public.manual_collection_batches (
 id uuid primary key,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 paid_date date not null,
 method text not null check(method in ('cash','transfer')),
 total numeric(12,2) not null check(total>0),
 note text not null default '',
 request_payload jsonb not null,
 voided_at timestamptz,
 voided_by uuid references auth.users(id) on delete set null,
 void_reason text
);
create table public.manual_receipt_allocations (
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null references public.manual_collection_batches(id) on delete restrict,
 payment_id uuid not null references public.payments(id) on delete restrict,
 amount numeric(12,2) not null check(amount>0),
 paid_date date not null,
 method text not null,
 voided_at timestamptz,
 unique(batch_id,payment_id)
);
create index manual_allocations_payment_idx on public.manual_receipt_allocations(payment_id);
alter table public.manual_collection_batches enable row level security;
alter table public.manual_receipt_allocations enable row level security;
revoke all on public.manual_collection_batches,public.manual_receipt_allocations from public,anon,authenticated;
grant select on public.manual_collection_batches,public.manual_receipt_allocations to authenticated;
create policy manual_batches_finance_read on public.manual_collection_batches for select to authenticated using(public.has_role(array['admin','finance']));
create policy manual_allocations_read on public.manual_receipt_allocations for select to authenticated using(
 public.has_role(array['admin','finance']) or exists(select 1 from public.payments p where p.id=payment_id and public.is_guardian_of(p.child_id))
);

-- The private writer is the only ledger mutation gateway. All callers are
-- authorized again inside it; public wrappers remain SECURITY INVOKER.
create or replace function private.collect_manual_batch(batch_input uuid,lines_input jsonb,total_input numeric,date_input date,method_input text,note_input text)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.payments%rowtype; line jsonb; collected numeric; value numeric; payload jsonb; prior public.manual_collection_batches%rowtype; n int; child_count int; online_open boolean;
begin
 if auth.uid() is null or not public.has_role(array['admin','finance']) then raise exception 'Sin permisos'; end if;
 if batch_input is null or jsonb_typeof(lines_input)<>'array' or jsonb_array_length(lines_input) not between 1 and 30
 or total_input is null or total_input<=0 or total_input>1000000 or total_input<>round(total_input,2)
 or date_input is null or date_input>current_date or method_input is null or method_input not in ('cash','transfer') or length(coalesce(note_input,''))>500 then raise exception 'Datos del cobro no válidos'; end if;
 if exists(select 1 from public.academy_settings s where s.key=case method_input when 'cash' then 'payment_cash_enabled' else 'payment_transfer_enabled' end and s.value='false') then raise exception 'Método desactivado'; end if;
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

create or replace function private.void_manual_batch(batch_input uuid,reason_input text) returns void
language plpgsql security definer set search_path='' as $$
declare b public.manual_collection_batches%rowtype; p public.payments%rowtype; collected numeric; last_date date;
begin
 if auth.uid() is null or not public.has_role(array['admin']) then raise exception 'Solo administradores'; end if;
 if length(btrim(coalesce(reason_input,''))) not between 5 and 500 then raise exception 'Indica un motivo'; end if;
 select * into b from public.manual_collection_batches where id=batch_input for update;
 if not found then raise exception 'Cobro inexistente'; end if;
 if b.voided_at is not null then return; end if;
 perform 1 from public.payments where id in(select payment_id from public.manual_receipt_allocations where batch_id=batch_input) order by id for update;
 perform set_config('app.manual_allocation_write','on',true);
 update public.manual_collection_batches set voided_at=clock_timestamp(),voided_by=auth.uid(),void_reason=btrim(reason_input) where id=batch_input;
 update public.manual_receipt_allocations set voided_at=clock_timestamp() where batch_id=batch_input;
 for p in select * from public.payments where id in(select payment_id from public.manual_receipt_allocations where batch_id=batch_input) order by id loop
  if p.stripe_payment_intent_id is not null or p.stripe_invoice_id is not null then raise exception 'Cobro gestionado por Stripe'; end if;
  select coalesce(sum(amount),0),max(paid_date) into collected,last_date from public.manual_receipt_allocations where payment_id=p.id and voided_at is null;
  update public.payments set status=case when collected=amount then 'paid' else 'pending' end,
   paid_at=case when collected=amount then (last_date::text||'T12:00:00Z')::timestamptz else null end,updated_at=clock_timestamp() where id=p.id;
 end loop;
 perform set_config('app.manual_allocation_write','',true);
end $$;

create or replace function private.guard_allocated_receipt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(current_setting('app.manual_allocation_write',true),'')<>'on' and exists(select 1 from public.manual_receipt_allocations where payment_id=old.id) then
  raise exception 'Este recibo tiene un historial de abonos. Gestiona o anula el cobro desde su historial';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger guard_allocated_receipt before update or delete on public.payments for each row execute function private.guard_allocated_receipt();

create or replace function public.collect_manual_batch(batch_input uuid,lines_input jsonb,total_input numeric,date_input date,method_input text,note_input text default '') returns uuid
language sql security invoker set search_path='' as $$select private.collect_manual_batch(batch_input,lines_input,total_input,date_input,method_input,note_input)$$;
create or replace function public.void_manual_batch(batch_input uuid,reason_input text) returns void
language sql security invoker set search_path='' as $$select private.void_manual_batch(batch_input,reason_input)$$;
grant usage on schema private to authenticated;
revoke all on function private.collect_manual_batch(uuid,jsonb,numeric,date,text,text),private.void_manual_batch(uuid,text),private.guard_allocated_receipt(),public.collect_manual_batch(uuid,jsonb,numeric,date,text,text),public.void_manual_batch(uuid,text) from public,anon,authenticated;
grant execute on function private.collect_manual_batch(uuid,jsonb,numeric,date,text,text),private.void_manual_batch(uuid,text),public.collect_manual_batch(uuid,jsonb,numeric,date,text,text),public.void_manual_batch(uuid,text) to authenticated;

create or replace function public.reassign_manual_payment(payment_input uuid,version_input timestamptz,child_input uuid,reason_input text) returns void
language plpgsql security invoker set search_path='' as $$
declare p public.payments%rowtype;
begin
 if auth.uid() is null or not public.has_role(array['admin']) then raise exception 'Solo administradores'; end if;
 if child_input is null or not exists(select 1 from public.children where id=child_input) or length(btrim(coalesce(reason_input,''))) not between 5 and 500 then raise exception 'Selecciona un jugador y explica el motivo'; end if;
 select * into p from public.payments where id=payment_input for update;
 if not found or p.updated_at is distinct from version_input then raise exception 'El recibo ha cambiado. Recarga'; end if;
 if p.ref_id is not null or p.method is null or p.method not in ('cash','efectivo','transfer','transferencia') or p.stripe_payment_intent_id is not null or p.stripe_invoice_id is not null or p.status not in ('paid','pending','failed') then raise exception 'Solo se pueden reasignar ingresos manuales independientes'; end if;
 perform set_config('app.payment_correction_reason',btrim(reason_input),true);
 update public.payments set child_id=child_input,updated_at=clock_timestamp() where id=p.id;
 perform set_config('app.payment_correction_reason','',true);
end $$;
revoke all on function public.reassign_manual_payment(uuid,timestamptz,uuid,text) from public,anon;
grant execute on function public.reassign_manual_payment(uuid,timestamptz,uuid,text) to authenticated;

-- Keep unfinished Stripe previews from charging the full face value of a partly
-- paid receipt. Production online charging remains disabled.
create or replace function private.block_allocated_checkout() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='receipt_checkout_attempts' then
  if exists(select 1 from public.manual_receipt_allocations where payment_id=new.payment_id and voided_at is null) then raise exception 'Recibo con abonos manuales: cobrar el saldo desde Finanzas'; end if;
 else
  if exists(select 1 from public.payments p join public.manual_receipt_allocations a on a.payment_id=p.id where p.ref_id=new.membership_id and a.voided_at is null) then raise exception 'Membresía con abonos manuales'; end if;
 end if;
 return new;
end $$;
revoke all on function private.block_allocated_checkout() from public,anon,authenticated;
do $$begin
 if to_regclass('public.receipt_checkout_attempts') is not null then execute 'create trigger block_allocated_checkout before insert on public.receipt_checkout_attempts for each row execute function private.block_allocated_checkout()'; end if;
 if to_regclass('public.academy_checkout_contracts') is not null then execute 'create trigger block_allocated_contract before insert on public.academy_checkout_contracts for each row execute function private.block_allocated_checkout()'; end if;
end $$;
