-- Run only after the dedicated transfer registration routes are deployed.
begin;
do $$
declare baseline text; changed integer;
begin
 select md5(string_agg(to_jsonb(p)::text,'' order by id)) into baseline from public.payments p;
 update public.tournaments_internal set status='open' where status='coming_soon' and (
 (id='15f0483d-26a8-450e-a6a8-8f7a7c957277' and price=450 and start_date='2027-03-24' and end_date='2027-03-27') or
 (id='9b6c8ac0-a542-49ab-a116-6679c8640932' and price=1025 and start_date='2027-07-05' and end_date='2027-07-11') or
 (id='c93d7e14-a316-4dab-b240-a6e4b3d0ee81' and price=599 and start_date='2027-06-24' and end_date='2027-06-27'));
 get diagnostics changed=row_count;
 if changed<>3 then raise exception 'Expected three unchanged coming-soon tournaments; review before opening'; end if;
 if baseline is distinct from (select md5(string_agg(to_jsonb(p)::text,'' order by id)) from public.payments p) then raise exception 'Payment records changed'; end if;
end $$;
commit;
select id,title,status,start_date,end_date,price from public.tournaments_internal where id in ('15f0483d-26a8-450e-a6a8-8f7a7c957277','9b6c8ac0-a542-49ab-a116-6679c8640932','c93d7e14-a316-4dab-b240-a6e4b3d0ee81');
