-- Reviewed, disposable fixtures in a single rollback transaction.
-- No Auth API, mail delivery or Stripe calls. Existing records are read only.
begin;
do $$
declare actor uuid; p public.membership_plans%rowtype; g public.teams%rowtype;
 r uuid; child uuid; d jsonb; ctx jsonb; fee_on boolean; baseline text; membership uuid; fixture_children uuid[]:='{}';
begin
 select id into strict actor from public.profiles where role='admin' order by id limit 1;
 select * into strict p from public.membership_plans where sessions_per_week=1 and is_active and season_end='2027-05-31' order by created_at limit 1;
 select * into strict g from public.teams where status='active' and public_offer->>'kind'='field' and max_players is null order by created_at limit 1;
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into baseline from public.payments x;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 foreach fee_on in array array[false,true] loop
  d:=jsonb_build_object('plan',to_jsonb(p),'groups',jsonb_build_array(to_jsonb(g)),'start_date','2026-11-22','payment_choice','monthly_card',
   'quote',jsonb_build_object('percent',50,'first_month',round(p.price/2,2),'enrollment_fee',p.enrollment_fee,'plus',0));
  insert into public.enrollment_requests(service,activity_name,child_name,birth_date,guardian_name,email,phone,academy_details)
   values('academy','QA REVIEW ROLLBACK','QA REVIEW ROLLBACK','2016-01-01','QA REVIEW PARENT','qa-review-'||gen_random_uuid()||'@example.invalid','600000000',d) returning id into r;
  execute 'set local role authenticated';
  ctx:=public.academy_request_review_context(r);
  child:=public.accept_reviewed_academy_request(r,'2026-12-01',fee_on,ctx->>'revision');
  execute 'reset role';
  fixture_children:=array_append(fixture_children,child);
  select academy_details into d from public.enrollment_requests where id=r;
  membership:=(d->'accepted'->>'membership_id')::uuid;
  if d->>'start_date'<>'2026-12-01' or d->'quote'->>'percent'<>'100' or d->'quote'->'remaining'->0->>'due_date'<>'2027-01-01' then raise exception 'Wrong reviewed date/proration';end if;
  if (d->'accepted'->>'first_total')::numeric<>p.price+(case when fee_on then p.enrollment_fee else 0 end) then raise exception 'Wrong initial amount';end if;
  if (select count(*) from public.payments where ref_id=membership)<>6+(fee_on and p.enrollment_fee>0)::int then raise exception 'Incorrect receipts';end if;
  if exists(select 1 from public.payments where ref_id=membership and (status<>'pending' or method is not null or covered_month<'2026-12')) then raise exception 'Old month or false collection';end if;
  if (select count(*) from public.registration_email_outbox where source_id=r and event_kind='reviewed')<>1 then raise exception 'Missing acceptance email in transaction';end if;
 end loop;
 if baseline is distinct from (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.payments x where child_id is null or not(child_id=any(fixture_children))) then raise exception 'Historical payments changed';end if;
end $$;
rollback;
select 'PASS: real schema and admin RLS, reviewed fee/date, future month receipts, acceptance mail queued; all fixtures rolled back, no providers called' as result,
 count(*) as payment_count,md5(string_agg(to_jsonb(p)::text,'' order by id)) as payment_digest from public.payments p;
