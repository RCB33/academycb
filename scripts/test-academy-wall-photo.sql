-- Run with BEGIN/ROLLBACK. Fixture posts are never retained.
do $$
declare admin_id uuid=gen_random_uuid();
 qa uuid=gen_random_uuid(); ch uuid=gen_random_uuid(); guardian_id uuid=gen_random_uuid();
 p uuid=gen_random_uuid(); blocked boolean; baseline text;
begin
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into baseline from public.payments x;
 insert into auth.users(id,email,raw_user_meta_data) values(admin_id,'qa-admin-'||admin_id||'@example.invalid','{"full_name":"QA admin"}'),(qa,'qa-family-'||qa||'@example.invalid','{"full_name":"QA family"}');
 update public.profiles set role='admin' where id=admin_id;
 insert into public.guardians(id,user_id,full_name,email,phone) values(guardian_id,qa,'QA family','qa-family-'||qa||'@example.invalid','000000000');
 insert into public.children(id,full_name,birth_date,birth_year) values(ch,'QA PHOTO ROLLBACK','2016-01-01',2016);
 insert into public.child_guardians(child_id,guardian_id,relationship,is_primary) values(ch,guardian_id,'Tutor',true);
 perform set_config('request.jwt.claim.sub',admin_id::text,true); execute 'set local role authenticated';
 insert into public.community_posts(id,author_user_id,body,visibility,status,media_path,media_type) values(p,admin_id,'QA Official photo','community','published','qa/nonexistent.webp','image');
 blocked=false;begin
  insert into public.community_posts(author_user_id,child_id,body,visibility,status,media_path,media_type) values(admin_id,ch,'QA child without consent','community','published','qa/nonexistent.webp','image');
 exception when raise_exception then blocked=true;end;
 if not blocked then raise exception 'Admin child post bypassed consent';end if;
 blocked=false;begin
  insert into public.community_posts(author_user_id,body,visibility,status,media_path,media_type) values(qa,'QA other author','community','published','qa/nonexistent.webp','image');
 exception when raise_exception then blocked=true;end;
 if not blocked then raise exception 'Spoofed official author accepted';end if;
 perform set_config('request.jwt.claim.sub',qa::text,true);
 blocked=false;begin
  insert into public.community_posts(author_user_id,child_id,body,visibility,status,media_path,media_type) values(qa,ch,'QA family without consent','community','published','qa/nonexistent.webp','image');
 exception when raise_exception then blocked=true;end;
 if not blocked then raise exception 'Family consent bypassed';end if;
 blocked=false;begin
  insert into public.community_posts(author_user_id,body,visibility,status,media_path,media_type) values(qa,'QA family official attempt','community','published','qa/nonexistent.webp','image');
 exception when others then blocked=true;end;
 if not blocked then raise exception 'Family allowed official post';end if;
 execute 'reset role';
 if (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.payments x) is distinct from baseline then raise exception 'Payments changed';end if;
end $$;
