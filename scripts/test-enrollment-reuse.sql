do $$
declare u uuid=gen_random_uuid(); stranger uuid=gen_random_uuid(); g uuid; c uuid; r uuid=gen_random_uuid(); a uuid; count_before integer; rejected boolean;
begin
 select id into a from public.profiles where role='admin' limit 1;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(u,'qa-reuse-'||u||'@example.invalid',now(),'{}'),(stranger,'qa-stranger-'||stranger||'@example.invalid',now(),'{}');
 insert into public.guardians(user_id,full_name,email,phone) values(u,'QA REUSE TUTOR','qa-reuse-'||u||'@example.invalid','600000000') returning id into g;
 insert into public.children(full_name,birth_date,birth_year) values('QA REUSE CHILD','2016-01-01',2016) returning id into c;
 insert into public.child_guardians(child_id,guardian_id) values(c,g);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.enrollment_requests(id,service,activity_name,child_name,birth_date,guardian_name,email,phone,linked_child_id) values(r,'academy','Academia','TAMPERED','2015-01-01','QA TUTOR','other@example.invalid','600000000',c);
 execute 'reset role';
 if not exists(select 1 from public.enrollment_requests where id=r and child_name='QA REUSE CHILD' and birth_date='2016-01-01' and email='qa-reuse-'||u||'@example.invalid') then raise exception 'Verified link did not normalize identity'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',stranger,'role','authenticated')::text,true);
 rejected=false;
 begin
   insert into public.enrollment_requests(service,activity_name,child_name,birth_date,guardian_name,email,phone,linked_child_id) values('academy','Academia','STRANGER','2015-01-01','QA TUTOR','other@example.invalid','600000000',c);
 exception when others then rejected=true; end;
 if not rejected then raise exception 'Another family linked the player'; end if;
 select count(*) into count_before from public.children;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 if public.convert_enrollment_request(r)<>c then raise exception 'Wrong reused child'; end if;
 if (select count(*) from public.children)<>count_before then raise exception 'Duplicate child created'; end if;
 raise notice 'PASS: verified enrollment identity, cross-family denial, existing child reused on acceptance';
end $$;
