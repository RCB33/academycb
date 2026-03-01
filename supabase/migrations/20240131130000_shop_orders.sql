-- Create ORDERS table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text null,
  total_amount numeric not null,
  status text check (status in ('pending', 'paid', 'shipped', 'completed', 'cancelled')) default 'pending',
  payment_method text default 'manual',
  created_at timestamptz default now()
);

-- Enable RLS for orders
alter table public.orders enable row level security;

-- Allow insert by anyone (public shop)
create policy "Allow public insert of orders" on orders for insert with check (true);

-- Allow read only by admins
create policy "Allow admin read orders" on orders for select using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- Allow update only by admins
create policy "Allow admin update orders" on orders for update using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);


-- Create ORDER_ITEMS table
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_name text not null,
  quantity int not null,
  price numeric not null,
  created_at timestamptz default now()
);

-- Enable RLS for order_items
alter table public.order_items enable row level security;

-- Allow insert by anyone (public shop)
create policy "Allow public insert of order_items" on order_items for insert with check (true);

-- Allow read only by admins
create policy "Allow admin read order_items" on order_items for select using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);
