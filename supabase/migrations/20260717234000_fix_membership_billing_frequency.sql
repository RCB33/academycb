-- Store a real due date instead of relying on receipt descriptions.
alter table public.payments
  add column if not exists due_date date;

create index if not exists payments_due_date_idx
  on public.payments(due_date);

-- The original seed inserted these plans before the frequency column existed,
-- so PostgreSQL assigned the monthly default to all three.
update public.membership_plans
set frequency = 'mensual'
where lower(trim(name)) = 'mensual' and duration_months = 1;

update public.membership_plans
set frequency = 'trimestral'
where lower(trim(name)) = 'trimestral' and duration_months = 3;

update public.membership_plans
set frequency = 'anual'
where lower(trim(name)) = 'anual' and duration_months = 12;

-- Repair only schedules produced by the old bug and only while every receipt
-- is still pending. Paid/refunded accounting history is deliberately untouched.
do $$
declare
  membership record;
  existing_count integer;
  non_pending_count integer;
  interval_months integer;
  receipt_count integer;
  receipt_number integer;
  receipt_date date;
begin
  for membership in
    select
      am.id,
      am.child_id,
      am.start_date,
      am.payment_method,
      am.monthly_price,
      mp.duration_months,
      mp.frequency
    from public.academy_memberships am
    join public.membership_plans mp on mp.id = am.plan_id
    where mp.frequency in ('trimestral', 'anual')
  loop
    select
      count(*)::integer,
      count(*) filter (where status <> 'pending')::integer
    into existing_count, non_pending_count
    from public.payments
    where type = 'academy' and ref_id = membership.id;

    if existing_count = membership.duration_months and non_pending_count = 0 then
      delete from public.payments
      where type = 'academy' and ref_id = membership.id;

      interval_months := case membership.frequency
        when 'anual' then 12
        when 'trimestral' then 3
        else 1
      end;
      receipt_count := (membership.duration_months + interval_months - 1) / interval_months;

      for receipt_number in 0..(receipt_count - 1) loop
        receipt_date := membership.start_date + make_interval(months => receipt_number * interval_months);

        insert into public.payments (
          type, ref_id, child_id, amount, status, method, due_date, description
        ) values (
          'academy',
          membership.id,
          membership.child_id,
          membership.monthly_price,
          'pending',
          membership.payment_method,
          receipt_date,
          'Cuota ' || membership.frequency || ' - ' ||
            to_char(receipt_date, 'DD/MM/YYYY')
        );
      end loop;
    end if;
  end loop;
end
$$;
