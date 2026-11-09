\set ON_ERROR_STOP on
begin;
create role anon; create role authenticated;
create table public.payments(id uuid primary key default gen_random_uuid(),type text,ref_id uuid,child_id uuid,amount numeric,status text,method text,paid_at timestamptz,due_date date,description text,created_at timestamptz default now(),updated_at timestamptz default now());
create table public.campuses(id uuid primary key,price numeric,name text,capacity integer);
create table public.campus_enrollments(id uuid primary key default gen_random_uuid(),campus_id uuid,child_id uuid,status text,created_at timestamptz default now());
create table public.tournaments_internal(id uuid primary key,price numeric,title text);
create table public.tournament_players(id uuid primary key default gen_random_uuid(),tournament_id uuid,child_id uuid,status text);
create table public.tournament_teams(id uuid primary key,tournament_id uuid,team_name text,status text,created_at timestamptz default now());
create table public.store_products(id uuid primary key,name text,price numeric,stock integer,sizes text[],is_active boolean,updated_at timestamptz default now());
create table public.orders(id uuid primary key default gen_random_uuid(),customer_name text,customer_email text,customer_phone text,total_amount numeric,status text,payment_method text,created_at timestamptz default now());
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid,product_id uuid,product_name text,quantity integer,price numeric,size text);
\ir ../supabase/migrations/20260914163603_separate_booking_from_payment.sql
create trigger order_finance_sync after insert or update of status on public.orders for each row execute function public.sync_commercial_source_payment();
\ir ../supabase/migrations/20260914193104_tournament_player_receipts.sql
\ir ../supabase/migrations/20260914193109_store_order_stock_safety.sql
do $$
declare product uuid:=gen_random_uuid(); order_id uuid; tournament uuid:=gen_random_uuid(); player uuid:=gen_random_uuid(); campus uuid:=gen_random_uuid(); enrollment uuid;
begin
 insert into public.store_products(id,name,price,stock,sizes,is_active) values(product,'Test shirt',10,5,array['S','M'],true);
 begin
  perform public.place_store_order('Test Parent','qa@example.com','600000000',jsonb_build_array(jsonb_build_object('product_id',product,'quantity',3,'size','S'),jsonb_build_object('product_id',product,'quantity',3,'size','M')));
  raise exception 'Duplicate lines exceeded stock';
 exception when others then if sqlerrm='Duplicate lines exceeded stock' then raise; end if; end;
 if (select stock from public.store_products where id=product)<>5 or exists(select 1 from public.orders) then raise exception 'Failed cart mutated stock/order'; end if;
 order_id:=public.place_store_order('Test Parent','qa@example.com','600000000',jsonb_build_array(jsonb_build_object('product_id',product,'quantity',2,'size','S'),jsonb_build_object('product_id',product,'quantity',2,'size','M')));
 if (select stock from public.store_products where id=product)<>1 or (select amount from public.payments where ref_id=order_id)<>40 then raise exception 'Cart total or stock wrong'; end if;
 update public.orders set status='cancelled' where id=order_id;
 update public.orders set status='cancelled' where id=order_id;
 if (select stock from public.store_products where id=product)<>5 then raise exception 'Cancelled stock not restored exactly once'; end if;
 begin
  update public.orders set status='pending' where id=order_id;
  raise exception 'Released order reopened';
 exception when others then if sqlerrm='Released order reopened' then raise; end if; end;
 order_id:=public.place_store_order('Test Parent','qa@example.com','600000000',jsonb_build_array(jsonb_build_object('product_id',product,'quantity',2,'size','S')));
 update public.orders set status='paid' where id=order_id;
 update public.orders set status='cancelled' where id=order_id;
 if (select stock from public.store_products where id=product)<>3 then raise exception 'Paid order restocked without return'; end if;
 insert into public.tournaments_internal values(tournament,80,'Tournament');
 insert into public.tournament_players values(player,tournament,gen_random_uuid(),'selected');
 if exists(select 1 from public.payments where ref_id=player) then raise exception 'Unapproved player billed'; end if;
 update public.tournament_players set status='confirmed' where id=player;
 if not exists(select 1 from public.payments where ref_id=player and child_id is not null and amount=80 and status='pending') then raise exception 'Per-player receipt missing'; end if;
 update public.tournaments_internal set price=200 where id=tournament;
 update public.tournament_players set status='confirmed' where id=player;
 if (select amount from public.payments where ref_id=player)<>80 then raise exception 'Player repriced'; end if;
 insert into public.campuses values(campus,50,'Campus',1);
 insert into public.campus_enrollments(campus_id,status) values(campus,'pending_payment') returning id into enrollment;
 begin
  insert into public.campus_enrollments(campus_id,status) values(campus,'confirmed');
  raise exception 'Campus overbooked';
 exception when others then if sqlerrm='Campus overbooked' then raise; end if; end;
 update public.campus_enrollments set status='cancelled' where id=enrollment;
 insert into public.campus_enrollments(campus_id,status) values(campus,'confirmed');
 raise notice 'PASS: grouped stock, rollback, immutable totals, cancellation restoration, no paid restock, player pricing/approval, campus capacity.';
end;
$$;
rollback;
