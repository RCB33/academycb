begin;
do $$
declare
 admin_id uuid; fixture_id uuid=gen_random_uuid(); rows_changed int;
 baseline text; contact_baseline text;
begin
 select id into admin_id from public.profiles where role='admin' order by id limit 1;
 if admin_id is null then raise exception 'No admin for RLS test'; end if;
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into baseline from public.payments p;
 select md5(string_agg(to_jsonb(c)::text,'' order by id)) into contact_baseline from public.contact_messages c;
 insert into public.contact_messages(id,name,email,message,status) values(fixture_id,'QA delete rollback','qa-delete@example.invalid','Isolated delete test','closed');
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 execute 'set local role authenticated';
 delete from public.contact_messages where id=fixture_id;
 get diagnostics rows_changed=row_count;
 if rows_changed<>0 then raise exception 'Non-admin deleted contact'; end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 delete from public.contact_messages where id=fixture_id;
 get diagnostics rows_changed=row_count;
 if rows_changed<>1 then raise exception 'Admin could not delete archived fixture'; end if;
 execute 'reset role';
 insert into public.contact_messages(id,name,email,message,status) values(fixture_id,'QA delete rollback','qa-delete@example.invalid','Isolated delete test','new');
 execute 'set local role authenticated';
 delete from public.contact_messages where id=fixture_id;
 get diagnostics rows_changed=row_count;
 if rows_changed<>1 then raise exception 'Admin could not delete active fixture'; end if;
 execute 'reset role';
 if contact_baseline is distinct from (select md5(string_agg(to_jsonb(c)::text,'' order by id)) from public.contact_messages c) then raise exception 'Existing contacts changed'; end if;
 if baseline is distinct from (select md5(string_agg(to_jsonb(p)::text,'' order by id)) from public.payments p) then raise exception 'Payment digest changed'; end if;
end $$;
rollback;
select 'PASS: admin-only deletion, active and archived fixtures; rollback; existing contacts and payments preserved' as result,
not exists(select 1 from public.contact_messages where email='qa-delete@example.invalid') as fixture_removed,
count(*) as payment_count,md5(string_agg(to_jsonb(p)::text,'' order by id)) as payment_digest from public.payments p;
