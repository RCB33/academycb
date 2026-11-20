-- Audience precedence is child > team > category. An individual asset must not
-- become visible to other families merely because it also carries a category.
drop policy if exists media_guardian_read on public.media_assets;
create policy media_guardian_read on public.media_assets for select to authenticated using (
  case
    when child_id is not null then public.is_guardian_of(child_id)
    when team_id is not null then (
      exists(select 1 from public.children c where c.team_id=media_assets.team_id and c.archived_at is null and public.is_guardian_of(c.id))
      or private.guardian_has_academy_team(team_id)
    )
    when category_id is not null then exists(select 1 from public.children c where c.category_id=media_assets.category_id and c.archived_at is null and public.is_guardian_of(c.id))
    else false
  end
);
