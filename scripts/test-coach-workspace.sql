-- Run with the new migration inside the same transaction; always rolls back.
begin;
do $$
declare
 coach uuid=gen_random_uuid(); worker uuid=gen_random_uuid(); team uuid=gen_random_uuid();
 child uuid=gen_random_uuid(); extra uuid=gen_random_uuid(); archived uuid=gen_random_uuid();
 ev uuid=gen_random_uuid(); ce uuid=gen_random_uuid(); te uuid=gen_random_uuid();
 campus uuid=gen_random_uuid(); tournament uuid=gen_random_uuid(); metric uuid=gen_random_uuid();
 guardian_user uuid; before_digest text; before_ids uuid[]; affected int;
begin
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into before_digest from public.payments p;
 select array_agg(id) into before_ids from public.payments;
 select id into guardian_user from public.profiles where role='guardian' limit 1;
 insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values(coach,'qa-shared-coach-'||coach||'@example.invalid','{}','{}');
 insert into public.profiles(id,role,full_name) values(coach,'coach','QA shared coach') on conflict(id) do update set role='coach';
 insert into public.workers(id,user_id,full_name,access_enabled) values(worker,coach,'QA shared coach',true);
 insert into public.teams(id,name,status) values(team,'QA unassigned team','active');
 insert into public.children(id,full_name,birth_year,team_id) values(child,'QA shared player',2015,team),(extra,'QA extra player',2016,null);
 insert into public.children(id,full_name,birth_year,archived_at) values(archived,'QA archived player',2015,now());
 insert into public.campuses(id,year,name,start_date,end_date,status,capacity) values(campus,2026,'QA sports campus',current_date,current_date,'draft',16);
 insert into public.campus_enrollments(campus_id,child_id,status) values(campus,extra,'confirmed'),(campus,child,'cancelled');
 insert into public.tournaments_internal(id,title) values(tournament,'QA sports tournament');
 insert into public.tournament_players(tournament_id,child_id,status) values(tournament,child,'confirmed'),(tournament,extra,'cancelled');
 insert into public.calendar_events(id,title,start_date,end_date,team_id,event_type,source_type,source_id) values
 (ev,'QA unassigned session',(current_date+time '17:30') at time zone 'Europe/Madrid',(current_date+time '19:00') at time zone 'Europe/Madrid',team,'training','manual',null),
 (ce,'QA campus session',now(),now()+interval '2 days',null,'campus','campus',campus),
 (te,'QA tournament session',now(),now()+interval '1 hour',null,'tournament','tournament',tournament);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',coach,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if public.is_coach_of(child) then raise exception 'Coach must have no team assignment';end if;
 if (select count(*) from public.children where id in(child,extra,archived))<>2 then raise exception 'Shared player access failed';end if;
 if (select count(*) from public.calendar_events where id in(ev,ce,te))<>3 then raise exception 'Shared calendar access failed';end if;
 if (select count(*) from public.get_session_players(ev))<>1 then raise exception 'Academy base roster failed';end if;
 if not exists(select 1 from public.get_session_players(ce) where id=extra) or exists(select 1 from public.get_session_players(ce) where id=child) then raise exception 'Campus roster/cancellation failed';end if;
 if not exists(select 1 from public.get_session_players(te) where id=child) or exists(select 1 from public.get_session_players(te) where id=extra) then raise exception 'Tournament roster/cancellation failed';end if;
 insert into public.coach_session_roster(event_id,child_id,included,updated_by) values(ev,extra,true,coach),(ev,child,false,coach);
 if (select count(*) from public.get_session_players(ev))<>1 or not exists(select 1 from public.get_session_players(ev) where id=extra) then raise exception 'Roster overrides failed';end if;
 update public.coach_session_roster set included=true where event_id=ev and child_id=child;
 if (select count(*) from public.get_session_players(ev))<>2 then raise exception 'Roster restore failed';end if;
 insert into public.training_sessions(event_id,child_id,session_date,attendance,created_by) values(ev,extra,current_date,'present',coach);
 insert into public.training_sessions(event_id,child_id,session_date,attendance,created_by) values(ce,extra,current_date,'present',coach),(ce,extra,current_date+1,'absent',coach);
 if (select count(*) from public.training_sessions where event_id=ce and child_id=extra)<>2 then raise exception 'Multiday attendance overwrote a day';end if;
 begin
  insert into public.training_sessions(event_id,child_id,session_date,attendance,created_by) values(ce,extra,current_date+5,'present',coach);
  raise exception 'FAIL attendance outside event dates';
 exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 begin
  update public.coach_session_roster set included=false where event_id=ev and child_id=extra;
  raise exception 'FAIL historical attendance removed';
 exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 insert into public.child_metrics(id,child_id,recorded_at,pace,evaluated_by,visible_to_guardian) values(metric,extra,current_date,70,coach,false);
 update public.child_metrics set pace=75,evaluated_by=coach where id=metric;
 if not exists(select 1 from public.child_metrics where id=metric and pace=75) then raise exception 'Shared scoring failed';end if;
 begin
  update public.child_metrics set child_id=child where id=metric;
  raise exception 'FAIL evaluation moved';
 exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 begin
  update public.child_metrics set pace=100 where id=metric;
  raise exception 'FAIL score outside range';
 exception when check_violation then null;end;
 insert into public.coach_observations(child_id,author_id,body) values(extra,coach,'QA internal revision');
 if exists(select 1 from public.payments) or exists(select 1 from public.billing_requests) then raise exception 'Coach can read payments';end if;
 execute 'reset role';
 if guardian_user is not null then
  perform set_config('request.jwt.claims',jsonb_build_object('sub',guardian_user,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if exists(select 1 from public.children where id in(child,extra)) or exists(select 1 from public.coach_session_roster where event_id=ev) then raise exception 'Unrelated guardian reads sports fixtures';end if;
  begin
   insert into public.coach_session_roster(event_id,child_id,included,updated_by) values(ce,child,true,guardian_user);
   raise exception 'FAIL guardian writes roster';
  exception when insufficient_privilege then null;end;
  execute 'reset role';
 end if;
 update public.workers set access_enabled=false where id=worker;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',coach,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.children where id in(child,extra)) or exists(select 1 from public.calendar_events where id=ev) then raise exception 'Revoked coach retains access';end if;
 update public.child_metrics set pace=80 where id=metric;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Revoked coach writes metrics';end if;
 execute 'reset role';
 if before_digest is distinct from (select md5(string_agg(to_jsonb(p)::text,'' order by id)) from public.payments p where id=any(before_ids)) then raise exception 'Existing payments changed';end if;
end $$;
select 'PASS: shared unassigned coach, Academy/Campus/Tournament rosters, add/remove/restore, attendance preserved, evaluations/notes, guardian isolation, revocation, unchanged payments' as result;
rollback;
