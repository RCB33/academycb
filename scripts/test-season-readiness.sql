-- Safe against the connected project: every fixture is rolled back.
begin;
do $$
declare a uuid; c uuid=gen_random_uuid(); p uuid; v timestamptz; m uuid; req uuid=gen_random_uuid(); rejected boolean; digest text;
begin
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into digest from public.payments x;
 select id into strict a from public.profiles where role='admin' limit 1;
 select id,updated_at into strict p,v from public.membership_plans where name='Tecnificación · 1 sesión semanal · 2026/2027';
 insert into public.children(id,full_name,birth_year) values(c,'QA SEASON ROLLBACK',2016);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 -- The same upsert used by the settings screen must work.
 insert into public.academy_settings(key,value,is_public) values('current_season','2026/2027',true)
 on conflict(key) do update set value=excluded.value;
 rejected=false; begin perform public.assign_family_plan(gen_random_uuid(),c,p,v,'2026-09-01',5,0,'',false,0,null); exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'Partial September accepted'; end if;
 rejected=false; begin perform public.assign_family_plan(gen_random_uuid(),c,p,v,'2027-06-01',5,0,'',false,0,null); exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'Post-season start accepted'; end if;
 m=public.assign_family_plan(req,c,p,v,'2026-11-01',5,0,'',true,50,null);
 if (select end_date from public.academy_memberships where id=m)<>'2027-05-31' then raise exception 'Season end exceeded'; end if;
 if (select count(*) from public.payments where ref_id=m and concept_code='monthly')<>7 then raise exception 'Incorrect remaining months'; end if;
 if (select sum(amount) from public.payments where ref_id=m)<>605 then raise exception 'Incorrect price/matricula'; end if;
 if exists(select 1 from public.payments where ref_id=m and status<>'pending') then raise exception 'Money marked paid'; end if;
 if public.assign_family_plan(req,c,p,v,'2026-11-01',5,0,'',true,50,null)<>m then raise exception 'Retry duplicated assignment'; end if;
 if (select count(*) from public.payments where ref_id=m)<>9 then raise exception 'Duplicate receipts'; end if;
 if (select count(*) from public.payments where ref_id=m and concept_code='plus' and amount=50)<>1 then raise exception 'Annual Plus missing or duplicated'; end if;
 execute 'reset role';
 if (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.payments x where ref_id is distinct from m) is distinct from digest then raise exception 'Existing receipts changed'; end if;
 rejected=false; begin
  insert into public.campuses(name,year,start_date,end_date,capacity,status) values('QA INVALID CAPACITY',2026,'2026-12-22','2027-01-07',0,'published');
 exception when check_violation then rejected=true; end;
 if not rejected then raise exception 'Published without capacity'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 execute 'set local role authenticated';
 rejected=false; begin perform public.assign_family_plan(gen_random_uuid(),c,p,v,'2027-01-01',5,0,'',false,0,null); exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'Non-admin assigned plan'; end if;
 execute 'reset role';
 raise notice 'PASS: season bounds, full months, remaining tuition, single matrícula, idempotency, admin-only, settings upsert, campus capacity, unchanged existing receipts';
end $$;
rollback;
