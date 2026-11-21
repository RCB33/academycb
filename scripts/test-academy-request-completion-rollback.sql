-- Reviewed transaction against the real schema/RLS. Synthetic data only.
-- No Auth API, mail delivery, or Stripe. Everything is rolled back.
begin;
do $$
declare actor uuid; p public.membership_plans%rowtype; g public.teams%rowtype;
 r uuid; child uuid; ctx jsonb; payload jsonb; baseline text; original_notes text:='QA legacy notes';
begin
 select id into strict actor from public.profiles where role='admin' order by id limit 1;
 select * into strict p from public.membership_plans where is_active and sessions_per_week=1 and season_end='2027-05-31' order by created_at limit 1;
 select * into strict g from public.teams where status='active' and (public_offer->>'published')::boolean and public_offer->>'kind'='field' and public_offer->>'birth_from' is null and max_players is null order by created_at limit 1;
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into baseline from public.payments x;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 insert into public.enrollment_requests(service,activity_name,child_name,birth_date,guardian_name,email,phone,notes)
  values('academy','Academia anual','QA LEGACY COMPLETION','2011-12-10','QA LEGACY TUTOR','qa-legacy-'||gen_random_uuid()||'@example.invalid','600000000',original_notes) returning id into r;
 execute 'set local role authenticated';
 ctx:=public.academy_request_completion_context(r);
 payload:=jsonb_build_object('plan',to_jsonb(p),'groups',jsonb_build_array(to_jsonb(g)),'start_date','2026-12-01','payment_choice','cash','quote',jsonb_build_object('plus',50));
 perform public.complete_academy_request(r,payload,false,ctx->>'revision');
 ctx:=public.academy_request_review_context(r);
 if ctx->'request'->>'status'<>'new' or ctx->'request'->>'notes'<>original_notes or ctx->'request'->'academy_details'->'quote'->>'enrollment_fee'<>'0' then raise exception 'Draft lost identity/fee/status';end if;
 execute 'reset role';
 if baseline is distinct from (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.payments x) then raise exception 'Draft changed payments';end if;
 if exists(select 1 from public.registration_email_outbox where source_id=r and event_kind='reviewed') then raise exception 'Draft queued acceptance';end if;
 execute 'set local role authenticated';
 child:=public.accept_reviewed_academy_request(r,'2026-12-01',false,ctx->>'revision');
 execute 'reset role';
 if (select count(*) from public.payments where child_id=child)<>7 or exists(select 1 from public.payments where child_id=child and concept_code='registration') then raise exception 'Wrong accepted receipts';end if;
 if (select count(*) from public.registration_email_outbox where source_id=r and event_kind='reviewed')<>1 then raise exception 'Missing final acceptance notification';end if;
 if baseline is distinct from (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.payments x where child_id is distinct from child) then raise exception 'Old payments changed';end if;
end $$;
rollback;
select 'PASS: legacy draft -> reviewed acceptance, real RLS, unchanged identity, no payments/email on draft, final receipts and queued acceptance; all fixtures reverted' as result,
 count(*) as payments,md5(string_agg(to_jsonb(p)::text,'' order by id)) as digest from public.payments p;
