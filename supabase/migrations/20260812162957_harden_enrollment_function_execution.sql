-- Enrollment management functions are for signed-in staff only. The trigger
-- function is internal and should never be exposed as an RPC endpoint.
revoke all on function public.convert_enrollment_request(uuid) from public, anon, authenticated;
grant execute on function public.convert_enrollment_request(uuid) to authenticated;

revoke all on function public.update_enrollment_request_status(uuid, text) from public, anon, authenticated;
grant execute on function public.update_enrollment_request_status(uuid, text) to authenticated;

revoke all on function public.notify_enrollment_request_received() from public, anon, authenticated;
