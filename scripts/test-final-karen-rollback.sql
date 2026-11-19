begin;
do $$
declare a uuid;c uuid;g uuid;t uuid;p public.membership_plans%rowtype;d jsonb;ev uuid;denied boolean:=false;
begin
 select id into strict a from public.profiles where role='admin' order by id limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 d:=jsonb_build_object('full_name','QA FINAL CONNECTED','birth_date','2016-01-01','guardian_name','QA FINAL TUTOR','guardian_email','qa-final-'||gen_random_uuid()||'@example.invalid','guardian_phone','600000000');
 execute 'set local role authenticated';
 c:=public.create_player_with_guardian(gen_random_uuid(),d);
 select guardian_id into g from public.child_guardians where child_id=c;
 perform public.update_player_with_guardian(c,d||jsonb_build_object('guardian_id',g,'shirt_size','12 años'));
 if not exists(select 1 from public.children where id=c and shirt_size='12 años') then raise exception 'Edit failed';end if;
 select * into strict p from public.membership_plans where sessions_per_week=1 and is_active order by created_at limit 1;
 insert into public.teams(name,schedule,status,public_offer) values('QA FINAL CALENDAR','17:00 – 18:00','active','{"published":true,"kind":"field","day":"Martes","location":"QA"}') returning id into t;
 perform public.assign_family_plan_v2(gen_random_uuid(),c,p.id,p.updated_at,'2027-04-23',1,0,'',false,0,t,null);
 update public.teams set schedule='18:00 – 19:00',public_offer=public_offer||'{"day":"Jueves"}' where id=t;
 if not exists(select 1 from public.calendar_events where team_id=t) or exists(select 1 from public.calendar_events where team_id=t and (extract(isodow from start_date at time zone 'Europe/Madrid')<>4 or (start_date at time zone 'Europe/Madrid')::time<>'18:00')) then raise exception 'Calendar day/time mismatch';end if;
 select id into ev from public.calendar_events where team_id=t limit 1;
 update public.calendar_events set description='Changed by coach' where id=ev;
 begin update public.teams set schedule='19:00 – 20:00' where id=t;exception when raise_exception then denied:=true;end;
 if not denied or not exists(select 1 from public.calendar_events where id=ev and description='Changed by coach') then raise exception 'Manual session protection failed';end if;
 execute 'reset role';
end$$;
rollback;
select 'PASS atomic edit and public day/time changes, preserved manual session, actual admin RLS, all rollback' result,count(*) payment_count,md5(string_agg(to_jsonb(t)::text,'' order by id)) payment_digest from public.payments t;
