do $$
declare a uuid; camp uuid=gen_random_uuid(); req uuid=gen_random_uuid(); e uuid;
begin
 select id into a from public.profiles where role='admin' limit 1;
 insert into public.campuses(id,year,name,type,start_date,end_date,capacity,price,status) values(camp,2027,'QA CAMPUS ASSIGNMENT','invierno','2026-12-22','2027-01-07',20,89,'published');
 insert into public.enrollment_requests(id,service,activity_name,child_name,birth_date,guardian_name,email,phone,campus_details) values(req,'campus','Campus Navidad 2026–2027','QA ASSIGNMENT CHILD','2016-01-01','QA TUTOR','qa-campus-'||req||'@example.invalid','600000000','{"weeks":["1","2","3"],"size":"12 años","allergies":"QA ninguna","image_consent":"No"}');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 e=public.assign_and_accept_campus_request(req,camp,197);
 if public.assign_and_accept_campus_request(req,camp,1)<>e then raise exception 'Assignment retry not idempotent';end if;
 if not exists(select 1 from public.payments where ref_id=e and amount=197 and status='pending') then raise exception 'Validated pack amount not preserved';end if;
 if not exists(select 1 from public.campus_enrollments where id=e and tshirt_size='12 años' and allergies='QA ninguna') then raise exception 'Campus details not transferred';end if;
 if (select campus_details->>'image_consent' from public.enrollment_requests where id=req)<>'No' then raise exception 'Consent changed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.enrollment_requests where id=req) then raise exception 'Private campus details exposed';end if;
 execute 'reset role';
 raise notice 'PASS: Christmas request assignment, reviewed pack amount, idempotent payment preservation, sizes/health transferred, consent preserved, private request';
end $$;
