-- Additive only: do not backfill or rewrite any existing payment.
create table public.billing_requests (
 id uuid primary key, child_id uuid not null references public.children(id),
 guardian_id uuid not null references public.guardians(id), created_by uuid not null references auth.users(id),
 kind text not null check(kind in ('payment','subscription')), mode text not null check(mode in ('live','test')),
 title text not null check(length(title) between 2 and 150),
 state text not null default 'ready' check(state in ('ready','processing','active','completed','cancelling','cancelled')),
 total_cents bigint not null check(total_cents between 50 and 100000000),
 expires_at timestamptz not null, created_at timestamptz not null default now(),
 email_status text not null default 'not_sent' check(email_status in ('not_sent','sending','accepted','failed')),
 recipient_email text, email_provider_id text, email_sent_at timestamptz
);
create index billing_requests_child on public.billing_requests(child_id,created_at desc);
create index billing_requests_guardian on public.billing_requests(guardian_id);
create index billing_requests_creator on public.billing_requests(created_by);
create table public.billing_request_items (
 request_id uuid not null references public.billing_requests(id), payment_id uuid not null references public.payments(id),
 position integer not null, amount_cents bigint not null, due_date date not null, snapshot jsonb not null,
 primary key(request_id,payment_id), unique(request_id,position)
);
create index billing_items_payment on public.billing_request_items(payment_id);
create table public.billing_request_attempts (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.billing_requests(id),
 owner_id uuid not null references auth.users(id),
 state text not null default 'creating' check(state in ('creating','open','active','completed','expired','cancelled')),
 session_id text unique, checkout_url text, schedule_id text unique, subscription_id text unique, price_id text,
 billing_status text not null default 'pending' check(billing_status in ('pending','scheduled','active','attention','ended')),
 accepted_at timestamptz not null default now(), terms jsonb not null,
 expires_at timestamptz not null default now()+interval '1 hour'
);
create unique index billing_attempt_one on public.billing_request_attempts(request_id) where state not in ('expired','cancelled');
create index billing_attempt_owner on public.billing_request_attempts(owner_id);
create table public.billing_request_collections (
 collection_id text primary key, attempt_id uuid not null references public.billing_request_attempts(id),
 payment_id uuid not null references public.payments(id), amount_cents bigint not null,
 created_at timestamptz not null default now(), unique(attempt_id,payment_id)
);
-- Single Checkout can settle multiple receipts; use a composite source key.
alter table public.billing_request_collections drop constraint billing_request_collections_pkey;
alter table public.billing_request_collections add primary key(collection_id,payment_id);
create index billing_collections_attempt on public.billing_request_collections(attempt_id);
create index billing_collections_payment on public.billing_request_collections(payment_id);
alter table public.billing_requests enable row level security;
alter table public.billing_request_items enable row level security;
alter table public.billing_request_attempts enable row level security;
alter table public.billing_request_collections enable row level security;
revoke all on public.billing_requests,public.billing_request_items,public.billing_request_attempts,public.billing_request_collections from public,anon,authenticated;
grant select on public.billing_requests,public.billing_request_items,public.billing_request_attempts,public.billing_request_collections to authenticated;
grant all on public.billing_requests,public.billing_request_items,public.billing_request_attempts,public.billing_request_collections to service_role;
create policy billing_request_read on public.billing_requests for select to authenticated using(
 public.has_role(array['admin','finance']) or exists(select 1 from public.guardians g join public.child_guardians cg on cg.guardian_id=g.id where g.id=billing_requests.guardian_id and cg.child_id=billing_requests.child_id and g.user_id=(select auth.uid()))
);
create policy billing_item_read on public.billing_request_items for select to authenticated using(exists(select 1 from public.billing_requests r where r.id=request_id));
create policy billing_attempt_read on public.billing_request_attempts for select to authenticated using(exists(select 1 from public.billing_requests r where r.id=request_id));
create policy billing_collection_read on public.billing_request_collections for select to authenticated using(exists(select 1 from public.billing_request_attempts a where a.id=attempt_id));

create function public.create_billing_request(id_input uuid,actor_input uuid,child_input uuid,guardian_input uuid,kind_input text,mode_input text,title_input text,payments_input uuid[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.billing_requests%rowtype; p public.payments%rowtype; n int:=0; total bigint:=0; unit bigint; first_due date; expiry timestamptz:=now()+interval '7 days';
begin
 if not exists(select 1 from public.profiles where id=actor_input and role in ('admin','finance')) then raise exception 'Sin permisos'; end if;
 if id_input is null or kind_input not in ('payment','subscription') or mode_input not in ('test','live') or length(btrim(title_input)) not between 2 and 150 or cardinality(payments_input) not between 1 and 24 then raise exception 'Solicitud no válida'; end if;
 if not exists(select 1 from public.guardians g join public.child_guardians cg on cg.guardian_id=g.id where cg.child_id=child_input and g.id=guardian_input and g.user_id is not null) then raise exception 'Vincula primero la cuenta del tutor al jugador'; end if;
 perform pg_advisory_xact_lock(hashtextextended(child_input::text,2));
 select * into r from public.billing_requests where id=id_input;
 if found then
  if (r.created_by,r.child_id,r.guardian_id,r.kind,r.mode,r.title) is distinct from (actor_input,child_input,guardian_input,kind_input,mode_input,btrim(title_input)) or
   (select array_agg(payment_id order by payment_id) from public.billing_request_items where request_id=id_input) is distinct from (select array_agg(x order by x) from unnest(payments_input) x) then raise exception 'Identificador ya utilizado'; end if;
  return r.id;
 end if;
 perform 1 from public.payments where id=any(payments_input) order by id for update;
 for p in select * from public.payments where id=any(payments_input) order by due_date,id loop
  if p.child_id is distinct from child_input or p.status not in ('pending','failed') or p.amount<0.50 or p.amount*100<>trunc(p.amount*100) or p.due_date is null then raise exception 'Recibo no disponible'; end if;
  if exists(select 1 from public.manual_receipt_allocations where payment_id=p.id) then raise exception 'Recibo con historial manual: conservar gestión manual'; end if;
  if exists(select 1 from public.receipt_checkout_attempts where payment_id=p.id and mode=mode_input and state in ('creating','open','paid')) or exists(select 1 from public.academy_checkout_contracts where membership_id=p.ref_id and mode=mode_input and state not in ('expired','cancelled')) then raise exception 'Recibo ya vinculado a Stripe'; end if;
  if exists(select 1 from public.billing_request_items i join public.billing_requests q on q.id=i.request_id where i.payment_id=p.id and q.mode=mode_input and q.state<>'cancelled' and (q.expires_at>now() or q.state in ('processing','active','completed'))) then raise exception 'Ya hay una solicitud para este recibo'; end if;
  if p.type='campus' and p.concept_code is distinct from 'campus' and not exists(select 1 from public.campus_enrollments where id=p.ref_id and status in ('reserved','confirmed','pending_payment')) then raise exception 'Campus sin aprobación'; end if;
  if p.type='shop' and p.concept_code is distinct from 'kit' and not exists(select 1 from public.orders where id=p.ref_id and status in ('pending','paid','shipped','completed')) then raise exception 'Pedido no disponible'; end if;
  if kind_input='subscription' then
   if n=0 then first_due:=p.due_date; unit:=(p.amount*100)::bigint; end if;
   if p.concept_code is distinct from 'monthly' or p.covered_month is distinct from to_char(p.due_date,'YYYY-MM') or p.due_date<=current_date or extract(day from p.due_date)>28 or p.amount*100<>unit or p.due_date<>(first_due+make_interval(months=>n))::date then raise exception 'Elige mensualidades futuras consecutivas, del mismo importe y día (1–28)'; end if;
  end if;
  total:=total+(p.amount*100)::bigint; n:=n+1;
 end loop;
 if n<>cardinality(payments_input) or total>100000000 then raise exception 'Recibos duplicados o no disponibles'; end if;
 if kind_input='subscription' then expiry:=least(expiry,(first_due::timestamp at time zone 'UTC')+interval '11 hours'); end if;
 insert into public.billing_requests(id,child_id,guardian_id,created_by,kind,mode,title,total_cents,expires_at,recipient_email) values(id_input,child_input,guardian_input,actor_input,kind_input,mode_input,btrim(title_input),total,expiry,(select email from public.guardians where id=guardian_input));
 insert into public.billing_request_items(request_id,payment_id,position,amount_cents,due_date,snapshot)
 select id_input,receipt.id,row_number() over(order by receipt.due_date,receipt.id),(receipt.amount*100)::bigint,receipt.due_date,
 jsonb_build_object('amount',receipt.amount,'description',receipt.description,'due_date',receipt.due_date,'child_id',receipt.child_id,'ref_id',receipt.ref_id,'type',receipt.type,'covered_month',receipt.covered_month)
 from public.payments receipt where receipt.id=any(payments_input);
 return id_input;
end $$;

create function public.reserve_billing_request(request_input uuid,owner_input uuid,mode_input text,total_input bigint)
returns public.billing_request_attempts language plpgsql security invoker set search_path='' as $$
declare r public.billing_requests%rowtype; a public.billing_request_attempts%rowtype; p public.payments%rowtype; i public.billing_request_items%rowtype;
begin
 perform 1 from public.payments where id in(select payment_id from public.billing_request_items where request_id=request_input) order by id for update;
 select * into strict r from public.billing_requests where id=request_input for update;
 if r.mode is distinct from mode_input or r.total_cents is distinct from total_input or r.state in ('cancelled','cancelling') then raise exception 'Condiciones no válidas'; end if;
 if not exists(select 1 from public.guardians g join public.child_guardians cg on cg.guardian_id=g.id where g.id=r.guardian_id and g.user_id=owner_input and cg.child_id=r.child_id) then raise exception 'Solicitud de otro tutor'; end if;
 select * into a from public.billing_request_attempts where request_id=r.id and state not in ('expired','cancelled') for update;
 if found then
  if a.state='creating' and a.session_id is null and a.expires_at<=now() then
   update public.billing_request_attempts set state='expired' where id=a.id;
   update public.billing_requests set state='ready' where id=r.id; r.state:='ready';
  else return a; end if;
 end if;
 if r.expires_at<=now() or r.state<>'ready' then raise exception 'Solicitud caducada o cerrada'; end if;
 for i in select * from public.billing_request_items where request_id=r.id order by payment_id loop
  select * into strict p from public.payments where id=i.payment_id;
  if p.status not in ('pending','failed') or i.snapshot is distinct from jsonb_build_object('amount',p.amount,'description',p.description,'due_date',p.due_date,'child_id',p.child_id,'ref_id',p.ref_id,'type',p.type,'covered_month',p.covered_month) or exists(select 1 from public.manual_receipt_allocations where payment_id=p.id) then raise exception 'El recibo ha cambiado; solicita un enlace nuevo'; end if;
  if exists(select 1 from public.receipt_checkout_attempts where payment_id=p.id and mode=r.mode and state in ('creating','open','paid')) or exists(select 1 from public.academy_checkout_contracts where membership_id=p.ref_id and mode=r.mode and state not in ('expired','cancelled')) then raise exception 'Hay otro pago en curso'; end if;
  if exists(select 1 from public.billing_request_items bi join public.billing_request_attempts ba on ba.request_id=bi.request_id join public.billing_requests br on br.id=bi.request_id where bi.payment_id=p.id and br.mode=r.mode and ba.state not in ('expired','cancelled')) then raise exception 'Recibo reservado por otra solicitud'; end if;
 end loop;
 insert into public.billing_request_attempts(request_id,owner_id,terms) values(r.id,owner_input,jsonb_build_object('kind',r.kind,'title',r.title,'total_cents',r.total_cents,'items',(select jsonb_agg(jsonb_build_object('amount_cents',amount_cents,'due_date',due_date) order by position) from public.billing_request_items where request_id=r.id))) returning * into a;
 update public.billing_requests set state='processing' where id=r.id;
 return a;
end $$;

create function public.collect_billing_request(attempt_input uuid,collection_input text,session_input text,subscription_input text,livemode_input boolean,amount_input bigint,due_input date)
returns void language plpgsql security invoker set search_path='' as $$
declare a public.billing_request_attempts%rowtype; r public.billing_requests%rowtype; i public.billing_request_items%rowtype; expected bigint;
begin
 select * into strict a from public.billing_request_attempts where id=attempt_input;
 perform 1 from public.payments where id in(select payment_id from public.billing_request_items where request_id=a.request_id) order by id for update;
 select * into strict a from public.billing_request_attempts where id=attempt_input for update;
 select * into strict r from public.billing_requests where id=a.request_id for update;
 if (r.mode='live') is distinct from livemode_input then raise exception 'Entorno incorrecto'; end if;
 if r.kind='payment' then
  if a.session_id is null or a.session_id is distinct from session_input then raise exception 'Sesión incorrecta'; end if; expected:=r.total_cents;
 else
  if a.subscription_id is null or a.subscription_id is distinct from subscription_input then raise exception 'Suscripción sin confirmar'; end if;
  select amount_cents into strict expected from public.billing_request_items where request_id=r.id and due_date=due_input;
 end if;
 if amount_input is distinct from expected or collection_input is null then raise exception 'Importe incorrecto'; end if;
 if exists(select 1 from public.billing_request_collections where collection_id=collection_input and attempt_id=a.id) then return; end if;
 for i in select * from public.billing_request_items where request_id=r.id and (r.kind='payment' or due_date=due_input) order by payment_id loop
  if exists(select 1 from public.billing_request_collections where attempt_id=a.id and payment_id=i.payment_id) then raise exception 'Recibo ya cobrado por otra operación'; end if;
  insert into public.billing_request_collections(collection_id,attempt_id,payment_id,amount_cents) values(collection_input,a.id,i.payment_id,i.amount_cents);
  if r.mode='live' then
   perform set_config('academy.billing_fulfillment',a.id::text,true);
   update public.payments set status='paid',method='stripe',paid_at=now(),updated_at=now(),stripe_invoice_id=case when r.kind='subscription' then collection_input else stripe_invoice_id end where id=i.payment_id and status in ('pending','failed') and amount*100=i.amount_cents;
   if not found then raise exception 'El recibo ya no coincide'; end if;
  end if;
 end loop;
 if (select count(*) from public.billing_request_collections where attempt_id=a.id)=(select count(*) from public.billing_request_items where request_id=r.id) then
  update public.billing_request_attempts set state='completed',billing_status='ended' where id=a.id;
  update public.billing_requests set state='completed' where id=r.id;
 else
  update public.billing_request_attempts set state='active',billing_status='active' where id=a.id;
  update public.billing_requests set state='active' where id=r.id;
 end if;
end $$;

-- Triggers run as a private definer solely to inspect protected lock records.
create function private.guard_billing_request_payment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.billing_request_items i join public.billing_request_attempts a on a.request_id=i.request_id join public.billing_requests r on r.id=i.request_id where i.payment_id=old.id and r.mode='live' and a.state not in ('expired','cancelled') and a.id::text is distinct from current_setting('academy.billing_fulfillment',true)) then
  if tg_op='DELETE' then raise exception 'Recibo protegido por solicitud Stripe'; end if;
  if (new.amount,new.status,new.child_id,new.ref_id,new.type,new.description,new.due_date,new.covered_month,new.method) is distinct from (old.amount,old.status,old.child_id,old.ref_id,old.type,old.description,old.due_date,old.covered_month,old.method) then raise exception 'Cancela la solicitud Stripe antes de modificar el recibo'; end if;
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.guard_billing_request_payment() from public,anon,authenticated;
create trigger protect_billing_request_payment before update or delete on public.payments for each row execute function private.guard_billing_request_payment();
create function private.guard_billing_request_other_checkout() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.payments where id=new.payment_id for update;
 if exists(select 1 from public.billing_request_items i join public.billing_request_attempts a on a.request_id=i.request_id join public.billing_requests r on r.id=i.request_id where i.payment_id=new.payment_id and r.mode=new.mode and a.state not in ('expired','cancelled')) then raise exception 'Utiliza la solicitud enviada por administración'; end if;
 return new;
end $$;
revoke all on function private.guard_billing_request_other_checkout() from public,anon,authenticated;
create trigger protect_billing_other_checkout before insert on public.receipt_checkout_attempts for each row execute function private.guard_billing_request_other_checkout();
create function private.guard_billing_manual_allocation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.payments where id=new.payment_id for update;
 if exists(select 1 from public.billing_request_items i join public.billing_request_attempts a on a.request_id=i.request_id join public.billing_requests r on r.id=i.request_id where i.payment_id=new.payment_id and r.mode='live' and a.state not in ('expired','cancelled')) then raise exception 'Cancela el cobro Stripe antes de registrar un abono manual'; end if;
 return new;
end $$;
revoke all on function private.guard_billing_manual_allocation() from public,anon,authenticated;
create trigger protect_billing_allocation before insert or update on public.manual_receipt_allocations for each row execute function private.guard_billing_manual_allocation();
create function private.guard_billing_legacy_contract() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.payments p join public.billing_request_items i on i.payment_id=p.id join public.billing_request_attempts a on a.request_id=i.request_id join public.billing_requests r on r.id=i.request_id where p.ref_id=new.membership_id and r.mode=new.mode and a.state not in ('expired','cancelled')) then raise exception 'Membresía con solicitud administrativa activa'; end if;
 return new;
end $$;
revoke all on function private.guard_billing_legacy_contract() from public,anon,authenticated;
create trigger protect_billing_legacy_contract before insert on public.academy_checkout_contracts for each row execute function private.guard_billing_legacy_contract();
revoke all on function public.create_billing_request(uuid,uuid,uuid,uuid,text,text,text,uuid[]),public.reserve_billing_request(uuid,uuid,text,bigint),public.collect_billing_request(uuid,text,text,text,boolean,bigint,date) from public,anon,authenticated;
grant execute on function public.create_billing_request(uuid,uuid,uuid,uuid,text,text,text,uuid[]),public.reserve_billing_request(uuid,uuid,text,bigint),public.collect_billing_request(uuid,text,text,text,boolean,bigint,date) to service_role;
create function public.cancel_billing_request(request_input uuid,actor_input uuid,finish_input boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.billing_requests%rowtype;
begin
 if not exists(select 1 from public.profiles where id=actor_input and role in ('admin','finance')) then raise exception 'Sin permisos'; end if;
 select * into strict r from public.billing_requests where id=request_input for update;
 if r.state='completed' then raise exception 'Solicitud cobrada: conserva el historial'; end if;
 if r.state='cancelled' then return; end if;
 if finish_input then
  if r.state<>'cancelling' or exists(select 1 from public.billing_request_attempts where request_id=r.id and state not in ('expired','cancelled')) then raise exception 'Conciliación Stripe pendiente'; end if;
  update public.billing_requests set state='cancelled' where id=r.id;
 else update public.billing_requests set state='cancelling' where id=r.id;
 end if;
end $$;
revoke all on function public.cancel_billing_request(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.cancel_billing_request(uuid,uuid,boolean) to service_role;
create function public.bind_billing_checkout(attempt_input uuid,session_input text,url_input text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare a public.billing_request_attempts%rowtype; r public.billing_requests%rowtype;
begin
 select * into strict a from public.billing_request_attempts where id=attempt_input;
 select * into strict r from public.billing_requests where id=a.request_id for update;
 select * into strict a from public.billing_request_attempts where id=attempt_input for update;
 if r.state<>'processing' or a.state not in ('creating','open') or a.expires_at<=now() then return false; end if;
 if a.session_id is not null then return a.session_id=session_input; end if;
 if session_input !~ '^cs_(live|test)_[A-Za-z0-9]+$' or url_input not like 'https://checkout.stripe.com/%' then raise exception 'Sesión no válida'; end if;
 update public.billing_request_attempts set session_id=session_input,checkout_url=url_input,state='open' where id=a.id;
 return true;
end $$;
revoke all on function public.bind_billing_checkout(uuid,text,text) from public,anon,authenticated;
grant execute on function public.bind_billing_checkout(uuid,text,text) to service_role;
