-- Reviewed integration against the real schema, all new fixtures inside rollback.
-- No provider calls, no committed player, payment, account or calendar changes.
begin;
do $$
declare a uuid;p public.membership_plans%rowtype;g public.teams%rowtype;s public.teams%rowtype;c uuid;guardian uuid;m uuid;req uuid;d int;pct int;before_digest text;denied boolean;
begin
 select id into strict a from public.profiles where role='admin' order by id limit 1;
 select * into strict p from public.membership_plans where sessions_per_week=2 and is_active order by created_at limit 1;
 select * into strict g from public.teams where public_offer->>'kind'='field' and status='active' order by created_at limit 1;
 select * into strict s from public.teams where public_offer->>'kind'='sunday' and status='active' order by created_at limit 1;
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into before_digest from public.payments x;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 foreach d in array array[1,7,8,15,16,22,23,30] loop
  insert into public.children(full_name,birth_date,birth_year) values('QA KAREN ROLLBACK '||d,'2016-01-01',2016) returning id into c;
  insert into public.guardians(full_name,email,phone) values('QA KAREN ROLLBACK','qa-karen-'||gen_random_uuid()||'@example.invalid','600000000') returning id into guardian;
  insert into public.child_guardians(child_id,guardian_id,relationship,is_primary) values(c,guardian,'parent',true);
  req:=gen_random_uuid();
  execute 'set local role authenticated';
  m:=public.assign_family_plan_v2(req,c,p.id,p.updated_at,make_date(2027,4,d),1,0,'',true,50,g.id,s.id);
  if public.assign_family_plan_v2(req,c,p.id,p.updated_at,make_date(2027,4,d),1,0,'',true,50,g.id,s.id)<>m then raise exception 'Idempotency failed';end if;
  execute 'reset role';
  pct:=case when d<=7 then 100 when d<=15 then 75 when d<=22 then 50 else 25 end;
  if (select sum(amount) from public.payments where ref_id=m)<>round(p.price*pct/100.0,2)+p.price+p.enrollment_fee+50 then raise exception 'Wrong total %',d;end if;
  if (select count(*) from public.academy_group_assignments where membership_id=m)<>2 then raise exception 'Missing Sunday';end if;
  if (select count(*) from public.registration_email_outbox where source_type='membership' and source_id=m)<>1 then raise exception 'Email missing or duplicated';end if;
  if not exists(select 1 from public.payments where ref_id=m and covered_month='2027-05' and due_date='2027-05-01') then raise exception 'May due date';end if;
  if exists(select 1 from public.payments where ref_id=m and covered_month>'2027-05') then raise exception 'Beyond May';end if;
  denied:=false;
  begin perform public.assign_family_plan_v2(gen_random_uuid(),c,p.id,p.updated_at,make_date(2027,4,d),1,0,'',false,0,g.id,s.id); exception when raise_exception then denied:=true;end;
  if not denied then raise exception 'Overlap accepted';end if;
 end loop;
 if not exists(select 1 from public.calendar_events where team_id=s.id and extract(isodow from start_date at time zone 'Europe/Madrid')=7 and (start_date at time zone 'Europe/Madrid')::date between '2027-04-01' and '2027-05-31') then raise exception 'Sunday calendar missing';end if;
 if (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.payments x where child_id not in(select id from public.children where full_name like 'QA KAREN ROLLBACK %'))<>before_digest then raise exception 'Existing payments changed';end if;
end $$;
rollback;
select 'PASS: real schema/admin RLS, eight manual proration boundaries, two groups, Sunday calendar, outbox, idempotency, overlap; all reverted' as result,count(*) payment_count,md5(string_agg(to_jsonb(p)::text,'' order by id)) payment_digest from public.payments p;
