-- Even voided allocations retain immutable history and block direct settlement.
-- Do not accept a card charge whose receipt cannot be updated transactionally.
create or replace function private.block_allocated_checkout() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='receipt_checkout_attempts' then
  if exists(select 1 from public.manual_receipt_allocations where payment_id=new.payment_id) then raise exception 'Recibo con historial de abonos manuales: gestiona el saldo desde Finanzas'; end if;
 else
  if exists(select 1 from public.payments p join public.manual_receipt_allocations a on a.payment_id=p.id where p.ref_id=new.membership_id) then raise exception 'Membresía con historial de abonos manuales'; end if;
 end if;
 return new;
end $$;
revoke all on function private.block_allocated_checkout() from public,anon,authenticated;
