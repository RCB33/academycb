\set ON_ERROR_STOP on
-- Empty LOCAL test database only. All fixtures roll back.
begin;
create role anon; create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.has_role(text[]) returns boolean language sql as $$select current_setting('test.admin',true)='yes'$$;
create table public.payments(id uuid primary key default gen_random_uuid(), ref_id uuid, method text, stripe_payment_intent_id text, stripe_invoice_id text, status text, amount numeric, description text, due_date date, paid_at timestamptz, updated_at timestamptz default clock_timestamp());
grant usage on schema auth to authenticated;
grant select,update on public.payments to authenticated;
\ir ../supabase/migrations/20260915164342_manual_payment_corrections.sql
insert into auth.users values('00000000-0000-0000-0000-000000000001');
insert into public.payments(id,method,status,amount,description,due_date) values('00000000-0000-0000-0000-000000000002','cash','paid',50,'Original','2026-09-15');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('test.admin','yes',true);
set local role authenticated;
do $$declare p public.payments%rowtype; n int; begin
 select * into p from public.payments limit 1;
 perform public.correct_manual_payment(p.id,p.updated_at,'edit','Importe mal escrito',60,'Corregido','2026-09-15','transfer');
 if (select amount from public.payments where id=p.id)<>60 then raise exception 'Edit failed'; end if;
 if (select count(*) from public.manual_payment_history)<>1 then raise exception 'Audit missing'; end if;
 begin
  perform public.correct_manual_payment(p.id,p.updated_at,'cancel','Duplicado');
  raise exception 'Stale version accepted';
 exception when others then if sqlerrm='Stale version accepted' then raise; end if; end;
 select * into p from public.payments where id=p.id;
 perform public.correct_manual_payment(p.id,p.updated_at,'cancel','Duplicado confirmado');
 if (select status from public.payments where id=p.id)<>'cancelled' then raise exception 'Cancel failed'; end if;
 if (select sum(amount) from public.payments where status in ('paid','pending','failed')) is not null then raise exception 'Cancelled counted'; end if;
 select * into p from public.payments where id=p.id;
 begin
  perform public.correct_manual_payment(p.id,p.updated_at,'edit','Reabrir anulado',10,'Otro','2026-09-15','cash');
  raise exception 'Cancelled edited';
 exception when others then if sqlerrm='Cancelled edited' then raise; end if; end;
 begin delete from public.manual_payment_history; raise exception 'Audit deletion allowed'; exception when insufficient_privilege then null; end;
 perform set_config('test.admin','no',true);
 select count(*) into n from public.manual_payment_history;
 if n<>0 then raise exception 'Non admin can read audit'; end if;
 begin perform public.correct_manual_payment(p.id,p.updated_at,'cancel','Duplicado'); raise exception 'Non admin accepted'; exception when others then if sqlerrm='Non admin accepted' then raise; end if; end;
end $$;
reset role;
select set_config('test.admin','yes',true);
update public.payments set status='paid',method='stripe',stripe_payment_intent_id='pi_protected';
set local role authenticated;
do $$declare p public.payments%rowtype; begin
 select * into p from public.payments limit 1;
 begin perform public.correct_manual_payment(p.id,p.updated_at,'cancel','Duplicado'); raise exception 'Stripe accepted'; exception when others then if sqlerrm='Stripe accepted' then raise; end if; end;
end $$;
reset role;
rollback;
\echo Manual payment corrections: PASS
