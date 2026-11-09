-- Campus requests include health and consent data; only administrators may read them.
alter policy enrollment_requests_marketing_read on public.enrollment_requests
using (service <> 'campus' and has_role(ARRAY['marketing'::text]));
