-- A checkout freezes not only the amount but also whose obligation is paid.
create or replace function public.guard_open_receipt_checkout() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.receipt_checkout_attempts a where a.payment_id=old.id and a.mode='live' and a.state in ('creating','open','paid') and a.id::text is distinct from current_setting('academy.receipt_fulfillment',true)) then
  if tg_op='DELETE' then raise exception 'El recibo está vinculado a Stripe; conserva su historial y concilia el pago'; end if;
  if (new.amount,new.status,new.child_id,new.ref_id,new.type,new.method,new.stripe_payment_intent_id,new.stripe_invoice_id)
     is distinct from (old.amount,old.status,old.child_id,old.ref_id,old.type,old.method,old.stripe_payment_intent_id,old.stripe_invoice_id) then
   raise exception 'El recibo está vinculado a Stripe. Cierra el enlace abierto o concilia el pago confirmado antes de modificarlo';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function public.guard_open_receipt_checkout() from public,anon,authenticated;
drop trigger protect_open_receipt_checkout on public.payments;
create trigger protect_open_receipt_checkout before update or delete on public.payments for each row execute function public.guard_open_receipt_checkout();
