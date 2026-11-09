-- Confirmation is a sporting/operational decision, not proof of collection.
-- Existing amounts and recorded payment methods are immutable here: editing
-- a catalogue price or an enrollment must not rewrite financial history.
-- No historical rows are backfilled or reclassified by this migration.
create or replace function public.sync_commercial_source_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_type text;
  source_status text := 'pending';
  source_amount numeric;
  source_child_id uuid;
  source_description text;
  source_method text;
  source_date date;
  existing_payment public.payments%rowtype;
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  source_type := case tg_table_name
    when 'campus_enrollments' then 'campus'
    when 'tournament_teams' then 'tournament'
    when 'orders' then 'shop'
  end;
  if source_type is null then
    raise exception 'Unsupported commercial source';
  end if;

  if tg_op = 'DELETE' then
    update public.payments set ref_id = null, updated_at = now()
    where type = source_type and ref_id = old.id;
    return old;
  end if;

  if tg_table_name = 'campus_enrollments' then
    select price, name into source_amount, source_description
    from public.campuses where id = new.campus_id;
    source_description := 'Campus · ' || coalesce(source_description, 'Inscripción');
    source_child_id := new.child_id;
    source_status := case when new.status = 'cancelled' then 'cancelled' else 'pending' end;
  elsif tg_table_name = 'tournament_teams' then
    select price, title into source_amount, source_description
    from public.tournaments_internal where id = new.tournament_id;
    source_description := coalesce(new.team_name, 'Equipo') || ' · ' || coalesce(source_description, 'Torneo');
    source_status := case when new.status = 'cancelled' then 'cancelled' else 'pending' end;
  else
    source_amount := new.total_amount;
    source_description := 'Pedido · ' || coalesce(new.customer_name, 'Cliente');
    source_method := case when new.payment_method in ('cash','efectivo','transfer','transferencia','stripe','tarjeta') then new.payment_method else null end;
    -- Preserve the explicit manual "paid" action. Shipping is not payment.
    source_status := case when new.status = 'paid' then 'paid' when new.status = 'cancelled' then 'cancelled' else 'pending' end;
  end if;
  source_date := new.created_at::date;

  select * into existing_payment from public.payments
  where type = source_type and ref_id = new.id
  order by created_at, id limit 1 for update;

  if found then
    -- Paid/refunded/failed states belong to finance, not enrollment editing.
    update public.payments
    set status = case
          when existing_payment.status in ('paid','refunded','failed') then existing_payment.status
          else source_status
        end,
        paid_at = case
          when existing_payment.status in ('paid','refunded','failed') then existing_payment.paid_at
          when source_status = 'paid' then coalesce(existing_payment.paid_at, now())
          else null
        end,
        updated_at = now()
    where id = existing_payment.id;
  else
    insert into public.payments(type, ref_id, child_id, amount, status, method, paid_at, due_date, description)
    values (source_type, new.id, source_child_id, coalesce(source_amount, 0), source_status,
      source_method, case when source_status = 'paid' then now() else null end,
      source_date, source_description);
  end if;
  return new;
end;
$$;

-- Trigger invocation does not require exposing this elevated function as RPC.
revoke all on function public.sync_commercial_source_payment() from public, anon, authenticated;
