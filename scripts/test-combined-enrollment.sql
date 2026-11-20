-- Execute after migration inside a transaction, always rollback. Never deliver outbox.
do $$
declare u uuid=gen_random_uuid(); b uuid=gen_random_uuid(); b2 uuid=gen_random_uuid(); output jsonb; again jsonb; players jsonb; e jsonb; t jsonb; child uuid; failed boolean; before_digest text;
begin
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into before_digest from public.payments p;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(u,'qa-combined-'||u||'@example.invalid',now(),'{}');
 e=jsonb_build_object('id',gen_random_uuid(),'service','academy','activity_id',null,'activity_name','QA ACADEMY','child_name','QA COMBINED ROLLBACK','birth_date','2016-01-01','guardian_name','QA TUTOR','email','qa-combined-'||u||'@example.invalid','phone','600000000','submitted_by',u,'linked_child_id',null);
 t=jsonb_build_object('payload',jsonb_build_object('request_id',gen_random_uuid(),'child_id',null,'child_name','QA COMBINED ROLLBACK','birth_date','2016-01-01','guardian_name','QA TUTOR','phone','600000000','tournaments',jsonb_build_array('231','champions'),'owns_kit',true),'quote',120);
 players=jsonb_build_array(jsonb_build_object('enrollments',jsonb_build_array(e,e||jsonb_build_object('id',gen_random_uuid(),'service','campus','activity_name','QA CAMPUS')),'event',t));
 execute 'set local role service_role';
 output=public.submit_combined_enrollment(b,u,repeat('a',64),players);
 execute 'reset role';
 if jsonb_array_length(output)<>3 then raise exception 'Missing services'; end if;
 again=public.submit_combined_enrollment(b,u,repeat('a',64),players);
 if output<>again then raise exception 'Retry changed result'; end if;
 select child_id into child from public.event_registrations where id=(output->0->>'id')::uuid;
 if (select count(*) from public.enrollment_requests where linked_child_id=child)<>2 then raise exception 'Combined child link missing'; end if;
 if (select count(*) from public.registration_email_outbox where source_id in (select (value->>'id')::uuid from jsonb_array_elements(output)))<>3 then raise exception 'Receipt email not queued for every activity'; end if;
 failed=false;
 begin perform public.submit_combined_enrollment(b,u,repeat('b',64),players); exception when others then failed=true; end;
 if not failed then raise exception 'Changed retry accepted'; end if;
 failed=false;
 begin perform public.submit_combined_enrollment(b,null,repeat('a',64),players); exception when others then failed=true; end;
 if not failed then raise exception 'Batch visible to different actor'; end if;
 -- Academy + campus without tournaments also create only one verified ficha.
 e=e||jsonb_build_object('id',gen_random_uuid(),'child_name','QA TWO ACTIVITIES');
 again=public.submit_combined_enrollment(gen_random_uuid(),u,repeat('d',64),jsonb_build_array(jsonb_build_object('enrollments',jsonb_build_array(e,e||jsonb_build_object('id',gen_random_uuid(),'service','campus','activity_name','QA CAMPUS')))));
 if (select count(distinct linked_child_id) from public.enrollment_requests where id in (select (value->>'id')::uuid from jsonb_array_elements(again)))<>1 then raise exception 'Two-activity child duplicated'; end if;
 -- A successful first insert followed by an invalid service must roll back both.
 e=e||jsonb_build_object('id',gen_random_uuid(),'child_name','QA ATOMIC ROLLBACK');
 failed=false;
 begin perform public.submit_combined_enrollment(b2,u,repeat('c',64),jsonb_build_array(jsonb_build_object('enrollments',jsonb_build_array(e,e||jsonb_build_object('id',gen_random_uuid(),'service','invalid'))))); exception when others then failed=true; end;
 if not failed or exists(select 1 from public.enrollment_requests where id=(e->>'id')::uuid) or exists(select 1 from private.combined_enrollment_submissions where id=b2) then raise exception 'Partial write survived'; end if;
 if has_function_privilege('authenticated','public.submit_combined_enrollment(uuid,uuid,text,jsonb)','execute') or has_function_privilege('anon','public.submit_combined_enrollment(uuid,uuid,text,jsonb)','execute') then raise exception 'Public RPC exposed'; end if;
 if has_table_privilege('authenticated','private.combined_enrollment_submissions','select') then raise exception 'Batch data exposed'; end if;
 if (select md5(string_agg(to_jsonb(p)::text,'' order by id)) from public.payments p) is distinct from before_digest then raise exception 'Payments changed'; end if;
 execute 'reset role';
 raise notice 'PASS: all three requests, same child, email queue, retry, changed retry, actor isolation, rollback, grants and unchanged payments';
end $$;
