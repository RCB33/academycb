-- No backfill: historical payments remain byte-for-byte unchanged.
alter table public.payments add column if not exists concept_code text;
alter table public.payments add column if not exists covered_month text;
alter table public.payments add column if not exists gross_amount numeric(12,2);
alter table public.payments add column if not exists discount_amount numeric(12,2);
alter table public.payments add column if not exists promotion_label text;
create table public.manual_charge_requests (
 id uuid primary key,
 actor_id uuid not null references auth.users(id),
 child_id uuid not null references public.children(id),
 payload jsonb not null,
 created_at timestamptz not null default now()
);
create index manual_charge_requests_child_idx on public.manual_charge_requests(child_id);
alter table public.manual_charge_requests enable row level security;
revoke all on public.manual_charge_requests from public,anon,authenticated;
grant select on public.manual_charge_requests to authenticated;
create policy manual_charge_requests_finance_read on public.manual_charge_requests for select to authenticated using(public.has_role(array['admin','finance']));

create or replace function private.create_manual_charges(request_id uuid,child_input uuid,lines_input jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare prior public.manual_charge_requests%rowtype; item jsonb; gross numeric; discount numeric; code text; month_value text; due date;
begin
 if auth.uid() is null or not public.has_role(array['admin','finance']) then raise exception 'Sin permisos'; end if;
 if request_id is null or child_input is null or not exists(select 1 from public.children where id=child_input) or jsonb_typeof(lines_input) is distinct from 'array' or jsonb_array_length(lines_input) not between 1 and 24 then raise exception 'Solicitud no válida'; end if;
 perform pg_advisory_xact_lock(hashtextextended(child_input::text,1));
 select * into prior from public.manual_charge_requests where id=request_id;
 if found then
  if prior.actor_id<>auth.uid() or prior.child_id<>child_input or prior.payload<>lines_input then raise exception 'Identificador ya utilizado'; end if;
  return;
 end if;
 insert into public.manual_charge_requests(id,actor_id,child_id,payload) values(request_id,auth.uid(),child_input,lines_input);
 for item in select * from jsonb_array_elements(lines_input) loop
  code:=item->>'concept'; month_value:=nullif(item->>'month',''); gross:=(item->>'gross')::numeric; discount:=(item->>'discount')::numeric; due:=(item->>'due')::date;
  if code is null or code not in ('monthly','registration','plus','kit','tournament','campus','other') or gross is null or gross<=0 or gross>1000000 or gross<>round(gross,2) or discount is null or discount<0 or discount>gross or discount<>round(discount,2) or due is null
   or length(btrim(coalesce(item->>'description',''))) not between 2 and 200 or length(coalesce(item->>'promotion',''))>200
   or (discount>0 and length(btrim(coalesce(item->>'promotion','')))<3) then raise exception 'Concepto, importe o promoción no válidos'; end if;
  if code='monthly' then
   if month_value is null or month_value !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Indica el mes cubierto'; end if;
   -- Include legacy academy receipts conservatively: review rather than duplicate them.
   if exists(select 1 from public.payments where child_id=child_input and status not in ('cancelled','refunded') and
    ((concept_code='monthly' and covered_month=month_value) or (concept_code is null and type='academy' and to_char(due_date,'YYYY-MM')=month_value))) then raise exception 'Ya existe una cuota para ese mes. Registra el pago sobre ella'; end if;
  elsif month_value is not null then raise exception 'Los conceptos únicos no son mensualidades'; end if;
  insert into public.payments(type,ref_id,child_id,amount,status,method,description,due_date,created_by,concept_code,covered_month,gross_amount,discount_amount,promotion_label)
  values(case code when 'monthly' then 'academy' when 'tournament' then 'tournament' when 'campus' then 'campus' when 'kit' then 'shop' else 'other' end,
   request_id,child_input,gross-discount,case when gross=discount then 'paid' else 'pending' end,null,btrim(item->>'description'),due,auth.uid(),code,month_value,gross,discount,nullif(btrim(item->>'promotion'),''));
 end loop;
end $$;
create or replace function public.create_manual_charges(request_id uuid,child_input uuid,lines_input jsonb) returns void
language sql security invoker set search_path='' as $$select private.create_manual_charges(request_id,child_input,lines_input)$$;
revoke all on function private.create_manual_charges(uuid,uuid,jsonb),public.create_manual_charges(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.create_manual_charges(uuid,uuid,jsonb),public.create_manual_charges(uuid,uuid,jsonb) to authenticated;
