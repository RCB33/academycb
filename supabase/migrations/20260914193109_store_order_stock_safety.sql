create or replace function public.place_store_order(customer_name_input text,customer_email_input text,customer_phone_input text,items_input jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare new_order uuid; item jsonb; product public.store_products%rowtype; qty integer; total numeric:=0; grouped record;
begin
 if customer_name_input is null or customer_email_input is null or customer_phone_input is null or items_input is null
 or length(trim(customer_name_input)) not between 2 and 120 or position('@' in customer_email_input)<2
 or length(trim(customer_email_input))>200 or length(trim(customer_phone_input)) not between 6 and 30
 or jsonb_typeof(items_input)<>'array' or jsonb_array_length(items_input) not between 1 and 20 then raise exception 'Datos de pedido inválidos'; end if;
 -- One deterministic lock order across all concurrent carts, regardless of
 -- the order in which the browser submitted its lines.
 perform 1 from public.store_products where id in (select (v->>'product_id')::uuid from jsonb_array_elements(items_input) v) order by id for update;
 for item in select * from jsonb_array_elements(items_input) loop
   if item->>'quantity' is null or item->>'quantity' !~ '^[0-9]+$' then raise exception 'Cantidad inválida'; end if;
   qty:=(item->>'quantity')::integer;
   if qty not between 1 and 20 then raise exception 'Cantidad inválida'; end if;
   select * into product from public.store_products where id=(item->>'product_id')::uuid and is_active;
   if not found or product.price is null or product.price<0 or product.price*100<>trunc(product.price*100) then raise exception 'Producto no disponible'; end if;
   if length(coalesce(item->>'size',''))>20 or (cardinality(product.sizes)>0 and (nullif(item->>'size','') is null or not ((item->>'size')=any(product.sizes)))) then raise exception 'Talla no disponible'; end if;
   total:=total+product.price*qty;
 end loop;
 for grouped in select (v->>'product_id')::uuid id,sum((v->>'quantity')::integer) quantity from jsonb_array_elements(items_input) v group by 1 loop
   select * into product from public.store_products where id=grouped.id;
   if product.stock is null or product.stock<grouped.quantity then raise exception 'Stock insuficiente'; end if;
 end loop;
 insert into public.orders(customer_name,customer_email,customer_phone,total_amount,status,payment_method)
 values(trim(customer_name_input),lower(trim(customer_email_input)),trim(customer_phone_input),total,'pending','manual') returning id into new_order;
 for item in select * from jsonb_array_elements(items_input) loop
   qty:=(item->>'quantity')::integer;
   select * into strict product from public.store_products where id=(item->>'product_id')::uuid;
   insert into public.order_items(order_id,product_id,product_name,quantity,price,size) values(new_order,product.id,product.name,qty,product.price,nullif(item->>'size',''));
   update public.store_products set stock=stock-qty,updated_at=now() where id=product.id;
 end loop;
 return new_order;
end;
$$;
revoke all on function public.place_store_order(text,text,text,jsonb) from public;
grant execute on function public.place_store_order(text,text,text,jsonb) to anon,authenticated;

-- Restore an unpaid cancelled order only once, never on a paid/refunded order.
alter table public.orders add column stock_released_at timestamptz;
create function public.restore_cancelled_order_stock() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='cancelled' and old.status<>'cancelled' and new.stock_released_at is null
 and not exists(select 1 from public.payments where type='shop' and ref_id=new.id and status in ('paid','refunded')) then
   perform 1 from public.store_products where id in(select product_id from public.order_items where order_id=new.id) order by id for update;
   update public.store_products p set stock=p.stock+i.quantity,updated_at=now()
   from (select product_id,sum(quantity)::integer quantity from public.order_items where order_id=new.id group by product_id) i where p.id=i.product_id;
   new.stock_released_at:=now();
 end if;
 if old.stock_released_at is not null and new.status<>'cancelled' then raise exception 'Este pedido ya liberó el stock. Crea un pedido nuevo.'; end if;
 return new;
end;
$$;
revoke all on function public.restore_cancelled_order_stock() from public,anon,authenticated;
create trigger restore_cancelled_order_stock before update of status on public.orders for each row execute function public.restore_cancelled_order_stock();

-- Capacity is checked under the campus row lock, not just in the UI.
create function public.guard_campus_capacity() returns trigger language plpgsql security definer set search_path='' as $$
declare seats integer; used integer;
begin
 if new.status='cancelled' then return new; end if;
 select capacity into strict seats from public.campuses where id=new.campus_id for update;
 select count(*) into used from public.campus_enrollments where campus_id=new.campus_id and status<>'cancelled' and id<>new.id;
 if seats is not null and used>=seats then raise exception 'No quedan plazas en este campus'; end if;
 return new;
end;
$$;
revoke all on function public.guard_campus_capacity() from public,anon,authenticated;
create trigger campus_capacity_guard before insert or update of campus_id,status on public.campus_enrollments for each row execute function public.guard_campus_capacity();
