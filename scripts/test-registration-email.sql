-- Run inside BEGIN/ROLLBACK. No email provider is invoked by these triggers.
do $$
declare r uuid=gen_random_uuid(); message uuid; claimed integer; a uuid; denied boolean=false;
begin
 insert into public.enrollment_requests(id,service,activity_name,child_name,birth_date,guardian_name,email,phone)
 values(r,'academy','QA EMAIL','QA CHILD','2016-01-01','QA TUTOR','qa-email-'||r||'@example.invalid','600000000');
 select id into message from public.registration_email_outbox where source_id=r and event_kind='received';
 if message is null then raise exception 'Request not queued atomically'; end if;
 select count(*) into claimed from public.claim_registration_email(message);
 if claimed<>1 then raise exception 'First claim failed'; end if;
 select count(*) into claimed from public.claim_registration_email(message);
 if claimed<>0 then raise exception 'Concurrent delivery not prevented'; end if;
 update public.registration_email_outbox set status='failed',attempted_at=now()-interval '6 minutes' where id=message;
 select count(*) into claimed from public.claim_registration_email(message);
 if claimed<>1 then raise exception 'Retry failed'; end if;
 update public.registration_email_outbox set status='sent',attempted_at=now()-interval '6 minutes' where id=message;
 select count(*) into claimed from public.claim_registration_email(message);
 if claimed<>0 then raise exception 'Already sent message reclaimed'; end if;
 update public.registration_email_outbox set status='failed',first_attempted_at=now()-interval '25 hours' where id=message;
 select count(*) into claimed from public.claim_registration_email(message);
 if claimed<>0 then raise exception 'Expired provider idempotency window allowed'; end if;
 if has_function_privilege('authenticated','public.claim_registration_email(uuid)','execute') or has_function_privilege('anon','public.claim_registration_email(uuid)','execute') then raise exception 'Public email claim exposed'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.registration_email_outbox) then raise exception 'Email addresses exposed to family'; end if;
 begin insert into public.registration_email_outbox(source_type,source_id,event_kind,recipient) values('event',r,'received','injected@example.invalid'); exception when insufficient_privilege then denied=true; end;
 if not denied then raise exception 'Client could enqueue arbitrary email'; end if;
 execute 'reset role';
 select id into a from public.profiles where role='admin' limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if not exists(select 1 from public.registration_email_outbox where id=message) then raise exception 'Admin cannot see delivery state'; end if;
 execute 'reset role';
 raise notice 'PASS: atomic outbox, leases, retry, no duplicate sends, restricted RPC and private recipient data';
end $$;
