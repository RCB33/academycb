-- Connected-project check; every synthetic row is rolled back. No emails or charges.
begin;
do $$
declare u uuid; g uuid=gen_random_uuid(); c uuid=gen_random_uuid(); other_c uuid=gen_random_uuid(); p uuid=gen_random_uuid(); other_p uuid=gen_random_uuid();
begin
 select guardians.id,guardians.user_id into strict g,u from public.guardians join public.profiles on profiles.id=guardians.user_id where profiles.role='guardian' limit 1;
 insert into public.children(id,full_name,birth_year) values(c,'QA OWN RECEIPT CHILD',2016),(other_c,'QA OTHER RECEIPT CHILD',2016);
 insert into public.child_guardians(child_id,guardian_id) values(c,g);
 insert into public.payments(id,type,child_id,amount,status,description,due_date) values
 (p,'other',c,75,'pending','QA RECEIPT RLS','2026-11-05'),(other_p,'other',other_c,75,'pending','QA PRIVATE RECEIPT RLS','2026-11-05');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if not exists(select 1 from public.payments where id=p) then raise exception 'Own receipt unavailable'; end if;
 if exists(select 1 from public.payments where id=other_p) then raise exception 'Other family receipt exposed'; end if;
 execute 'reset role';
 delete from public.child_guardians where child_id=c and guardian_id=g;
 execute 'set local role authenticated';
 if exists(select 1 from public.payments where id=p) then raise exception 'Revoked guardian link still grants access'; end if;
 execute 'reset role';
 raise notice 'PASS: own child receipt, other family denied, revoked link denied';
end $$;
rollback;
