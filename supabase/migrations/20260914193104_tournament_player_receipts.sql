-- Academy participates with its players: charge confirmed players, not teams.
-- Retain existing team receipts for manual reconciliation; do not rewrite them.
drop trigger if exists tournament_team_finance_sync on public.tournament_teams;
create function public.sync_tournament_player_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
declare p public.payments%rowtype; price numeric; title text;
begin
 if tg_op='DELETE' then
   update public.payments set ref_id=null,updated_at=now() where type='tournament' and ref_id=old.id;
   return old;
 end if;
 select * into p from public.payments where type='tournament' and ref_id=new.id order by created_at,id limit 1 for update;
 if found then
   if new.status='cancelled' and p.status in ('pending','failed') then update public.payments set status='cancelled',updated_at=now() where id=p.id; end if;
   if new.status='confirmed' and p.status='cancelled' then update public.payments set status='pending',updated_at=now() where id=p.id; end if;
 elsif new.status='confirmed' then
   select t.price,t.title into price,title from public.tournaments_internal t where id=new.tournament_id;
   if price is null or price<0 or price*100<>trunc(price*100) then raise exception 'Invalid tournament price'; end if;
   if price>0 then
     insert into public.payments(type,ref_id,child_id,amount,status,method,due_date,description)
     values('tournament',new.id,new.child_id,price,'pending',null,current_date,'Torneo · '||title||' · Participación de jugador');
   end if;
 end if;
 return new;
end;
$$;
revoke all on function public.sync_tournament_player_receipt() from public,anon,authenticated;
create trigger tournament_player_finance_sync after insert or update of status or delete on public.tournament_players for each row execute function public.sync_tournament_player_receipt();
