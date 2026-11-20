-- Synthetic fixtures only; no emails. Always run the whole transaction.
begin;
do $$
declare
 family uuid=gen_random_uuid(); admin_user uuid=gen_random_uuid(); orphan uuid=gen_random_uuid();
 before_digest text; first_visit timestamptz;
begin
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into before_digest from public.payments p;
 insert into auth.users(id,email,raw_user_meta_data) values
 (family,'qa-portal-'||family||'@example.invalid','{}'),
 (admin_user,'qa-portal-'||admin_user||'@example.invalid','{}'),
 (orphan,'qa-portal-'||orphan||'@example.invalid','{}');
 update public.profiles set role='guardian' where id in(family,orphan);
 update public.profiles set role='admin' where id=admin_user;
 insert into public.guardians(user_id,full_name,email,phone) values(family,'QA PORTAL ROLLBACK','qa-portal-'||family||'@example.invalid','600000000');
 execute 'set local role service_role';
 perform public.record_guardian_portal_visit(family);
 perform public.record_guardian_portal_visit(family);
 if (select count(*) from public.guardian_portal_activity where user_id=family)<>1 then raise exception 'Repeated visit duplicated';end if;
 begin perform public.record_guardian_portal_visit(admin_user);raise exception 'Internal account counted';exception when insufficient_privilege then null;end;
 begin perform public.record_guardian_portal_visit(orphan);raise exception 'Unlinked account counted';exception when insufficient_privilege then null;end;
 execute 'reset role';
 update public.guardian_portal_activity set first_seen_at=now()-interval '1 day',last_seen_at=now()-interval '2 minutes' where user_id=family;
 select first_seen_at into first_visit from public.guardian_portal_activity where user_id=family;
 execute 'set local role service_role';
 perform public.record_guardian_portal_visit(family);
 if not exists(select 1 from public.guardian_portal_activity where user_id=family and first_seen_at=first_visit and last_seen_at=now())then raise exception 'First/last visit incorrect';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',family,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.guardian_portal_activity)then raise exception 'Family can read report';end if;
 begin perform public.record_guardian_portal_visit(family);raise exception 'Client can invoke tracking RPC';exception when insufficient_privilege then null;end;
 begin update public.guardian_portal_activity set last_seen_at=now();raise exception 'Client can forge visits';exception when insufficient_privilege then null;end;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_user,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if not exists(select 1 from public.guardian_portal_activity where user_id=family)then raise exception 'Admin cannot read report';end if;
 execute 'reset role';
 if has_function_privilege('anon','public.record_guardian_portal_visit(uuid)','execute') then raise exception 'Anonymous RPC exposed';end if;
 if (select md5(string_agg(to_jsonb(p)::text,'' order by id))from public.payments p) is distinct from before_digest then raise exception 'Payments changed';end if;
end $$;
rollback;
select 'PASS: real grants and RLS, family role and linkage, first/last visit, duplicate visits, client forgery denied; fixtures rolled back' result,
 count(*) payment_count,md5(string_agg(to_jsonb(p)::text,'' order by id)) payment_digest from public.payments p;
