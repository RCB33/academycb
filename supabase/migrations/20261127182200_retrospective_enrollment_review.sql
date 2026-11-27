-- New backdated memberships require an administrative review before online payment.
-- Existing memberships, receipt amounts/statuses and Stripe settings are untouched.
alter table public.academy_memberships
 add column history_review_required boolean not null default false,
 add column history_reviewed_at timestamptz,
 add column history_reviewed_by uuid references public.profiles(id),
 add column history_review_note text;
create index membership_history_reviewer on public.academy_memberships(history_reviewed_by) where history_reviewed_by is not null;

create function private.guard_membership_history_review() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.history_review_required := new.start_date < (now() at time zone 'Europe/Madrid')::date;
  new.history_reviewed_at:=null;new.history_reviewed_by:=null;new.history_review_note:=null;
 else
  if new.history_review_required is distinct from old.history_review_required then raise exception 'La revisión histórica no se puede desactivar';end if;
  if (new.history_reviewed_at,new.history_reviewed_by,new.history_review_note) is distinct from (old.history_reviewed_at,old.history_reviewed_by,old.history_review_note) then
   if auth.uid() is null or not public.has_role(array['admin','finance']) or not old.history_review_required or old.history_reviewed_at is not null or new.history_reviewed_at is null or length(btrim(coalesce(new.history_review_note,''))) not between 5 and 2000 then raise exception 'Revisión de pagos anteriores no autorizada';end if;
   new.history_reviewed_by:=auth.uid();new.history_reviewed_at:=now();new.history_review_note:=btrim(new.history_review_note);
  end if;
  if new.start_date is distinct from old.start_date and new.start_date < (now() at time zone 'Europe/Madrid')::date then
   new.history_review_required:=true;new.history_reviewed_at:=null;new.history_reviewed_by:=null;new.history_review_note:=null;
  end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_membership_history_review() from public,anon,authenticated;
create trigger membership_history_review before insert or update on public.academy_memberships for each row execute function private.guard_membership_history_review();

create function public.complete_membership_history_review(membership_input uuid,note_input text) returns void
language plpgsql security invoker set search_path='' as $$
declare m public.academy_memberships%rowtype;
begin
 if auth.uid() is null or not public.has_role(array['admin','finance']) then raise exception 'Sin permisos';end if;
 if length(btrim(coalesce(note_input,''))) not between 5 and 2000 then raise exception 'Describe los meses revisados, los pagos registrados y el saldo pendiente';end if;
 select * into strict m from public.academy_memberships where id=membership_input for update;
 if not m.history_review_required then raise exception 'Esta plaza no requiere revisión histórica';end if;
 if m.history_reviewed_at is not null then return;end if;
 if m.status not in ('active','pending_payment') or exists(select 1 from public.children where id=m.child_id and archived_at is not null) then raise exception 'Plaza no disponible';end if;
 update public.academy_memberships set history_reviewed_at=now(),history_reviewed_by=auth.uid(),history_review_note=note_input where id=m.id;
end $$;
revoke all on function public.complete_membership_history_review(uuid,text) from public,anon;
grant execute on function public.complete_membership_history_review(uuid,text) to authenticated;

-- Common gate below all online-payment entry points, including direct receipt links,
-- individual/family billing, parent self-service and legacy contracts. No new definer.
create function private.require_membership_history_review() returns trigger
language plpgsql security invoker set search_path='' as $$
declare member uuid; m public.academy_memberships%rowtype;
begin
 if tg_table_name='academy_checkout_contracts' then member:=new.membership_id;
 else select ref_id into member from public.payments where id=new.payment_id and type='academy';end if;
 if member is not null then
  select * into m from public.academy_memberships where id=member for share;
  if found and m.history_review_required and m.history_reviewed_at is null then raise exception 'Secretaría debe revisar los pagos anteriores de esta plaza antes de solicitar el pago';end if;
 end if;
 return new;
end $$;
revoke all on function private.require_membership_history_review() from public,anon,authenticated;
create trigger history_review_before_billing before insert or update of payment_id on public.billing_request_items for each row execute function private.require_membership_history_review();
create trigger history_review_before_receipt before insert or update of payment_id on public.receipt_checkout_attempts for each row execute function private.require_membership_history_review();
create trigger history_review_before_contract before insert or update of membership_id on public.academy_checkout_contracts for each row execute function private.require_membership_history_review();

create trigger history_review_before_reminder before insert or update of payment_id on public.payment_reminder_deliveries for each row execute function private.require_membership_history_review();
