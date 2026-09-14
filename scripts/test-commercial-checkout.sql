\set ON_ERROR_STOP on
-- EMPTY LOCAL DATABASE ONLY. Do not run these fixtures in Supabase production.
begin;
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function public.has_role(text[]) returns boolean language sql as $$select false$$;
create table public.profiles(id uuid,role text);
create table public.guardians(id uuid,user_id uuid);
create table public.child_guardians(child_id uuid,guardian_id uuid);
create table public.orders(id uuid,customer_email text,status text);
create table public.campus_enrollments(id uuid,status text);
create table public.payments(id uuid primary key default gen_random_uuid(),type text,ref_id uuid,child_id uuid,amount numeric,status text,method text,description text,paid_at timestamptz,due_date date,stripe_payment_intent_id text,stripe_invoice_id text,created_at timestamptz default now(),updated_at timestamptz default now());
create table public.membership_plans(id uuid primary key,name text,is_active boolean,full_payment_enabled boolean,monthly_payment_enabled boolean,full_payment_price numeric,monthly_payment_price numeric,enrollment_fee numeric,duration_months integer);
create table public.academy_memberships(id uuid primary key,child_id uuid,plan_id uuid,status text,payment_method text,payment_status text);
\ir ../supabase/migrations/20260914193102_receipt_checkout_ledger.sql
\ir ../supabase/migrations/20260914193103_academy_checkout_contracts.sql
do $$
declare u uuid:=gen_random_uuid(); other_u uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); child uuid:=gen_random_uuid(); receipt uuid:=gen_random_uuid(); membership uuid:=gen_random_uuid(); plan uuid:=gen_random_uuid(); a public.receipt_checkout_attempts%rowtype; b public.receipt_checkout_attempts%rowtype; c public.academy_checkout_contracts%rowtype; snapshot_total bigint;
begin
 insert into auth.users values(u,'qa@example.com',now()),(other_u,'other@example.com',now());
 insert into public.guardians values(g,u); insert into public.child_guardians values(child,g);
 insert into public.payments(id,type,child_id,amount,status,description) values(receipt,'other',child,25,'pending','Test');
 begin
  perform public.reserve_receipt_checkout(receipt,other_u,'test','https://example.com');
  raise exception 'Foreign guardian accepted';
 exception when others then if sqlerrm='Foreign guardian accepted' then raise; end if; end;
 a:=public.reserve_receipt_checkout(receipt,u,'test','https://example.com');
 b:=public.reserve_receipt_checkout(receipt,u,'test','https://example.com');
 if a.id<>b.id then raise exception 'Double click created another attempt'; end if;
 update public.receipt_checkout_attempts set stripe_session_id='cs_test_fixture',state='open' where id=a.id;
 begin
  perform public.confirm_receipt_checkout('evt_wrong','checkout.session.completed',a.id,'cs_test_fixture',false,1,'eur','paid','pi_test');
  raise exception 'Wrong amount accepted';
 exception when others then if sqlerrm='Wrong amount accepted' then raise; end if; end;
 perform public.confirm_receipt_checkout('evt_test','checkout.session.completed',a.id,'cs_test_fixture',false,2500,'eur','paid','pi_test');
 perform public.confirm_receipt_checkout('evt_test','checkout.session.completed',a.id,'cs_test_fixture',false,2500,'eur','paid','pi_test');
 perform public.confirm_receipt_checkout('evt_late','checkout.session.expired',a.id,'cs_test_fixture',false,2500,'eur','unpaid',null);
 if (select status from public.payments where id=receipt)<>'pending' then raise exception 'Test changed real ledger'; end if;
 if (select state from public.receipt_checkout_attempts where id=a.id)<>'paid' then raise exception 'Late expiration undid payment'; end if;
 a:=public.reserve_receipt_checkout(receipt,u,'live','https://example.com');
 update public.receipt_checkout_attempts set stripe_session_id='cs_live_fixture',state='open' where id=a.id;
 begin
  update public.payments set status='paid' where id=receipt;
  raise exception 'Manual payment raced Stripe';
 exception when others then if sqlerrm='Manual payment raced Stripe' then raise; end if; end;
 perform public.confirm_receipt_checkout('evt_live','checkout.session.completed',a.id,'cs_live_fixture',true,2500,'eur','paid','pi_live');
 if (select status from public.payments where id=receipt)<>'paid' then raise exception 'Live collection missing'; end if;

 insert into public.membership_plans values(plan,'Plan test',true,true,true,100,30,10,3);
 insert into public.academy_memberships values(membership,child,plan,'active','transfer','pending');
 insert into public.payments(type,ref_id,child_id,amount,status) values('academy',membership,child,30,'pending');
 c:=public.reserve_academy_contract(membership,u,'test','monthly','https://example.com'); snapshot_total:=c.total_cents;
 update public.membership_plans set monthly_payment_price=90,duration_months=6 where id=plan;
 c:=public.reserve_academy_contract(membership,u,'test','monthly','https://example.com');
 if c.total_cents<>snapshot_total or c.months<>3 then raise exception 'Contract repriced'; end if;
 update public.academy_checkout_contracts set stripe_subscription_id='sub_test',state='active' where id=c.id;
 perform public.collect_academy_contract(c.id,'in_first','sub_test',null,false,4000,true);
 perform public.collect_academy_contract(c.id,'in_first','sub_test',null,false,4000,true);
 perform public.collect_academy_contract(c.id,'in_second','sub_test',null,false,3000,false);
 perform public.collect_academy_contract(c.id,'in_third','sub_test',null,false,3000,false);
 if (select state from public.academy_checkout_contracts where id=c.id)<>'completed' then raise exception 'Finite contract not completed'; end if;
 if (select count(*) from public.academy_contract_collections where contract_id=c.id)<>3 then raise exception 'Duplicate collection'; end if;
 if exists(select 1 from public.payments where ref_id=membership and status<>'pending') then raise exception 'Test subscription changed real receipts'; end if;
 begin
  perform public.collect_academy_contract(c.id,'in_extra','sub_test',null,false,3000,false);
  raise exception 'Fourth month accepted';
 exception when others then if sqlerrm='Fourth month accepted' then raise; end if; end;
 c:=public.reserve_academy_contract(membership,u,'live','full','https://example.com');
 update public.academy_checkout_contracts set stripe_session_id='cs_full',state='open' where id=c.id;
 perform public.collect_academy_contract(c.id,'cs_full',null,'cs_full',true,11000,true);
 if (select count(*) from public.payments where ref_id=membership and status='paid')<>1 then raise exception 'Full collection missing/duplicated'; end if;
 if exists(select 1 from public.payments where ref_id=membership and status='pending') then raise exception 'Legacy schedule still pending after full payment'; end if;
 if has_function_privilege('anon','public.reserve_receipt_checkout(uuid,uuid,text,text)','EXECUTE') or has_function_privilege('authenticated','public.collect_academy_contract(uuid,text,text,text,boolean,bigint,boolean)','EXECUTE') then raise exception 'Privileged RPC exposed'; end if;
 raise notice 'PASS: ownership, duplicate clicks/events, amount binding, test isolation, manual race lock, immutable plans, one-time fee, finite installments, full payment reconciliation, restricted RPCs.';
end;
$$;
grant usage on schema auth to authenticated;
do $$
declare own_user uuid; expected integer; visible integer;
begin
 select id into own_user from auth.users where email='qa@example.com';
 select count(*) into expected from public.academy_contract_collections;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 set local role authenticated;
 select count(*) into visible from public.academy_contract_collections;
 if visible<>0 then raise exception 'Foreign family can read collections'; end if;
 select count(*) into visible from public.receipt_checkout_attempts;
 if visible<>0 then raise exception 'Foreign family can read checkout attempts'; end if;
 perform set_config('request.jwt.claim.sub',own_user::text,true);
 select count(*) into visible from public.academy_contract_collections;
 if visible<>expected then raise exception 'Owner cannot read their collection history'; end if;
 reset role;
 raise notice 'PASS: authenticated RLS isolates families and exposes only owned collection history.';
end;
$$;
rollback;
