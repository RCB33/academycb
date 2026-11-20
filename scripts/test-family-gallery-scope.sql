begin;
\ir ../supabase/migrations/20261120102151_family_gallery_media_scope.sql
do $$
declare
 gu uuid; g uuid; cat uuid=gen_random_uuid(); team uuid=gen_random_uuid(); other_team uuid=gen_random_uuid();
 child uuid=gen_random_uuid(); other_child uuid=gen_random_uuid();
 own_clip uuid=gen_random_uuid(); foreign_clip uuid=gen_random_uuid(); team_clip uuid=gen_random_uuid(); category_clip uuid=gen_random_uuid(); foreign_team_clip uuid=gen_random_uuid();
 before_digest text; after_digest text;
begin
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into before_digest from public.payments p;
 select user_id,id into strict gu,g from public.guardians where user_id='e4ec6913-43b6-48e0-b287-e88801c95df6';
 insert into public.categories(id,name)values(cat,'QA gallery category');
 insert into public.teams(id,name,category_id,status)values(team,'QA gallery own team',cat,'active'),(other_team,'QA gallery other team',cat,'active');
 insert into public.children(id,full_name,birth_year,category_id,team_id)values(child,'QA own gallery child',2015,cat,team),(other_child,'QA other gallery child',2015,cat,other_team);
 insert into public.child_guardians(child_id,guardian_id)values(child,g);
 insert into public.media_assets(id,title,media_type,video_url,child_id,team_id,category_id)values
 (own_clip,'QA own','video','https://example.invalid/own.mp4',child,team,cat),
 (foreign_clip,'QA foreign child same category','video','https://example.invalid/foreign.mp4',other_child,team,cat),
 (team_clip,'QA team','video','https://example.invalid/team.mp4',null,team,cat),
 (category_clip,'QA category','video','https://example.invalid/category.mp4',null,null,cat),
 (foreign_team_clip,'QA other team same category','video','https://example.invalid/foreign-team.mp4',null,other_team,cat);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gu,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if (select count(*) from public.media_assets where id in(own_clip,team_clip,category_clip))<>3 then raise exception 'Expected own, team and category media';end if;
 if exists(select 1 from public.media_assets where id in(foreign_clip,foreign_team_clip))then raise exception 'Private/team scope widened by category';end if;
 begin
 insert into public.media_assets(title,child_id,video_url)values('QA bypass',child,'https://example.invalid/video.mp4');
 raise exception 'Direct family INSERT allowed';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into after_digest from public.payments p;
 if before_digest is distinct from after_digest then raise exception 'Payment digest changed';end if;
 raise notice 'PASS gallery RLS: own, team and category allowed; foreign individual and team denied even with shared category; direct insert denied; payments unchanged';
end $$;
rollback;
