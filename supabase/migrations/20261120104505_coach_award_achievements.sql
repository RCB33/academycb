-- Coaches may award existing trophies to active players, not edit the catalogue
-- or revoke prior awards. Existing guardian/admin access is unchanged.
create policy child_achievements_coach_read on public.child_achievements
for select to authenticated using (
 (select private.active_coach()) and exists (
  select 1 from public.children c where c.id=child_id and c.archived_at is null
 )
);
create policy child_achievements_coach_award on public.child_achievements
for insert to authenticated with check (
 (select private.active_coach()) and exists (
  select 1 from public.children c where c.id=child_id and c.archived_at is null
 ) and coalesce(length(note),0)<=1000
 and earned_at=(now() at time zone 'Europe/Madrid')::date
);
