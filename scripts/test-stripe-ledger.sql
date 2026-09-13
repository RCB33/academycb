-- Run as an administrative diagnostic. Every mutation is rolled back.
begin;
do $$
declare owner_uuid uuid; a public.stripe_test_attempts; b public.stripe_test_attempts;
    sid text; eid text; result text; payment_count bigint; current_count bigint;
begin
    select id into owner_uuid from public.profiles where role='admin' limit 1;
    if owner_uuid is null then raise exception 'Test requires an existing admin'; end if;
    select count(*) into payment_count from public.payments;
    a := public.reserve_stripe_connection_test(owner_uuid,'https://academy-qa.vercel.app/admin/stripe');
    b := public.reserve_stripe_connection_test(owner_uuid,'https://academy-qa.vercel.app/admin/stripe');
    if a.id <> b.id then raise exception 'Duplicate active attempt'; end if;
    sid := 'cs_test_QA' || replace(a.id::text,'-','');
    eid := 'evt_QA' || replace(a.id::text,'-','');
    update public.stripe_test_attempts set stripe_session_id=sid,state='open' where id=a.id;
    begin
        perform public.confirm_stripe_connection_test(eid,'checkout.session.completed',a.id,sid,true,100,'eur','paid');
        raise exception 'TEST_FAILED: live accepted';
    exception when raise_exception then if sqlerrm like 'TEST_FAILED%' then raise; end if; end;
    begin
        perform public.confirm_stripe_connection_test(eid,'checkout.session.completed',a.id,sid,false,1,'eur','paid');
        raise exception 'TEST_FAILED: amount accepted';
    exception when raise_exception then if sqlerrm like 'TEST_FAILED%' then raise; end if; end;
    perform public.confirm_stripe_connection_test(eid || 'unpaid','checkout.session.completed',a.id,sid,false,100,'eur','unpaid');
    if (select state from public.stripe_test_attempts where id=a.id)='paid' then raise exception 'Unpaid marked paid'; end if;
    result := public.confirm_stripe_connection_test(eid,'checkout.session.completed',a.id,sid,false,100,'eur','paid');
    if result <> 'processed' then raise exception 'First event not processed'; end if;
    result := public.confirm_stripe_connection_test(eid,'checkout.session.completed',a.id,sid,false,100,'eur','paid');
    if result <> 'duplicate' then raise exception 'Duplicate not detected'; end if;
    perform public.confirm_stripe_connection_test(eid || 'late','checkout.session.expired',a.id,sid,false,100,'eur','unpaid');
    if (select state from public.stripe_test_attempts where id=a.id) <> 'paid' then raise exception 'Paid state regressed'; end if;
    if (select confirmed_at from public.stripe_test_attempts where id=a.id) is null then raise exception 'No confirmation timestamp'; end if;
    select count(*) into current_count from public.payments;
    if current_count <> payment_count then raise exception 'Real ledger changed'; end if;
    if has_function_privilege('anon','public.confirm_stripe_connection_test(text,text,uuid,text,boolean,integer,text,text)','EXECUTE')
       or has_function_privilege('authenticated','public.confirm_stripe_connection_test(text,text,uuid,text,boolean,integer,text,text)','EXECUTE')
       or has_table_privilege('authenticated','public.stripe_test_attempts','UPDATE') then raise exception 'Public write privilege'; end if;
end $$;
select 'PASS: one active attempt, unpaid/live/mismatched rejection, duplicate delivery, paid-state monotonicity, server-only writes, no real payments created. Rolled back.' as result;
rollback;
