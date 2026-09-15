-- Corrections never delete the original receipt. Stripe/module receipts are excluded.
create table public.manual_payment_history (
 id uuid primary key default gen_random_uuid(),
 payment_id uuid not null references public.payments(id) on delete restrict,
 actor_id uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default clock_timestamp(),
 reason text not null,
 before_value jsonb not null,
 after_value jsonb not null
);
create index manual_payment_history_payment_idx on public.manual_payment_history(payment_id,changed_at);
alter table public.manual_payment_history enable row level security;
revoke all on public.manual_payment_history from public,anon,authenticated;
grant select on public.manual_payment_history to authenticated;
create policy manual_payment_history_admin_read on public.manual_payment_history for select to authenticated
 using (public.has_role(array['admin']));

create schema if not exists private;
create or replace function private.audit_manual_payment_correction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if old.ref_id is null and old.method in ('cash','efectivo','transfer','transferencia')
    and old.stripe_payment_intent_id is null and old.stripe_invoice_id is null
    and to_jsonb(old) is distinct from to_jsonb(new) then
  insert into public.manual_payment_history(payment_id,actor_id,reason,before_value,after_value)
  values(old.id,auth.uid(),coalesce(nullif(current_setting('app.payment_correction_reason',true),''),'Cambio de estado del cobro'),to_jsonb(old),to_jsonb(new));
 end if;
 return new;
end $$;
revoke all on function private.audit_manual_payment_correction() from public,anon,authenticated;
create trigger audit_manual_payment_correction after update on public.payments
for each row execute function private.audit_manual_payment_correction();

create or replace function public.correct_manual_payment(
 payment_input uuid, version_input timestamptz, action_input text, reason_input text,
 amount_input numeric default null, description_input text default null,
 date_input date default null, method_input text default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare p public.payments%rowtype;
begin
 if auth.uid() is null or not public.has_role(array['admin']) then raise exception 'Solo administradores'; end if;
 if action_input not in ('edit','cancel') or action_input is null or length(btrim(coalesce(reason_input,''))) not between 5 and 500 then
  raise exception 'Indica un motivo de entre 5 y 500 caracteres';
 end if;
 select * into p from public.payments where id=payment_input for update;
 if not found then raise exception 'No se encontró el cobro'; end if;
 if p.updated_at is distinct from version_input then raise exception 'El cobro ha cambiado. Vuelve a abrirlo antes de guardar'; end if;
 if p.ref_id is not null or p.method is null or p.method not in ('cash','efectivo','transfer','transferencia')
    or p.stripe_payment_intent_id is not null or p.stripe_invoice_id is not null then
  raise exception 'Solo se pueden corregir ingresos manuales independientes de efectivo o transferencia';
 end if;
 if p.status not in ('paid','pending','failed') then raise exception 'Este cobro está anulado o reembolsado'; end if;
 perform set_config('app.payment_correction_reason',btrim(reason_input),true);
 if action_input='cancel' then
  update public.payments set status='cancelled',updated_at=clock_timestamp() where id=p.id;
 else
  if amount_input is null or amount_input<=0 or amount_input>1000000 or amount_input<>round(amount_input,2)
     or length(btrim(coalesce(description_input,''))) not between 3 and 240
     or date_input is null or method_input is null or method_input not in ('cash','efectivo','transfer','transferencia') then
   raise exception 'Revisa el importe, concepto, fecha y método';
  end if;
  update public.payments set amount=amount_input,description=btrim(description_input),method=method_input,
   due_date=date_input,paid_at=case when status='paid' then (date_input::text||'T12:00:00Z')::timestamptz else paid_at end,
   updated_at=clock_timestamp() where id=p.id;
 end if;
 perform set_config('app.payment_correction_reason','',true);
end $$;
revoke all on function public.correct_manual_payment(uuid,timestamptz,text,text,numeric,text,date,text) from public,anon;
grant execute on function public.correct_manual_payment(uuid,timestamptz,text,text,numeric,text,date,text) to authenticated;
