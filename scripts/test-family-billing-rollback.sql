-- Real schema and RLS, synthetic family only. No provider API or emails; all reverted.
begin;
do $$
declare actor uuid; owner uuid:=gen_random_uuid(); batch uuid:=gen_random_uuid(); first_request uuid:=gen_random_uuid(); second_request uuid:=gen_random_uuid();
 p public.membership_plans%rowtype; g public.teams%rowtype; payload jsonb; details jsonb; result jsonb; ctx jsonb; a public.billing_request_attempts%rowtype;
 first_child uuid; second_child uuid; guardian uuid; initial numeric; total bigint; baseline text; fixtures uuid[]; suffix text:=gen_random_uuid()::text;
begin
 select id into strict actor from public.profiles where role='admin' order by id limit 1;
 select * into strict p from public.membership_plans where is_active and sessions_per_week=1 and season_end='2027-05-31' order by created_at limit 1;
 select * into strict g from public.teams where status='active' and (public_offer->>'published')::boolean and public_offer->>'kind'='field' and public_offer->>'birth_from' is null and max_players is null order by created_at limit 1;
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into baseline from public.payments x;
 details:=jsonb_build_object('plan',to_jsonb(p),'groups',jsonb_build_array(to_jsonb(g)),'start_date','2026-12-16','payment_choice','monthly_card','quote',jsonb_build_object('plus',50));
 payload:=jsonb_build_array(
  jsonb_build_object('enrollments',jsonb_build_array(jsonb_build_object('id',first_request,'service','academy','activity_name','QA FAMILY','child_name','QA FAMILY ONE '||suffix,'birth_date','2011-12-10','guardian_name','QA FAMILY','email','qa-family-'||suffix||'@example.invalid','phone','600000000','submitted_by',null,'academy_details',details))),
  jsonb_build_object('enrollments',jsonb_build_array(jsonb_build_object('id',second_request,'service','academy','activity_name','QA FAMILY','child_name','QA FAMILY TWO '||suffix,'birth_date','2012-12-10','guardian_name','QA FAMILY','email','qa-family-'||suffix||'@example.invalid','phone','600000000','submitted_by',null,'academy_details',details||jsonb_build_object('start_date','2027-01-23','quote',jsonb_build_object('plus',0))))));
 result:=public.submit_family_enrollment(batch,null,repeat('a',64),payload);
 if jsonb_array_length(result)<>2 or (select count(*) from public.family_billing_members where batch_id=batch)<>2 then raise exception 'Missing group on submit';end if;
 perform public.submit_family_enrollment(batch,null,repeat('a',64),payload);
 if (select count(*) from public.family_billing_members where batch_id=batch)<>2 then raise exception 'Duplicate submission';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 ctx:=public.academy_request_review_context(first_request);
 first_child:=public.accept_reviewed_academy_request(first_request,'2026-12-16',true,ctx->>'revision');
 execute 'reset role';
 if public.prepare_family_billing(batch,actor,'test')->>'status'<>'waiting_family' then raise exception 'Created payment before second review';end if;
 execute 'set local role authenticated';
 ctx:=public.academy_request_review_context(second_request);
 second_child:=public.accept_reviewed_academy_request(second_request,'2027-01-23',false,ctx->>'revision');
 execute 'reset role';
 fixtures:=array[first_child,second_child];
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(owner,'qa-family-'||suffix||'@example.invalid',now(),'{"full_name":"QA FAMILY"}');
 select cg.guardian_id into strict guardian from public.child_guardians cg where cg.child_id=first_child;
 update public.guardians set user_id=owner where id=guardian;
 result:=public.prepare_family_billing(batch,actor,'test');
 if result->>'status'<>'ready' then raise exception 'Missing ready family';end if;
 initial:=round(p.price*0.5,2)+p.enrollment_fee+50+round(p.price*0.25,2);
 if (select sum(amount_cents) from public.billing_request_items where request_id=batch and phase='initial')<>initial*100 then raise exception 'Wrong proration or extra';end if;
 if (select sum(amount_cents) from public.billing_request_items where request_id=batch and phase='recurring' and due_date='2027-02-01')<>p.price*200 then raise exception 'Wrong monthly sum';end if;
 select total_cents into total from public.billing_requests where id=batch;
 a:=public.reserve_billing_request(batch,owner,'test',total);
 perform public.bind_billing_checkout(a.id,'cs_test_QAFamily','https://checkout.stripe.com/test');
 perform public.collect_billing_initial(a.id,'cs_test_QAFamily',false,(initial*100)::bigint);
 update public.billing_request_attempts set subscription_id='sub_QAFamily' where id=a.id;
 perform public.collect_billing_request(a.id,'in_QAFamily',null,'sub_QAFamily',false,(p.price*200)::bigint,'2027-02-01');
 perform public.collect_billing_request(a.id,'in_QAFamily',null,'sub_QAFamily',false,(p.price*200)::bigint,'2027-02-01');
 if (select count(*) from public.billing_request_collections where attempt_id=a.id and collection_id='in_QAFamily')<>2 then raise exception 'Missing per-child allocation';end if;
 if exists(select 1 from public.payments where child_id=any(fixtures) and status='paid') then raise exception 'Test marked real income';end if;
 if baseline is distinct from (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.payments x where child_id is null or not(child_id=any(fixtures))) then raise exception 'Historical payments changed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if not exists(select 1 from public.billing_requests where id=batch) then raise exception 'Owner blocked';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: new family submission, independent reviewed approval, one link, proration/fee/Plus, same tutor, grouped TEST collection, per-child ledger, RLS; all fixtures reverted' as result,
 count(*) as payments,md5(string_agg(to_jsonb(p)::text,'' order by id)) as digest from public.payments p;
