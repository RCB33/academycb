-- Synthetic data only. Always rolled back; no payment writes.
begin;
do $$
declare
 coach uuid=gen_random_uuid(); worker uuid=gen_random_uuid(); child uuid=gen_random_uuid();
 other_child uuid=gen_random_uuid(); archived_child uuid=gen_random_uuid(); trophy uuid=gen_random_uuid();
 guardian_user uuid; guardian uuid; affected integer;
begin
 select g.user_id,g.id into strict guardian_user,guardian from public.guardians g join public.profiles p on p.id=g.user_id where p.role='guardian' limit 1;
 insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values(coach,'qa-award-'||coach||'@example.invalid','{}','{}');
 insert into public.profiles(id,role,full_name) values(coach,'coach','QA award coach') on conflict(id) do update set role='coach';
 insert into public.workers(id,user_id,full_name,access_enabled) values(worker,coach,'QA award coach',true);
 insert into public.children(id,full_name,birth_year) values(child,'QA award child',2015),(other_child,'QA award unrelated',2015);
 insert into public.children(id,full_name,birth_year,archived_at) values(archived_child,'QA award archived',2015,now());
 insert into public.child_guardians(child_id,guardian_id) values(child,guardian);
 insert into public.achievements(id,name,description,icon) values(trophy,'QA effort','QA synthetic trophy','trophy');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',coach,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.child_achievements(child_id,achievement_id,earned_at,note) values(child,trophy,(now() at time zone 'Europe/Madrid')::date,'Great effort');
 if not exists(select 1 from public.child_achievements where child_id=child and note='Great effort') then raise exception 'Coach trophy read failed';end if;
 begin
  insert into public.child_achievements(child_id,achievement_id,note) values(child,trophy,'Duplicate');
  raise exception 'Duplicate award allowed';
 exception when unique_violation then null;end;
 begin
  insert into public.child_achievements(child_id,achievement_id,note) values(archived_child,trophy,'Archived');
  raise exception 'Archived award allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.child_achievements(child_id,achievement_id,note) values(other_child,trophy,repeat('x',1001));
  raise exception 'Oversized note allowed';
 exception when insufficient_privilege then null;end;
 delete from public.child_achievements where child_id=child;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Coach removed trophy';end if;
 update public.achievements set name='Changed' where id=trophy;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Coach changed catalogue';end if;
 insert into public.child_metrics(child_id,recorded_at,evaluated_by,notes,visible_to_guardian) values(child,current_date,coach,'Private draft',false);
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',guardian_user,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if not exists(select 1 from public.child_achievements where child_id=child and note='Great effort') then raise exception 'Guardian trophy missing';end if;
 if exists(select 1 from public.child_metrics where child_id=child) then raise exception 'Draft message exposed';end if;
 begin
  insert into public.child_achievements(child_id,achievement_id) values(other_child,trophy);
  raise exception 'Guardian awarded trophy';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
 update public.child_metrics set visible_to_guardian=true where child_id=child;
 insert into public.child_achievements(child_id,achievement_id) values(other_child,trophy);
 execute 'set local role authenticated';
 if not exists(select 1 from public.child_metrics where child_id=child and notes='Private draft') then raise exception 'Published message missing';end if;
 if exists(select 1 from public.child_achievements where child_id=other_child) then raise exception 'Unrelated trophy exposed';end if;
 execute 'reset role';
 update public.workers set access_enabled=false where id=worker;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',coach,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.child_achievements where child_id=child) then raise exception 'Revoked coach read trophy';end if;
 begin
  insert into public.child_achievements(child_id,achievement_id) values(child,gen_random_uuid());
  raise exception 'Revoked coach awarded trophy';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
 raise notice 'PASS: coach award and dedication, duplicate protection, archived/long note denied, no catalogue/delete rights, guardian visibility, draft privacy, revocation';
end $$;
rollback;
