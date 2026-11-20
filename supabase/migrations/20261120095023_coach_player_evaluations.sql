-- Preserve all existing evaluations and payments. One dated evaluation per player.
create unique index child_metrics_child_date_unique on public.child_metrics(child_id, recorded_at);
alter table public.child_metrics add column evaluated_by uuid references public.profiles(id) on delete set null;
alter table public.child_metrics add constraint child_metrics_valid_scores check (
    pace between 0 and 99 and shooting between 0 and 99 and passing between 0 and 99
    and dribbling between 0 and 99 and defending between 0 and 99 and physical between 0 and 99
    and discipline between 0 and 99
) not valid;
create policy metrics_assigned_coach_insert on public.child_metrics for insert to authenticated
with check (public.is_coach_of(child_id) and evaluated_by = (select auth.uid()));
create policy metrics_assigned_coach_update on public.child_metrics for update to authenticated
using (public.is_coach_of(child_id))
with check (public.is_coach_of(child_id) and evaluated_by = (select auth.uid()));
