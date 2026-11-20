-- Daily internal check at 07:15 UTC (08:15/09:15 Madrid). The function selects
-- the day 3/7/8 stage in Europe/Madrid and deduplicates by recipient/month/stage.
-- Only notifications: never email families, charge Stripe or settle cash.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('academy-monthly-payment-review','15 7 * * *','select private.review_academy_monthly_payments();');
