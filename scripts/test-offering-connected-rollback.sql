-- Reviewed transaction; never call email, Auth Admin or payment providers here.
begin;
do $$
declare a uuid; p public.membership_plans%rowtype; g public.teams%rowtype; sunday public.teams%rowtype;
 r uuid; child uuid; data jsonb; day int; pct int; before_digest text; rejected boolean;
begin
 select id into strict a from public.profiles where role='admin' order by id limit 1;
 select * into strict p from public.membership_plans where sessions_per_week=1 and is_active order by created_at limit 1;
 select * into strict g from public.teams where public_offer->>'kind'='field' and status='active' order by created_at limit 1;
 select * into strict sunday from public.teams where public_offer->>'kind'='sunday' and status='active' order by created_at limit 1;
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into before_digest from public.payments x;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 foreach day in array array[1,7,8,15,16,22,23,30] loop
  pct:=case when day<=7 then 100 when day<=15 then 75 when day<=22 then 50 else 25 end;
  data:=jsonb_build_object('plan',to_jsonb(p),'groups',jsonb_build_array(to_jsonb(g),to_jsonb(sunday)),'start_date',make_date(2027,4,day),'payment_choice','monthly_card','quote',jsonb_build_object('percent',pct,'first_month',round(p.price*pct/100,2),'enrollment_fee',p.enrollment_fee,'plus',50));
  insert into public.enrollment_requests(service,activity_name,child_name,birth_date,guardian_name,email,phone,academy_details)
  values('academy','QA CONNECTED OFFER','QA CONNECTED OFFER '||day,'2016-01-01','QA CONNECTED PARENT','qa-offer-'||gen_random_uuid()||'@example.invalid','600000000',data) returning id into r;
  execute 'set local role authenticated';
  child:=public.accept_academy_request(r);
  if public.accept_academy_request(r)<>child then raise exception 'Duplicate acceptance';end if;
  execute 'reset role';
  if (select count(*) from public.payments where child_id=child)<>4 then raise exception 'Wrong receipt count';end if;
  if (select sum(amount) from public.payments where child_id=child)<>round(p.price*pct/100,2)+p.price+p.enrollment_fee+50 then raise exception 'Wrong total';end if;
  if not exists(select 1 from public.payments where child_id=child and covered_month='2027-05' and due_date='2027-05-01' and status='pending') then raise exception 'Wrong last quota';end if;
  if (select count(*) from public.academy_group_assignments where child_id=child)<>2 then raise exception 'Second group missing';end if;
 end loop;
 if (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.payments x where child_id not in(select id from public.children where full_name like 'QA CONNECTED OFFER %'))<>before_digest then raise exception 'Existing payments changed';end if;
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 execute 'set local role anon';
 rejected:=false;
 begin insert into public.enrollment_requests(service,activity_name,child_name,birth_date,guardian_name,email,phone,academy_details) values('academy','QA','Forged quote','2016-01-01','QA parent','qa-forged@example.invalid','600000000','{}');
 exception when others then rejected:=true;end;
 if not rejected then raise exception 'Anonymous snapshot forgery accepted';end if;
 rejected:=false;
 begin insert into public.enrollment_requests(service,activity_name,child_name,birth_date,guardian_name,email,phone,campus_details) values('campus','QA','Forged campus quote','2016-01-01','QA parent','qa-forged@example.invalid','600000000','{"quoted_amount":1}');
 exception when others then rejected:=true;end;
 if not rejected then raise exception 'Anonymous campus snapshot forgery accepted';end if;
 execute 'reset role';
 raise notice 'PASS: live schema/RLS, 8 boundaries, atomic membership+receipts, 2 groups, idempotency, rejected forged quote, original payment digest unchanged';
end $$;
rollback;
select count(*) payment_count,md5(string_agg(to_jsonb(p)::text,'' order by id)) payment_digest from public.payments p;
