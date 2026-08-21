-- Private, moderated community wall for Academy families.
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  body text not null check (char_length(trim(body)) between 2 and 1500),
  media_path text,
  media_type text check (media_type in ('image', 'video')),
  visibility text not null default 'community' check (visibility in ('private', 'community')),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  moderation_note text check (moderation_note is null or char_length(moderation_note) <= 500),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_media_consistency check (
    (media_path is null and media_type is null) or (media_path is not null and media_type is not null)
  )
);

create index if not exists community_posts_status_created_idx on public.community_posts(status, created_at desc);
create index if not exists community_posts_author_created_idx on public.community_posts(author_user_id, created_at desc);

alter table public.community_posts enable row level security;

create or replace function public.set_community_post_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists community_posts_updated_at on public.community_posts;
create trigger community_posts_updated_at before update on public.community_posts
for each row execute function public.set_community_post_updated_at();

create policy "community_posts_admin_all" on public.community_posts for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "community_posts_guardian_read" on public.community_posts for select to authenticated
using (
  author_user_id = auth.uid()
  or (visibility = 'community' and status = 'published')
);

create policy "community_posts_guardian_insert" on public.community_posts for insert to authenticated
with check (
  author_user_id = auth.uid()
  and status = 'pending'
  and child_id is not null
  and public.is_guardian_of(child_id)
);

create policy "community_posts_guardian_delete_pending" on public.community_posts for delete to authenticated
using (author_user_id = auth.uid() and status = 'pending');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-wall', 'community-wall', false, 20971520, array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "community_wall_admin_all" on storage.objects for all to authenticated
using (bucket_id = 'community-wall' and public.is_admin())
with check (bucket_id = 'community-wall' and public.is_admin());

create policy "community_wall_guardian_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'community-wall' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "community_wall_guardian_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'community-wall' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "community_wall_read_allowed" on storage.objects for select to authenticated
using (
  bucket_id = 'community-wall' and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.community_posts post
      where post.media_path = storage.objects.name
        and post.visibility = 'community'
        and post.status = 'published'
    )
  )
);

create or replace function public.notify_community_post_pending()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, title, message, type, link_url)
  select id, 'Nueva publicación para moderar', 'Una familia ha enviado una publicación al Muro Academy.', 'community_post', '/admin/muro'
  from public.profiles where role = 'admin';
  return new;
end;
$$;

revoke all on function public.notify_community_post_pending() from public, anon, authenticated;
drop trigger if exists community_post_notification on public.community_posts;
create trigger community_post_notification after insert on public.community_posts
for each row execute function public.notify_community_post_pending();
