-- Auth.getUser() verifies the session and email in the server action.
-- Pass its email to these service-role-only writers; never query auth.users
-- using service_role or widen access to the Auth schema.
create or replace function public.reserve_event_checkout(registration_input uuid,owner_input uuid,mode_input text,origin_input text)
returns public.event_checkout_attempts language plpgsql security invoker set search_path='' as $$
declare r public.event_registrations%rowtype; a public.event_checkout_attempts%rowtype;
begin
 if mode_input is null or mode_input not in ('test','live') or origin_input is null or origin_input !~ '^https://[a-z0-9.-]+$' then raise exception 'Invalid environment'; end if;
 select * into strict r from public.event_registrations where id=registration_input for update;
 if r.user_id is distinct from owner_input then raise exception 'Registration not owned'; end if;
 if r.status<>'awaiting_payment' or r.payment_id is not null or r.approved_amount is null or r.due_date is null or r.due_date<current_date then raise exception 'Registration not payable'; end if;
 if r.approved_amount<0.50 or r.approved_amount>1000000 or r.approved_amount*100<>trunc(r.approved_amount*100) then raise exception 'Invalid amount'; end if;
 select * into a from public.event_checkout_attempts where registration_id=r.id and mode=mode_input and state in ('creating','open','paid') for update;
 if found then return a; end if;
 insert into public.event_checkout_attempts(registration_id,owner_id,mode,amount_cents,description,return_origin)
 values(r.id,owner_input,mode_input,(r.approved_amount*100)::bigint,'Torneos Navidad · '||array_to_string(r.approved_tournaments,', '),origin_input) returning * into a;
 return a;
end $$;
revoke all on function public.reserve_event_checkout(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_event_checkout(uuid,uuid,text,text) to service_role;


create function public.reserve_receipt_checkout_verified(payment_input uuid,owner_input uuid,mode_input text,origin_input text,verified_email_input text)
returns public.receipt_checkout_attempts language plpgsql security invoker set search_path='' as $$
declare p public.payments%rowtype; a public.receipt_checkout_attempts%rowtype;
begin
  if mode_input not in ('test','live') then raise exception 'Invalid mode'; end if;
  if origin_input !~ '^https://[a-z0-9.-]+$' then raise exception 'Invalid return origin'; end if;
  select * into strict p from public.payments where id=payment_input for update;
  if not exists(select 1 from public.profiles where id=owner_input and role='admin')
    and not exists(select 1 from public.child_guardians cg join public.guardians g on g.id=cg.guardian_id where cg.child_id=p.child_id and g.user_id=owner_input)
    and not (p.type='shop' and exists(select 1 from public.orders o where o.id=p.ref_id and verified_email_input is not null and lower(btrim(o.customer_email))=lower(btrim(verified_email_input))))
  then raise exception 'Receipt not owned'; end if;
  if p.status not in ('pending','failed') then raise exception 'Receipt not payable'; end if;
  if p.amount*100 <> trunc(p.amount*100) or p.amount < 0.50 or p.amount > 1000000 then raise exception 'Invalid amount'; end if;
  if p.type='campus' and not exists(select 1 from public.campus_enrollments where id=p.ref_id and status in ('reserved','confirmed','pending_payment')) then raise exception 'Campus not approved'; end if;
  if p.type='shop' and not exists(select 1 from public.orders where id=p.ref_id and status in ('pending','paid','shipped','completed')) then raise exception 'Order unavailable'; end if;
  select * into a from public.receipt_checkout_attempts where payment_id=p.id and mode=mode_input and state in ('creating','open','paid') for update;
  if found then return a; end if;
  insert into public.receipt_checkout_attempts(owner_id,payment_id,mode,amount_cents,description,return_origin)
  values(owner_input,p.id,mode_input,(p.amount*100)::bigint,coalesce(nullif(p.description,''),'Recibo Academy Costa Brava'),origin_input)
  returning * into a;
  return a;
end;
$$;
revoke all on function public.reserve_receipt_checkout_verified(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_receipt_checkout_verified(uuid,uuid,text,text,text) to service_role;
