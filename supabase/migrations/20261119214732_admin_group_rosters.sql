-- Shared current/upcoming admin roster, including Sunday. No historical rewrites.
create function public.admin_group_player_links()
returns table(child_id uuid,team_id uuid)
language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo administración puede consultar los grupos'; end if;
 return query
 select c.id,c.team_id from public.children c
 where c.archived_at is null and c.team_id is not null
 and not exists(select 1 from public.academy_group_assignments ga where ga.child_id=c.id and ga.team_id=c.team_id)
 union
 select c.id,ga.team_id from public.children c
 join public.academy_group_assignments ga on ga.child_id=c.id
 join public.academy_memberships m on m.id=ga.membership_id
 where c.archived_at is null and m.status in ('active','pending_payment')
 and m.end_date >= (now() at time zone 'Europe/Madrid')::date;
end $$;
revoke all on function public.admin_group_player_links() from public,anon;
grant execute on function public.admin_group_player_links() to authenticated;
