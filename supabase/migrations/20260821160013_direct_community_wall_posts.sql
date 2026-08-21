-- Families share achievements directly. Academy retains the ability to remove
-- any post, while private posts remain visible only to their family and admins.
alter table public.community_posts alter column status set default 'published';
update public.community_posts set status = 'published', published_at = coalesce(published_at, created_at) where status = 'pending';

drop policy if exists "community_posts_guardian_insert" on public.community_posts;
create policy "community_posts_guardian_insert" on public.community_posts for insert to authenticated
with check (
  author_user_id = auth.uid()
  and status = 'published'
  and child_id is not null
  and public.is_guardian_of(child_id)
);

drop policy if exists "community_posts_guardian_delete_pending" on public.community_posts;
create policy "community_posts_guardian_delete_own" on public.community_posts for delete to authenticated
using (author_user_id = auth.uid());

create or replace function public.notify_community_post_pending()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  return new;
end;
$$;
revoke all on function public.notify_community_post_pending() from public, anon, authenticated;
