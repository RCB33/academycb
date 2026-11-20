-- Internal reminders only. Never collect a payment or send family emails on a timer.
alter table public.notifications add column dedupe_key text;
create unique index notifications_dedupe_key on public.notifications(user_id,dedupe_key);

create function private.finance_notice(key_input text,title_input text,message_input text,link_input text) returns void
language sql security invoker set search_path='' as $$
 insert into public.notifications(user_id,title,message,type,link_url,dedupe_key)
 select p.id,title_input,message_input,'alert',link_input,key_input from public.profiles p
 where p.role in ('admin','finance')
 and not exists(select 1 from public.workers w where w.user_id=p.id and not w.access_enabled)
 on conflict(user_id,dedupe_key) do nothing;
$$;
revoke all on function private.finance_notice(text,text,text,text) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.finance_notice(text,text,text,text) to service_role;

create function private.review_academy_monthly_payments(today_input date default (now() at time zone 'Europe/Madrid')::date) returns void
language plpgsql security invoker set search_path='' as $$
declare month_key text:=to_char(today_input,'YYYY-MM'); stage text; total_count integer; cash_count integer;
begin
 if extract(day from today_input)<3 then return;end if;
 stage:=case when extract(day from today_input)>=8 then 'overdue' when extract(day from today_input)>=7 then 'last_day' else 'cash_review' end;
 select count(*),count(*) filter(where m.agreed_payment_method='cash'
  and not exists(select 1 from public.academy_checkout_contracts c where c.membership_id=m.id and c.mode='live' and c.state in ('creating','open','active'))
  and not exists(select 1 from public.billing_request_items i join public.billing_requests r on r.id=i.request_id where i.payment_id=p.id and r.mode='live' and r.state in ('processing','active','cancelling')))
 into total_count,cash_count
 from public.payments p join public.children ch on ch.id=p.child_id left join public.academy_memberships m on m.id=p.ref_id
 where p.type='academy' and p.concept_code='monthly' and p.covered_month=month_key
 and p.due_date<=today_input and p.status in ('pending','failed','overdue') and ch.archived_at is null
 and p.amount>coalesce((select sum(a.amount) from public.manual_receipt_allocations a where a.payment_id=p.id and a.voided_at is null),0);
 if stage='cash_review' and cash_count>0 then
  perform private.finance_notice('academy:'||month_key||':'||stage,'Revisar efectivo · '||month_key,
   cash_count||' cuotas en efectivo pendientes. Comprueba lo recibido y regístralo. Revisa de nuevo antes del día 7. No se ha escrito a ninguna familia.',
   '/admin/finanzas/revision?month='||month_key||'&method=cash');
 elsif stage<>'cash_review' and total_count>0 then
  perform private.finance_notice('academy:'||month_key||':'||stage,case when stage='last_day' then 'Último día · revisar cuotas' else 'Cuotas pendientes después del día 7' end,
   total_count||' cuotas pendientes de Academia ('||cash_count||' en efectivo). Revisa efectivo y Stripe antes de enviar recordatorios a las familias.',
   '/admin/finanzas/revision?month='||month_key);
 end if;
end $$;
revoke all on function private.review_academy_monthly_payments(date) from public,anon,authenticated,service_role;

create function private.notify_academy_stripe_attention() returns trigger
language plpgsql security invoker set search_path='' as $$
declare child_input uuid;name_input text;month_key text:=to_char(now() at time zone 'Europe/Madrid','YYYY-MM');live_input boolean;
begin
 if new.billing_status<>'attention' or old.billing_status is not distinct from new.billing_status then return new;end if;
 if tg_table_name='academy_checkout_contracts' then
  live_input:=new.mode='live';select child_id into child_input from public.academy_memberships where id=new.membership_id;
 else
  select r.mode='live',r.child_id into live_input,child_input from public.billing_requests r where r.id=new.request_id;
 end if;
 if live_input is not true then return new;end if;
 select full_name into name_input from public.children where id=child_input and archived_at is null;
 if name_input is null then return new;end if;
 perform private.finance_notice('stripe:'||tg_table_name||':'||new.id||':'||(now() at time zone 'Europe/Madrid')::date,
  'Stripe necesita revisión · '||name_input,
  'El cobro requiere atención. Revisa la suscripción y el último recibo antes de pedir otro pago. No se ha marcado ninguna cuota como pagada.',
  '/admin/finanzas/revision?month='||month_key||'&method=stripe');
 return new;
end $$;
revoke all on function private.notify_academy_stripe_attention() from public,anon,authenticated;
grant execute on function private.notify_academy_stripe_attention() to service_role;
create trigger academy_stripe_attention after update of billing_status on public.academy_checkout_contracts for each row execute function private.notify_academy_stripe_attention();
create trigger billing_stripe_attention after update of billing_status on public.billing_request_attempts for each row execute function private.notify_academy_stripe_attention();

create table public.payment_reminder_deliveries(
 id uuid primary key,
 payment_id uuid not null references public.payments(id),guardian_id uuid not null references public.guardians(id),
 actor_id uuid not null references public.profiles(id),recipient text not null,amount_cents bigint not null check(amount_cents>0),
 reminder_day date not null default (now() at time zone 'Europe/Madrid')::date,
 status text not null default 'sending' check(status in ('sending','sent','failed')),
 provider_id text,sent_at timestamptz,created_at timestamptz not null default now(),
 unique(payment_id,guardian_id,reminder_day)
);
create index payment_reminders_guardian on public.payment_reminder_deliveries(guardian_id);
create index payment_reminders_actor on public.payment_reminder_deliveries(actor_id);
alter table public.payment_reminder_deliveries enable row level security;
revoke all on public.payment_reminder_deliveries from public,anon,authenticated;
grant select on public.payment_reminder_deliveries to authenticated;
grant all on public.payment_reminder_deliveries to service_role;
create policy payment_reminder_finance_read on public.payment_reminder_deliveries for select to authenticated using(public.has_role(array['admin','finance']));

create function public.claim_payment_reminder(id_input uuid,actor_input uuid,payment_input uuid,guardian_input uuid,email_input text,amount_input bigint)
returns setof public.payment_reminder_deliveries language plpgsql security invoker set search_path='' as $$
declare p public.payments%rowtype; g public.guardians%rowtype;remaining_cents bigint;
begin
 if not exists(select 1 from public.profiles where id=actor_input and role in ('admin','finance'))
 or exists(select 1 from public.workers where user_id=actor_input and not access_enabled) then raise exception 'Sin permisos';end if;
 select * into p from public.payments where id=payment_input for update;
 if not found or p.status not in ('pending','failed','overdue') or p.due_date is null or p.due_date>(now() at time zone 'Europe/Madrid')::date then raise exception 'El recibo ya está pagado o todavía no vence. Revisa de nuevo.';end if;
 if not exists(select 1 from public.children where id=p.child_id and archived_at is null) then raise exception 'Jugador no disponible';end if;
 select * into g from public.guardians where id=guardian_input and exists(select 1 from public.child_guardians where child_id=p.child_id and guardian_id=guardian_input);
 if not found or g.email is null or lower(trim(g.email)) is distinct from lower(trim(email_input)) then raise exception 'El tutor o su correo ha cambiado. Revisa de nuevo.';end if;
 remaining_cents:=round((p.amount-coalesce((select sum(amount) from public.manual_receipt_allocations where payment_id=p.id and voided_at is null),0))*100);
 if remaining_cents<=0 or remaining_cents is distinct from amount_input then raise exception 'El saldo ha cambiado. Revisa de nuevo antes de enviar.';end if;
 insert into public.payment_reminder_deliveries(id,payment_id,guardian_id,actor_id,recipient,amount_cents)
 values(id_input,p.id,g.id,actor_input,lower(trim(g.email)),remaining_cents)
 on conflict(payment_id,guardian_id,reminder_day) do nothing;
 return query select * from public.payment_reminder_deliveries where payment_id=p.id and guardian_id=g.id and reminder_day=(now() at time zone 'Europe/Madrid')::date;
end $$;
revoke all on function public.claim_payment_reminder(uuid,uuid,uuid,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.claim_payment_reminder(uuid,uuid,uuid,uuid,text,bigint) to service_role;
