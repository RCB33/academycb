-- Run with BEGIN/ROLLBACK. Fixture posts are never retained.
do $$
declare admin_id uuid='ee7fdcd0-5992-47a8-b622-e4aba789342b';
 qa uuid='8890c625-e9dd-4f30-af01-8898bc4ca4c1'; ch uuid='8890c625-e9dd-4f30-af01-8898bc4ca4c3';
 p uuid=gen_random_uuid(); blocked boolean; baseline text;
begin
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into baseline from public.payments x;
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
