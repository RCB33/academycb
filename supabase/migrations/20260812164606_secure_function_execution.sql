-- Production audit: database functions must not become anonymous RPC endpoints
-- merely because PostgreSQL grants EXECUTE by default. Trigger functions are
-- invoked by their triggers, not by clients, so their direct API access is
-- removed altogether.

-- Pin paths on the four functions identified by the database advisor.
alter function public.is_coach() set search_path = public;
alter function public.try_uuid(text) set search_path = pg_catalog;
alter function public.settings_touch_updated_at() set search_path = pg_catalog;
alter function public.update_academy_settings_updated_at_column() set search_path = pg_catalog;

-- Authenticated-only helpers used by RLS policies or protected application RPCs.
revoke execute on function public.has_role(text[]) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_coach() from public, anon;
revoke execute on function public.is_guardian_of(uuid) from public, anon;
revoke execute on function public.is_coach_of(uuid) from public, anon;
revoke execute on function public.current_worker_id() from public, anon;
revoke execute on function public.can_manage_calendar_event(uuid) from public, anon;
revoke execute on function public.rotate_public_share_token(uuid) from public, anon;
revoke execute on function public.update_lead_status_for_marketing(uuid, text) from public, anon;
revoke execute on function public.try_uuid(text) from public, anon;

-- These are trigger-only internal functions.  The two explicitly public
-- functions (public player profile and storefront checkout) are deliberately
-- excluded because their inputs and output have separate public contracts.
revoke execute on function public.handle_new_user_role() from public, anon, authenticated;
revoke execute on function public.settings_touch_updated_at() from public, anon, authenticated;
revoke execute on function public.update_academy_settings_updated_at_column() from public, anon, authenticated;
revoke execute on function public.log_settings_change() from public, anon, authenticated;
revoke execute on function public.protect_category_in_use() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.sync_calendar_primary_worker() from public, anon, authenticated;
revoke execute on function public.sync_team_calendar() from public, anon, authenticated;
revoke execute on function public.sync_campus_calendar() from public, anon, authenticated;
revoke execute on function public.sync_tournament_calendar() from public, anon, authenticated;
revoke execute on function public.sync_commercial_source_payment() from public, anon, authenticated;
revoke execute on function public.sync_payment_to_commercial_source() from public, anon, authenticated;
