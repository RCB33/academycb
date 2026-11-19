-- Isolated fixtures only; the whole transaction is rolled back, no mail is sent.
begin;
do $$
declare
 a uuid; camp uuid=gen_random_uuid(); limited uuid=gen_random_uuid();
 c1 uuid=gen_random_uuid(); c2 uuid=gen_random_uuid(); c3 uuid=gen_random_uuid();
 p uuid; v timestamptz; m uuid; rejected boolean;
begin
 select id into strict a from public.profiles where role='admin' limit 1;
 insert into public.children(id,full_name,birth_year) values
 (c1,'QA UNLIMITED 1',2016),(c2,'QA UNLIMITED 2',2016),(c3,'QA ANNUAL PLUS',2016);
 insert into public.campuses(id,name,year,start_date,end_date,capacity,capacity_unlimited,status,price) values
 (camp,'QA UNLIMITED',2026,'2026-12-22','2027-01-07',0,true,'published',89),
 (limited,'QA LIMITED',2026,'2026-12-22','2027-01-07',1,false,'published',89);
 insert into public.campus_enrollments(campus_id,child_id,status) values(camp,c1,'pending_payment'),(camp,c2,'pending_payment');
 if (select count(*) from public.campus_enrollments where campus_id=camp)<>2 then raise exception 'Unlimited campus refused registrations'; end if;
 insert into public.campus_enrollments(campus_id,child_id,status) values(limited,c1,'pending_payment');
 rejected=false;
 begin insert into public.campus_enrollments(campus_id,child_id,status) values(limited,c2,'pending_payment');
 exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'Limited campus overbooked'; end if;
 rejected=false;
 begin update public.campuses set capacity_unlimited=false where id=camp;
 exception when check_violation then rejected=true; end;
 if not rejected then raise exception 'Unconfirmed zero capacity published'; end if;
 select id,updated_at into strict p,v from public.membership_plans where name='Tecnificación · 1 sesión semanal · 2026/2027';
 insert into public.payments(type,child_id,amount,status,method,due_date,concept_code,description)
 values('academy',c3,50,'pending','transferencia','2026-10-05','plus','QA EXISTING ANNUAL PLUS');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 rejected=false;
 begin perform public.assign_family_plan(gen_random_uuid(),c3,p,v,'2027-01-01',5,0,'',false,50,null);
 exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'Annual Plus duplicated across calendar years in same season'; end if;
 rejected=false;
 begin perform public.assign_family_plan(gen_random_uuid(),c3,p,v,'2027-01-01',5,0,'',false,75,null);
 exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'Unconfirmed Plus price accepted'; end if;
 m=public.assign_family_plan(gen_random_uuid(),c3,p,v,'2027-01-01',5,0,'',false,0,null);
 if (select sum(amount) from public.payments where ref_id=m)<>375 then raise exception 'Monthly tariff or season end changed'; end if;
 execute 'reset role';
 raise notice 'PASS: unlimited registrations, limited-capacity protection, explicit choice, annual Plus deduplication, price and remaining season months';
end $$;
rollback;
