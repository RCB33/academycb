\set ON_ERROR_STOP on
-- EMPTY LOCAL DATABASE ONLY. Every fixture rolls back; never run in production.
begin;
create role anon; create role authenticated; create role service_role;
create schema auth; create schema private;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.has_role(text[]) returns boolean language sql as $$select false$$;
create table public.payments(id uuid primary key default gen_random_uuid(),type text,ref_id uuid,child_id uuid,amount numeric,status text,method text,paid_at timestamptz,description text,concept_code text,stripe_payment_intent_id text);
create table public.event_registrations(id uuid primary key default gen_random_uuid(),user_id uuid,child_id uuid,status text,approved_amount numeric,approved_tournaments text[],due_date date,payment_id uuid,updated_at timestamptz);
create table public.event_registration_history(registration_id uuid,actor_id uuid,action text,note text);
create table public.notifications(user_id uuid,title text,message text,type text,link_url text);
\ir ../supabase/migrations/20261109103141_stripe_production_event_receipts.sql

do $$
declare u uuid:=gen_random_uuid(); other_u uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); a public.event_checkout_attempts%rowtype; b public.event_checkout_attempts%rowtype;
begin
 insert into auth.users values(u,now()),(other_u,now());
 insert into public.event_registrations(id,user_id,child_id,status,approved_amount,approved_tournaments,due_date) values(r,u,gen_random_uuid(),'requested',150,array['winter'],current_date+5);
 begin perform public.reserve_event_checkout(r,u,'live','https://www.academycostabrava.com'); raise exception 'unapproved accepted'; exception when others then if sqlerrm='unapproved accepted' then raise; end if; end;
 update public.event_registrations set status='awaiting_payment' where id=r;
 begin perform public.reserve_event_checkout(r,other_u,'live','https://www.academycostabrava.com'); raise exception 'foreign owner accepted'; exception when others then if sqlerrm='foreign owner accepted' then raise; end if; end;
 a:=public.reserve_event_checkout(r,u,'test','https://example.com'); b:=public.reserve_event_checkout(r,u,'test','https://example.com');
 if a.id<>b.id then raise exception 'duplicate session'; end if;
 update public.event_checkout_attempts set state='open',stripe_session_id='cs_test_event' where id=a.id;
 begin perform public.confirm_event_checkout('evt_bad','checkout.session.completed',a.id,'cs_test_event',false,1,'eur','paid','pi_test'); raise exception 'wrong amount accepted'; exception when others then if sqlerrm='wrong amount accepted' then raise; end if; end;
 begin perform public.confirm_event_checkout('evt_bad_mode','checkout.session.completed',a.id,'cs_test_event',true,15000,'eur','paid','pi_test'); raise exception 'wrong mode accepted'; exception when others then if sqlerrm='wrong mode accepted' then raise; end if; end;
 perform public.confirm_event_checkout('evt_test','checkout.session.completed',a.id,'cs_test_event',false,15000,'eur','paid','pi_test');
 if exists(select 1 from public.payments) or (select status from public.event_registrations where id=r)<>'awaiting_payment' then raise exception 'test altered real accounting'; end if;
 a:=public.reserve_event_checkout(r,u,'live','https://www.academycostabrava.com');
 update public.event_checkout_attempts set state='open',stripe_session_id='cs_live_event' where id=a.id;
 begin update public.event_registrations set status='proof_review' where id=r; raise exception 'transfer raced checkout'; exception when others then if sqlerrm='transfer raced checkout' then raise; end if; end;
 begin update public.event_registrations set approved_amount=200 where id=r; raise exception 'price changed during checkout'; exception when others then if sqlerrm='price changed during checkout' then raise; end if; end;
 begin update public.event_registrations set user_id=other_u where id=r; raise exception 'owner changed during checkout'; exception when others then if sqlerrm='owner changed during checkout' then raise; end if; end;
 perform public.confirm_event_checkout('evt_live','checkout.session.completed',a.id,'cs_live_event',true,15000,'eur','paid','pi_live');
 perform public.confirm_event_checkout('evt_live','checkout.session.completed',a.id,'cs_live_event',true,15000,'eur','paid','pi_live');
 perform public.confirm_event_checkout('evt_second','checkout.session.async_payment_succeeded',a.id,'cs_live_event',true,15000,'eur','paid','pi_live');
 perform public.confirm_event_checkout('evt_late','checkout.session.expired',a.id,'cs_live_event',true,15000,'eur','unpaid',null);
 if (select count(*) from public.payments)<>1 or (select sum(amount) from public.payments)<>150 then raise exception 'duplicate or wrong paid receipt'; end if;
 if (select status from public.event_registrations where id=r)<>'confirmed' or (select state from public.event_checkout_attempts where id=a.id)<>'paid' then raise exception 'confirmation lost'; end if;
 if (select count(*) from public.notifications)<>1 or (select count(*) from public.event_registration_history)<>1 then raise exception 'duplicate history'; end if;
 if has_function_privilege('authenticated','public.reserve_event_checkout(uuid,uuid,text,text)','EXECUTE') or has_function_privilege('anon','public.confirm_event_checkout(text,text,uuid,text,boolean,bigint,text,text,text)','EXECUTE') then raise exception 'writer exposed'; end if;
 perform set_config('request.jwt.claim.sub',other_u::text,true);
 set local role authenticated;
 if exists(select 1 from public.event_checkout_attempts) then raise exception 'foreign attempt exposed'; end if;
 reset role;
 perform set_config('request.jwt.claim.sub',u::text,true);
 set local role authenticated;
 if (select count(*) from public.event_checkout_attempts)<>2 then raise exception 'owner cannot read attempts'; end if;
 reset role;
 raise notice 'PASS: approval, ownership, exact amount, mode isolation, duplicate clicks/events, manual race, immutable price/owner, accounting, late expiry, RLS and RPC grants.';
end $$;
rollback;
