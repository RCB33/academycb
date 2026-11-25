-- Synthetic families only. No Auth, bank or email provider API calls. Always rollback.
begin;
do $$
declare admin_id uuid; owner uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); suffix text:=gen_random_uuid()::text;
 t public.tournaments_internal%rowtype; details jsonb; payload jsonb; req uuid; duplicate uuid; child uuid; first_child uuid;
 plan text; amounts integer[]; total integer; baseline text; original_ids uuid[]; run integer:=0;
begin
 select id into strict admin_id from public.profiles where role='admin' order by id limit 1;
 select array_agg(id),md5(string_agg(to_jsonb(p)::text,'' order by id)) into original_ids,baseline from public.payments p;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  (owner,'qa-travel-'||suffix||'@example.invalid',now(),'{}'),(outsider,'qa-other-'||suffix||'@example.invalid',now(),'{}');
 update public.tournaments_internal set status='open' where id in ('15f0483d-26a8-450e-a6a8-8f7a7c957277','9b6c8ac0-a542-49ab-a116-6679c8640932','c93d7e14-a316-4dab-b240-a6e4b3d0ee81');
 if has_function_privilege('anon','public.submit_travel_tournament_request(uuid,text,jsonb)','execute') or has_function_privilege('authenticated','public.submit_travel_tournament_request(uuid,text,jsonb)','execute') then raise exception 'Submission RPC exposed'; end if;
 if has_function_privilege('anon','public.accept_travel_tournament_request(uuid,text,integer,text)','execute') then raise exception 'Acceptance exposed'; end if;
 for t in select * from public.tournaments_internal where id in ('15f0483d-26a8-450e-a6a8-8f7a7c957277','9b6c8ac0-a542-49ab-a116-6679c8640932','c93d7e14-a316-4dab-b240-a6e4b3d0ee81') order by id loop
  foreach plan in array array['monthly','two'] loop
   run:=run+1;req:=gen_random_uuid();
   amounts:=case when t.price=450 then case when plan='two' then array[21500,21500] else array[11250,11250,11250,11250] end
    when t.price=1025 then case when plan='two' then array[51250,51250] else array[15000,15000,15000,15000,15000,15000,12500] end
    else case when plan='two' then array[29950,29950] else array[10000,10000,10000,10000,10000,9900] end end;
   select sum(x) into total from unnest(amounts) x;
   details:=jsonb_build_object('version','travel-2027-v1','offer_version',repeat('a',64),'payment_choice','transfer','plan_choice',plan,
    'total_cents',total,'installments_cents',to_jsonb(amounts),'image_consent',false,'club','QA only','position','field',
    'tournament',jsonb_build_object('id',t.id,'title',t.title,'start_date',t.start_date,'end_date',t.end_date,'accommodation','QA','flight_excluded',t.price=450));
   payload:=jsonb_build_object('request_id',req,'tournament_id',t.id,'offer_version',repeat('a',64),'plan_choice',plan,'payment_choice','transfer',
    'child_id',null,'child_name','QA TRAVEL '||run||' '||suffix,'birth_date','2015-06-01','guardian_name','QA TRAVEL '||suffix,'phone','600000000',
    'club','QA only','position','field','image_consent',false,'privacy_consent',true,'terms_consent',true,'participation_consent',true,'details',details,'summary','QA isolated','notes','rollback','website','');
   perform set_config('request.jwt.claim.sub','',true);execute 'set local role service_role';
   begin perform public.submit_travel_tournament_request(owner,'qa-travel-'||suffix||'@example.invalid',jsonb_set(payload,'{details,total_cents}','1'));raise exception 'TEST: forged price accepted';
   exception when others then if SQLERRM='TEST: forged price accepted' then raise; end if;end;
   begin perform public.submit_travel_tournament_request(owner,'qa-travel-'||suffix||'@example.invalid',payload||'{"privacy_consent":false}');raise exception 'TEST: missing consent accepted';
   exception when others then if SQLERRM='TEST: missing consent accepted' then raise; end if;end;
   if public.submit_travel_tournament_request(owner,'qa-travel-'||suffix||'@example.invalid',payload)<>req then raise exception 'Request ID changed';end if;
   if public.submit_travel_tournament_request(owner,'qa-travel-'||suffix||'@example.invalid',payload)<>req then raise exception 'Retry duplicated';end if;
   duplicate:=public.submit_travel_tournament_request(owner,'qa-travel-'||suffix||'@example.invalid',payload||jsonb_build_object('request_id',gen_random_uuid()));
   if duplicate<>req then raise exception 'Natural duplicate not stopped';end if;
   execute 'reset role';
   if (select status from public.enrollment_requests where id=req)<>'new' then raise exception 'Request prematurely accepted';end if;
   if (select count(*) from public.registration_email_outbox where source_id=req and event_kind='received')<>1 then raise exception 'Received mail missing or duplicated';end if;
   perform set_config('request.jwt.claim.sub',owner::text,true);execute 'set local role authenticated';
   begin perform public.accept_travel_tournament_request(req,repeat('a',64),total,plan);raise exception 'TEST: guardian accepted request';
   exception when others then if SQLERRM='TEST: guardian accepted request' then raise;end if;end;
   execute 'reset role';perform set_config('request.jwt.claim.sub',admin_id::text,true);execute 'set local role authenticated';
   begin perform public.accept_travel_tournament_request(req,repeat('b',64),total,plan);raise exception 'TEST: stale review accepted';
   exception when others then if SQLERRM='TEST: stale review accepted' then raise;end if;end;
   child:=public.accept_travel_tournament_request(req,repeat('a',64),total,plan);
   if public.accept_travel_tournament_request(req,repeat('a',64),total,plan)<>child then raise exception 'Acceptance retry changed child';end if;
   execute 'reset role';
   if (select count(*) from public.payments where child_id=child)<>1 then raise exception 'Duplicate receipt';end if;
   if not exists(select 1 from public.payments where child_id=child and amount=total/100.0 and status='pending' and method='transferencia' and due_date is null and paid_at is null) then raise exception 'Wrong manual receivable';end if;
   if not exists(select 1 from public.tournament_players where child_id=child and tournament_id=t.id and status='confirmed') then raise exception 'Missing tournament player link';end if;
   if (select count(*) from public.registration_email_outbox where source_id=req and event_kind='reviewed')<>1 then raise exception 'Acceptance mail missing or duplicated';end if;
   if first_child is null then first_child:=child;end if;
  end loop;
 end loop;
 update public.guardians set user_id=owner where email='qa-travel-'||suffix||'@example.invalid';
 perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
 if exists(select 1 from public.payments where child_id=first_child) then raise exception 'Other family can read receipt';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',owner::text,true);execute 'set local role authenticated';
 if not exists(select 1 from public.payments where child_id=first_child) then raise exception 'Owner cannot read receipt';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub','',true);execute 'set local role service_role';
 begin perform public.submit_travel_tournament_request(outsider,'qa-other-'||suffix||'@example.invalid',payload||jsonb_build_object('request_id',gen_random_uuid(),'child_id',first_child));raise exception 'TEST: foreign child accepted';
 exception when others then if SQLERRM='TEST: foreign child accepted' then raise;end if;end;
 execute 'reset role';
 if baseline is distinct from (select md5(string_agg(to_jsonb(p)::text,'' order by id)) from public.payments p where id=any(original_ids)) then raise exception 'Existing payments changed';end if;
end $$;
rollback;
select 'PASS: six plans, consent and price tampering, duplicate submission/approval, permissions, family isolation, pending transfer receipts and exactly-once mail queue; rolled back' result,
count(*) payments,md5(string_agg(to_jsonb(p)::text,'' order by id)) digest from public.payments p;
