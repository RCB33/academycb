-- PostgREST ON CONFLICT(key) cannot infer a partial unique index.
-- A regular UNIQUE key still permits multiple NULLs for legacy integration rows.
alter table public.academy_settings add constraint academy_settings_key_unique unique(key);
drop index public.academy_settings_key_idx;

