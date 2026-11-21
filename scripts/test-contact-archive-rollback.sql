-- Isolated contact fixture; no real contact or payment is changed.
begin;
do $$
declare
 admin_id uuid; fixture_id uuid=gen_random_uuid(); rows_changed int;
 baseline text; original jsonb;
begin
 select id into admin_id from public.profiles where role='admin' order by id limit 1;
 if admin_id is null then raise exception 'No admin available for RLS test'; end if;
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into baseline from public.payments p;
 insert into public.contact_messages(id,name,email,message,status) values(fixture_id,'QA archive rollback','qa-archive@example.invalid','Isolated archive and restore test','new');
 select to_jsonb(c)-'status' into original from public.contact_messages c where id=fixture_id;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 execute 'set local role authenticated';
 update public.contact_messages set status='closed' where id=fixture_id;
 get diagnostics rows_changed=row_count;
 if rows_changed<>1 then raise exception 'Admin archive failed'; end if;
 if not exists(select 1 from public.contact_messages where id=fixture_id and status='closed') then raise exception 'Archived contact is not readable'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 update public.contact_messages set status='new' where id=fixture_id;
 get diagnostics rows_changed=row_count;
 if rows_changed<>0 then raise exception 'Non-admin changed archived message'; end if;
 if exists(select 1 from public.contact_messages where id=fixture_id) then raise exception 'Unrelated user read private message'; end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 update public.contact_messages set status='new' where id=fixture_id;
 get diagnostics rows_changed=row_count;
 if rows_changed<>1 then raise exception 'Admin restore failed'; end if;
 execute 'reset role';
 if original is distinct from (select to_jsonb(c)-'status' from public.contact_messages c where id=fixture_id) then raise exception 'Message fields changed'; end if;
 if not exists(select 1 from public.contact_messages where id=fixture_id and status='new') then raise exception 'Restore state incorrect'; end if;
 if baseline is distinct from (select md5(string_agg(to_jsonb(p)::text,'' order by id)) from public.payments p) then raise exception 'Payment digest changed'; end if;
end $$;
rollback;
select 'PASS: archive/restore, admin RLS, non-admin isolation, preserved contact and payment digest; fixture rolled back' as result,
 not exists(select 1 from public.contact_messages where email='qa-archive@example.invalid') as fixture_removed,
 count(*) as payment_count,md5(string_agg(to_jsonb(p)::text,'' order by id)) as payment_digest from public.payments p;
