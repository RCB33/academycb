\set ON_ERROR_STOP on
-- EMPTY LOCAL DATABASE ONLY. Never run fixture DDL on production.
begin;
create role anon; create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.has_role(text[]) returns boolean language sql as $$select current_setting('test.admin',true)='yes'$$;
create function public.is_guardian_of(uuid) returns boolean language sql as $$select $1::text=current_setting('test.child',true)$$;
create table public.children(id uuid primary key);
create table public.child_guardians(child_id uuid,guardian_id uuid);
create table public.academy_settings(key text,value text);
create table public.payments(id uuid primary key default gen_random_uuid(),child_id uuid,ref_id uuid,method text,stripe_payment_intent_id text,stripe_invoice_id text,status text,amount numeric,description text,due_date date,paid_at timestamptz,updated_at timestamptz default clock_timestamp());
create table public.receipt_checkout_attempts(payment_id uuid,mode text,state text);
create table public.academy_checkout_contracts(membership_id uuid,mode text,state text);
grant usage on schema auth to authenticated;
grant select,update,insert on public.payments to authenticated;
grant select on public.children to authenticated;
\ir ../supabase/migrations/20260915164342_manual_payment_corrections.sql
\ir ../supabase/migrations/20260916034936_manual_receipt_allocations.sql
insert into auth.users values('00000000-0000-0000-0000-000000000001');
insert into children values('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
insert into child_guardians select id,'20000000-0000-0000-0000-000000000001'::uuid from children where id::text like '%0001' or id::text like '%0002';
insert into payments(id,child_id,method,status,amount,description,due_date) select id,id,'cash','pending',case when id::text like '%0001' then 80 else 50 end,'Test',current_date from children;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('test.admin','yes',true);
set local role authenticated;
do $$declare p public.payments%rowtype; q public.payments%rowtype; outsider public.payments%rowtype; first_batch uuid:=gen_random_uuid(); second_batch uuid:=gen_random_uuid(); lines jsonb; first_lines jsonb; other_lines jsonb; n int; begin
 select * into p from payments where id='10000000-0000-0000-0000-000000000001';
 select * into q from payments where id='10000000-0000-0000-0000-000000000002';
 select * into outsider from payments where id='10000000-0000-0000-0000-000000000003';
 first_lines:=jsonb_build_array(jsonb_build_object('id',p.id,'version',p.updated_at,'amount',40));
 perform public.collect_manual_batch(first_batch,first_lines,40,current_date,'cash','Partial');
 perform public.collect_manual_batch(first_batch,first_lines,40,current_date,'cash','Partial');
 if (select count(*) from manual_receipt_allocations)<>1 then raise exception 'Retry duplicated'; end if;
 if (select amount from payments where id=p.id)<>80 or (select status from payments where id=p.id)<>'pending' then raise exception 'Partial changed face amount/state'; end if;
 begin perform public.collect_manual_batch(gen_random_uuid(),first_lines,40,current_date,'cash','Stale'); raise exception 'Stale accepted'; exception when others then if sqlerrm='Stale accepted' then raise; end if; end;
 select * into p from payments where id=p.id;
 lines:=jsonb_build_array(jsonb_build_object('id',p.id,'version',p.updated_at,'amount',40),jsonb_build_object('id',q.id,'version',q.updated_at,'amount',50));
 begin perform public.collect_manual_batch(gen_random_uuid(),lines,100,current_date,'transfer','Bad total'); raise exception 'Wrong total accepted'; exception when others then if sqlerrm='Wrong total accepted' then raise; end if; end;
 other_lines:=jsonb_build_array(jsonb_build_object('id',p.id,'version',p.updated_at,'amount',40),jsonb_build_object('id',outsider.id,'version',outsider.updated_at,'amount',50));
 begin perform public.collect_manual_batch(gen_random_uuid(),other_lines,90,current_date,'transfer','Wrong family'); raise exception 'Wrong family accepted'; exception when others then if sqlerrm='Wrong family accepted' then raise; end if; end;
 begin perform public.collect_manual_batch(gen_random_uuid(),jsonb_build_array(jsonb_build_object('id',p.id,'version',p.updated_at,'amount',41)),41,current_date,'cash','Too much'); raise exception 'Overpay accepted'; exception when others then if sqlerrm='Overpay accepted' then raise; end if; end;
 if (select count(*) from manual_collection_batches)<>1 then raise exception 'Failed request persisted'; end if;
 perform public.collect_manual_batch(second_batch,lines,90,current_date,'transfer','Siblings');
 if (select count(*) from payments where status='paid')<>2 then raise exception 'Siblings not paid'; end if;
 if (select sum(amount) from manual_receipt_allocations where voided_at is null)<>130 then raise exception 'Revenue mismatch'; end if;
 begin update payments set amount=1 where id=p.id; raise exception 'Allocation receipt editable'; exception when others then if sqlerrm='Allocation receipt editable' then raise; end if; end;
 perform public.void_manual_batch(second_batch,'Duplicate transfer');
 perform public.void_manual_batch(second_batch,'Retry duplicate');
 if (select count(*) from payments where status='paid')<>0 then raise exception 'Void failed'; end if;
 if (select sum(amount) from manual_receipt_allocations where voided_at is null)<>40 then raise exception 'Void lost original partial'; end if;
 if (select count(*) from manual_receipt_allocations)<>3 then raise exception 'History deleted'; end if;
 perform public.reassign_manual_payment(outsider.id,outsider.updated_at,p.child_id,'Wrong child selected');
 if (select child_id from payments where id=outsider.id)<>p.child_id then raise exception 'Reassign failed'; end if;
 if not exists(select 1 from manual_payment_history where payment_id=outsider.id and before_value->>'child_id'<>after_value->>'child_id') then raise exception 'Reassignment history missing'; end if;
 select * into p from payments where id=p.id;
 begin perform public.reassign_manual_payment(p.id,p.updated_at,q.child_id,'Wrong child selected'); raise exception 'Allocated reassignment accepted'; exception when others then if sqlerrm='Allocated reassignment accepted' then raise; end if; end;
 begin delete from manual_receipt_allocations; raise exception 'Ledger deletion allowed'; exception when insufficient_privilege then null; end;
 perform set_config('test.admin','no',true); perform set_config('test.child',q.child_id::text,true);
 if exists(select 1 from manual_receipt_allocations where payment_id<>q.id) then raise exception 'Guardian can see sibling ledger without permission'; end if;
 if exists(select 1 from manual_collection_batches) then raise exception 'Guardian sees family totals'; end if;
 begin perform public.collect_manual_batch(gen_random_uuid(),lines,90,current_date,'cash','Unauthorized'); raise exception 'Unauthorized accepted'; exception when others then if sqlerrm='Unauthorized accepted' then raise; end if; end;
end $$;
reset role;
-- New Stripe checkout is blocked for a partially collected receipt.
do $$begin
 begin insert into receipt_checkout_attempts values('10000000-0000-0000-0000-000000000001','live','open'); raise exception 'Stripe overcharge allowed'; exception when others then if sqlerrm='Stripe overcharge allowed' then raise; end if; end;
end $$;
rollback;
\echo Manual allocations, siblings, permissions, history and Stripe protection: PASS
