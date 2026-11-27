-- Run after the migration, or prepend it inside this transaction for preflight.
begin;
do $$
declare actor uuid; owner uuid:=gen_random_uuid(); p public.membership_plans%rowtype; g public.teams%rowtype;
 r uuid; child uuid; guardian uuid; m uuid; d jsonb; ctx jsonb; baseline text; before_review text;
 receipt public.payments%rowtype; future_ids uuid[]; billing uuid; blocked boolean; result jsonb;
begin
 select id into strict actor from public.profiles where role='admin' order by id limit 1;
 select * into strict p from public.membership_plans where sessions_per_week=1 and is_active and season_start='2026-09-15' and season_end='2027-05-31' order by created_at limit 1;
 select * into strict g from public.teams where status='active' and public_offer->>'kind'='field' and max_players is null order by created_at limit 1;
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into baseline from public.payments x;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 d:=jsonb_build_object('plan',to_jsonb(p),'groups',jsonb_build_array(to_jsonb(g)),'start_date','2026-09-15','payment_choice','monthly_card','quote',jsonb_build_object('percent',75,'first_month',round(p.price*.75,2),'enrollment_fee',p.enrollment_fee,'plus',50));
 insert into public.enrollment_requests(service,activity_name,child_name,birth_date,guardian_name,email,phone,academy_details)
 values('academy','QA HISTORY ROLLBACK','QA HISTORY '||owner,'2016-01-01','QA HISTORY PARENT','qa-history-'||owner||'@example.invalid','600000000',d) returning id into r;
 execute 'set local role authenticated';
 ctx:=public.academy_request_review_context(r);
 child:=public.accept_reviewed_academy_request(r,'2026-09-15',false,ctx->>'revision');
 blocked:=false;begin perform public.accept_reviewed_academy_request(r,'2026-09-15',false,ctx->>'revision');exception when others then if sqlerrm like 'Solicitud cerrada o ya aceptada%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Accepted request was repeated';end if;
 execute 'reset role';
 select (academy_details->'accepted'->>'membership_id')::uuid into m from public.enrollment_requests where id=r;
 if not exists(select 1 from public.academy_memberships where id=m and history_review_required and history_reviewed_at is null) then raise exception 'Missing review hold';end if;
 if (select count(*) from public.payments where ref_id=m and concept_code='monthly')<>9 or (select count(*) from public.payments where ref_id=m and concept_code='plus')<>1 or exists(select 1 from public.payments where ref_id=m and concept_code='registration') then raise exception 'Wrong season receipts/fee exemption/extra';end if;
 if exists(select 1 from public.payments where ref_id=m and (status<>'pending' or method is not null)) then raise exception 'Invented past collection';end if;
 select * into strict receipt from public.payments where ref_id=m and covered_month='2026-09';
 if receipt.amount<>round(p.price*.75,2) then raise exception 'Wrong historical proration';end if;
 insert into auth.users(id,email,email_confirmed_at) values(owner,'qa-history-'||owner||'@example.invalid',now());
 update public.profiles set role='guardian' where id=owner;
 select guardian_id into strict guardian from public.child_guardians where child_id=child;
 update public.guardians set user_id=owner where id=guardian;
 -- Every payment gateway must reject before any provider call or persisted attempt.
 blocked:=false;begin insert into public.billing_request_items(request_id,payment_id,position,amount_cents,due_date,snapshot) values(gen_random_uuid(),receipt.id,1,5625,current_date,'{}');exception when others then if sqlerrm like 'Secretaría debe revisar%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Billing hold bypassed';end if;
 blocked:=false;begin insert into public.receipt_checkout_attempts(owner_id,payment_id,mode,amount_cents,description,return_origin) values(owner,receipt.id,'test',5625,'QA','https://www.academycostabrava.com');exception when others then if sqlerrm like 'Secretaría debe revisar%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Receipt hold bypassed';end if;
 blocked:=false;begin insert into public.academy_checkout_contracts(membership_id,owner_id,mode,choice,plan_name,unit_cents,fee_cents,months,total_cents,return_origin) values(m,owner,'test','monthly','QA',7500,0,9,67500,'https://www.academycostabrava.com');exception when others then if sqlerrm like 'Secretaría debe revisar%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Legacy hold bypassed';end if;
 blocked:=false;begin perform public.claim_payment_reminder(gen_random_uuid(),actor,receipt.id,guardian,'qa-history-'||owner||'@example.invalid',(receipt.amount*100)::bigint);exception when others then if sqlerrm like 'Secretaría debe revisar%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Reminder hold bypassed';end if;
 blocked:=false;begin perform public.prepare_parent_monthly_billing(owner,guardian,'test');exception when others then if sqlerrm like 'Secretaría debe revisar%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Parent hold bypassed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 blocked:=false;begin perform public.complete_membership_history_review(m,'Unauthorized family review');exception when others then if sqlerrm='Sin permisos' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Parent completed review';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 -- Record an actual historic collection only on our disposable receipt, using the normal ledger RPC.
 perform public.collect_manual_batch(gen_random_uuid(),jsonb_build_array(jsonb_build_object('id',receipt.id,'version',receipt.updated_at,'amount',receipt.amount)),receipt.amount,'2026-09-15','cash','QA historical collection');
 if (select status from public.payments where id=receipt.id)<>'paid' then raise exception 'Historical receipt not settled';end if;
 if not exists(select 1 from public.manual_receipt_allocations where payment_id=receipt.id and paid_date='2026-09-15' and amount=receipt.amount and method='cash') then raise exception 'Lost actual collection date';end if;
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into before_review from public.payments x where ref_id=m;
 perform public.complete_membership_history_review(m,'Septiembre cobrado y registrado. Octubre y noviembre siguen pendientes; revisar con la familia.');
 perform public.complete_membership_history_review(m,'Retry must preserve first review');
 if before_review is distinct from (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.payments x where ref_id=m) then raise exception 'Review altered receipts';end if;
 if not exists(select 1 from public.academy_memberships where id=m and history_reviewed_by=actor and history_reviewed_at is not null and history_review_note like 'Septiembre%') then raise exception 'Missing review audit';end if;
 execute 'reset role';
 -- Parent self-service now includes ONLY future unpaid monthly receipts, not the paid September or past debt/extra.
 result:=public.prepare_parent_monthly_billing(owner,guardian,'test');billing:=(result->>'requestId')::uuid;
 if billing is null or not exists(select 1 from public.billing_request_items where request_id=billing) then raise exception 'Future subscription not prepared';end if;
 if exists(select 1 from public.billing_request_items i join public.payments x on x.id=i.payment_id where i.request_id=billing and (x.status='paid' or x.due_date<=current_date or x.concept_code<>'monthly' or i.phase<>'recurring')) then raise exception 'Recollected past/paid/extra receipt';end if;
 if (select count(*) from public.registration_email_outbox where source_id=r and event_kind='reviewed')<>1 then raise exception 'Missing or duplicate queued welcome';end if;
 if baseline is distinct from (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.payments x where child_id is distinct from child) then raise exception 'Existing payments changed';end if;
end $$;
rollback;
select 'PASS: historical acceptance/proration, retry, all online/reminder guards, guardian denial, dated manual collection, admin review audit, future-only card and no prior receipt changes. All fixtures rolled back; no providers called.' result,
 count(*) payments,md5(string_agg(to_jsonb(p)::text,'' order by id)) digest from public.payments p;
