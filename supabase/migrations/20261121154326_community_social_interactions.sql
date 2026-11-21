-- Private social interactions. Existing posts/media retain their consent controls.
create function private.community_member() returns boolean language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and (
   public.has_role(array['admin']) or
   (public.has_role(array['guardian']) and exists(
     select 1 from public.guardians g join public.child_guardians cg on cg.guardian_id=g.id
     join public.children c on c.id=cg.child_id
     where g.user_id=auth.uid() and c.archived_at is null
   ))
 );
$$;
revoke all on function private.community_member() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.community_member() to authenticated;
-- Signing up without a linked family does not unlock the community.
drop policy community_posts_guardian_read on public.community_posts;
create policy community_posts_guardian_read on public.community_posts for select to authenticated
using (author_user_id=(select auth.uid()) or (visibility='community' and status='published' and (select private.community_member())));

create table public.community_post_likes (
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create index community_post_likes_user_idx on public.community_post_likes(user_id);
create table public.community_post_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.community_posts(id) on delete cascade,
 author_user_id uuid not null references auth.users(id) on delete cascade,
 author_name text not null default 'Familia Academy',
 body text not null check(char_length(btrim(body)) between 1 and 600),
 created_at timestamptz not null default now()
);
create index community_post_comments_post_created_idx on public.community_post_comments(post_id,created_at,id);
create index community_post_comments_author_idx on public.community_post_comments(author_user_id);
alter table public.community_post_likes enable row level security;
alter table public.community_post_comments enable row level security;
revoke all on public.community_post_likes,public.community_post_comments from public,anon,authenticated;
grant select,insert,delete on public.community_post_likes,public.community_post_comments to authenticated;
grant all on public.community_post_likes,public.community_post_comments to service_role;

create policy community_likes_read on public.community_post_likes for select to authenticated
using ((select private.community_member()) and exists(select 1 from public.community_posts p where p.id=post_id and p.visibility='community' and p.status='published'));
create policy community_likes_insert on public.community_post_likes for insert to authenticated
with check(user_id=(select auth.uid()) and (select private.community_member()) and exists(select 1 from public.community_posts p where p.id=post_id and p.visibility='community' and p.status='published'));
create policy community_likes_delete on public.community_post_likes for delete to authenticated using(user_id=(select auth.uid()));
create policy community_comments_read on public.community_post_comments for select to authenticated
using ((select private.community_member()) and exists(select 1 from public.community_posts p where p.id=post_id and p.visibility='community' and p.status='published'));
create policy community_comments_insert on public.community_post_comments for insert to authenticated
with check(author_user_id=(select auth.uid()) and (select private.community_member()) and exists(select 1 from public.community_posts p where p.id=post_id and p.visibility='community' and p.status='published'));
create policy community_comments_delete on public.community_post_comments for delete to authenticated using(author_user_id=(select auth.uid()) or public.is_admin());

-- The database, not a client-supplied label, chooses the adult's first name.
-- Invoker reads only the current user's own profile via existing RLS.
create function private.community_comment_author() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or new.author_user_id<>auth.uid() then raise exception 'Autor no válido'; end if;
 select case when public.is_admin() then 'Equipo Academy' else coalesce(nullif(split_part(btrim(full_name),' ',1),''),'Familia Academy') end
 into new.author_name from public.profiles where id=auth.uid();
 new.author_name=left(coalesce(new.author_name,'Familia Academy'),60);
 new.created_at=now();
 new.body=btrim(new.body);
 return new;
end $$;
revoke all on function private.community_comment_author() from public,anon,authenticated;
create trigger community_comment_author before insert on public.community_post_comments for each row execute function private.community_comment_author();

-- Aggregates run with the viewer's RLS and never multiply counts by joining likes to comments.
create function public.community_post_engagement(post_ids uuid[]) returns table(post_id uuid,likes bigint,liked boolean,comments bigint)
language sql stable security invoker set search_path='' as $$
 select p.id,
 (select count(*) from public.community_post_likes l where l.post_id=p.id),
 exists(select 1 from public.community_post_likes l where l.post_id=p.id and l.user_id=auth.uid()),
 (select count(*) from public.community_post_comments c where c.post_id=p.id)
 from public.community_posts p where p.id=any(post_ids[1:100]) and p.visibility='community' and p.status='published';
$$;
revoke all on function public.community_post_engagement(uuid[]) from public,anon;
grant execute on function public.community_post_engagement(uuid[]) to authenticated;
