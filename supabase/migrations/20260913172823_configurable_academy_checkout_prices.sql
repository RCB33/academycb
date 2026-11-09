-- Applied version reconciled with Supabase's migration history.
-- Additive configuration only. Existing prices, memberships and payments are untouched.
-- Online choices default to disabled; the owner must explicitly set each price.
alter table public.membership_plans
    add column full_payment_enabled boolean not null default false,
    add column full_payment_price numeric,
    add column monthly_payment_enabled boolean not null default false,
    add column monthly_payment_price numeric;

alter table public.membership_plans
    add constraint membership_plans_checkout_prices_valid check (
        (full_payment_price is null or (full_payment_price >= 0.50 and full_payment_price <= 1000000 and full_payment_price = round(full_payment_price, 2)))
        and (monthly_payment_price is null or (monthly_payment_price >= 0.50 and monthly_payment_price <= 1000000 and monthly_payment_price = round(monthly_payment_price, 2)))
        and (not full_payment_enabled or full_payment_price is not null)
        and (not monthly_payment_enabled or monthly_payment_price is not null)
        and (not monthly_payment_enabled or duration_months between 1 and 60)
    );

comment on column public.membership_plans.full_payment_price is 'Total tuition in EUR, excluding the one-time enrollment fee. Snapshot when contracting.';
comment on column public.membership_plans.monthly_payment_price is 'Monthly tuition in EUR, for duration_months installments, no automatic renewal. Snapshot when contracting.';
