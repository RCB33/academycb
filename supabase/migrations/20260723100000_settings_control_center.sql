-- Business settings control centre.
-- Adds durable configuration, safe lifecycle controls and an audit trail.

alter table public.academy_settings
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

insert into public.academy_settings (key, value, is_public) values
  ('academy_legal_name', '', true),
  ('academy_website', 'https://www.academycostabrava.com', true),
  ('academy_instagram', '', true),
  ('academy_facebook', '', true),
  ('academy_youtube', '', true),
  ('academy_logo_url', '', true),
  ('default_location', '', true),
  ('support_hours', '', true),
  ('timezone', 'Europe/Madrid', true),
  ('locale', 'es-ES', true),
  ('currency', 'EUR', true),
  ('season_start', '', false),
  ('season_end', '', false),
  ('payment_cash_enabled', 'true', false),
  ('payment_transfer_enabled', 'true', false),
  ('payment_card_enabled', 'false', false),
  ('default_payment_method', 'transferencia', false),
  ('bank_account_holder', '', false),
  ('bank_iban', '', false),
  ('bank_bic', '', false),
  ('bank_transfer_instructions', '', false),
  ('billing_due_day', '5', false),
  ('billing_grace_days', '5', false),
  ('receipt_prefix', 'ACB', false),
  ('invoice_tax_rate', '0', false),
  ('invoice_notes', '', false),
  ('privacy_contact_email', '', true),
  ('data_retention_months', '60', false)
on conflict (key) where key is not null do nothing;

drop policy if exists "academy_settings_finance_billing_read" on public.academy_settings;
create policy "academy_settings_finance_billing_read" on public.academy_settings for select to authenticated
using (
  public.has_role(array['admin','finance']) and key in (
    'payment_cash_enabled','payment_transfer_enabled','payment_card_enabled',
    'default_payment_method','billing_due_day','billing_grace_days',
    'receipt_prefix','invoice_tax_rate'
  )
);

alter table public.membership_plans
  add column if not exists description text not null default '',
  add column if not exists enrollment_fee numeric not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

update public.membership_plans
set frequency = case
  when frequency in ('mensual','trimestral','anual') then frequency
  when duration_months = 1 then 'mensual'
  when duration_months = 3 then 'trimestral'
  else 'anual'
end,
price = greatest(coalesce(price, 0), 0),
duration_months = greatest(duration_months, 1),
enrollment_fee = greatest(enrollment_fee, 0);

alter table public.membership_plans drop constraint if exists membership_plans_price_nonnegative;
alter table public.membership_plans add constraint membership_plans_price_nonnegative check (price >= 0);
alter table public.membership_plans drop constraint if exists membership_plans_duration_positive;
alter table public.membership_plans add constraint membership_plans_duration_positive check (duration_months > 0);
alter table public.membership_plans drop constraint if exists membership_plans_enrollment_fee_nonnegative;
alter table public.membership_plans add constraint membership_plans_enrollment_fee_nonnegative check (enrollment_fee >= 0);
alter table public.membership_plans drop constraint if exists membership_plans_frequency_valid;
alter table public.membership_plans add constraint membership_plans_frequency_valid check (frequency in ('mensual','trimestral','anual'));

alter table public.categories
  add column if not exists short_name text,
  add column if not exists birth_year_from integer,
  add column if not exists birth_year_to integer,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.categories drop constraint if exists categories_birth_year_range;
alter table public.categories add constraint categories_birth_year_range check (
  birth_year_from is null or birth_year_to is null or birth_year_from <= birth_year_to
);

create table if not exists public.settings_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null check (entity_type in ('setting','plan','category')),
  entity_id text not null,
  action text not null check (action in ('create','update','delete')),
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.settings_audit_log enable row level security;
create index if not exists settings_audit_log_created_idx on public.settings_audit_log(created_at desc);

drop policy if exists "settings_audit_admin_read" on public.settings_audit_log;
create policy "settings_audit_admin_read" on public.settings_audit_log for select to authenticated
using (public.is_admin());

create or replace function public.settings_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists membership_plans_touch_updated_at on public.membership_plans;
create trigger membership_plans_touch_updated_at
before update on public.membership_plans
for each row execute function public.settings_touch_updated_at();

drop trigger if exists categories_touch_updated_at on public.categories;
create trigger categories_touch_updated_at
before update on public.categories
for each row execute function public.settings_touch_updated_at();

create or replace function public.log_settings_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_old jsonb;
  safe_new jsonb;
  target_type text;
  target_id text;
begin
  if tg_table_name = 'academy_settings' then
    target_id := case when tg_op = 'DELETE' then old.key else new.key end;
    if target_id = 'whatsapp_integration' then
      if tg_op = 'DELETE' then return old; else return new; end if;
    end if;
    target_type := 'setting';
    target_id := coalesce(target_id, 'unknown');
    safe_old := case when tg_op = 'INSERT' then '{}'::jsonb else jsonb_build_object('value', old.value, 'is_public', old.is_public) end;
    safe_new := case when tg_op = 'DELETE' then '{}'::jsonb else jsonb_build_object('value', new.value, 'is_public', new.is_public) end;
  elsif tg_table_name = 'membership_plans' then
    target_type := 'plan';
    target_id := case when tg_op = 'DELETE' then old.id::text else new.id::text end;
    safe_old := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
    safe_new := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  else
    target_type := 'category';
    target_id := case when tg_op = 'DELETE' then old.id::text else new.id::text end;
    safe_old := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
    safe_new := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  end if;

  if tg_op <> 'UPDATE' or safe_old is distinct from safe_new then
    insert into public.settings_audit_log(actor_id, entity_type, entity_id, action, changes)
    values (
      auth.uid(), target_type, target_id,
      case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end,
      jsonb_build_object('before', safe_old, 'after', safe_new)
    );
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists academy_settings_audit on public.academy_settings;
create trigger academy_settings_audit
after insert or update or delete on public.academy_settings
for each row execute function public.log_settings_change();

drop trigger if exists membership_plans_audit on public.membership_plans;
create trigger membership_plans_audit
after insert or update or delete on public.membership_plans
for each row execute function public.log_settings_change();

drop trigger if exists categories_audit on public.categories;
create trigger categories_audit
after insert or update or delete on public.categories
for each row execute function public.log_settings_change();

create or replace function public.protect_category_in_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.children where category_id = old.id)
     or exists (select 1 from public.teams where category_id = old.id) then
    raise exception 'La categoría está en uso y debe archivarse en lugar de eliminarse.';
  end if;
  return old;
end;
$$;

drop trigger if exists categories_prevent_in_use_delete on public.categories;
create trigger categories_prevent_in_use_delete
before delete on public.categories
for each row execute function public.protect_category_in_use();

notify pgrst, 'reload schema';
