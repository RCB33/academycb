-- Isolated synthetic fixtures, always rolled back. No payment mutations.
begin;
do $$
declare
 coach uuid=gen_random_uuid(); worker uuid=gen_random_uuid(); team uuid=gen_random_uuid();
 child uuid=gen_random_uuid(); other_child uuid=gen_random_uuid(); evaluation uuid=gen_random_uuid();
 guardian_user uuid; guardian uuid; affected integer;
begin
 select g.user_id,g.id into strict guardian_user,guardian from public.guardians g join public.profiles p on p.id=g.user_id where p.role='guardian' limit 1;
 insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values(coach,'qa-evaluation-'||coach||'@example.invalid','{}','{}');
 insert into public.profiles(id,role,full_name) values(coach,'coach','QA evaluation coach') on conflict(id) do update set role='coach';
 insert into public.workers(id,user_id,full_name,access_enabled) values(worker,coach,'QA evaluation coach',true);
 insert into public.teams(id,name,coach_id,status) values(team,'QA evaluation team',worker,'active');
 insert into public.children(id,full_name,birth_year,team_id) values(child,'QA evaluation assigned child',2015,team),(other_child,'QA evaluation other child',2016,null);
 insert into public.child_guardians(child_id,guardian_id) values(child,guardian);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',coach,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if not public.is_coach_of(child) or public.is_coach_of(other_child) then raise exception 'Assignment fixture invalid';end if;
 insert into public.child_metrics(id,child_id,recorded_at,pace,evaluated_by,visible_to_guardian) values(evaluation,child,current_date,62,coach,false);
 if not exists(select 1 from public.child_metrics where id=evaluation and pace=62) then raise exception 'Assigned coach insert failed';end if;
 update public.child_metrics set pace=63,evaluated_by=coach where id=evaluation;
 get diagnostics affected=row_count;if affected<>1 then raise exception 'Assigned coach update failed';end if;
 insert into public.child_metrics(child_id,recorded_at,evaluated_by) values(other_child,current_date,coach);
 if not exists(select 1 from public.child_metrics where child_id=other_child) then raise exception 'Shared coach evaluation failed';end if;
 begin
  update public.child_metrics set child_id=other_child where id=evaluation;
  raise exception 'FAIL Reassigning evaluation allowed';
 exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 begin
  update public.child_metrics set pace=100 where id=evaluation;
  raise exception 'Out of range score allowed';
 exception when check_violation then null;end;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',guardian_user,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.child_metrics where id=evaluation) then raise exception 'Draft exposed to guardian';end if;
 execute 'reset role';
 update public.child_metrics set visible_to_guardian=true where id=evaluation;
 execute 'set local role authenticated';
 if not exists(select 1 from public.child_metrics where id=evaluation and pace=63) then raise exception 'Published evaluation missing';end if;
 update public.child_metrics set pace=99 where id=evaluation;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Guardian changed score';end if;
 execute 'reset role';
 update public.workers set access_enabled=false where id=worker;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',coach,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 update public.child_metrics set pace=99 where id=evaluation;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Revoked coach changed score';end if;
 execute 'reset role';
 raise notice 'PASS: shared coach insert/update, evaluation reassignment/invalid score denied, draft hidden, published visible, guardian and revoked coach cannot write';
end $$;
rollback;
