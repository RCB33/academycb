-- Remove development-mode authorization and install the production policy set.

create or replace function public.has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(allowed_roles)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['admin']);
$$;

create or replace function public.is_guardian_of(child_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guardians g
    join public.child_guardians cg on cg.guardian_id = g.id
    where g.user_id = auth.uid() and cg.child_id = child_uuid
  );
$$;

create or replace function public.is_coach_of(child_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.children c
    join public.teams t on t.id = c.team_id
    join public.workers w on w.id = t.coach_id
    where c.id = child_uuid and w.user_id = auth.uid()
  );
$$;

revoke all on function public.has_role(text[]) from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_guardian_of(uuid) from public;
revoke all on function public.is_coach_of(uuid) from public;
grant execute on function public.has_role(text[]) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_guardian_of(uuid) to authenticated;
grant execute on function public.is_coach_of(uuid) to authenticated;

-- A user may edit their display name but never self-promote by updating the
-- role column through PostgREST.
revoke update on table public.profiles from authenticated;
grant update (full_name) on table public.profiles to authenticated;

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'guardian')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.try_uuid(input text)
returns uuid
language plpgsql
immutable
as $$
begin
  return input::uuid;
exception when others then
  return null;
end;
$$;
revoke all on function public.try_uuid(text) from public;
grant execute on function public.try_uuid(text) to authenticated;

create or replace function public.rotate_public_share_token(child_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_token uuid;
begin
  if not (public.is_admin() or public.is_guardian_of(child_uuid)) then
    raise exception 'No autorizado';
  end if;
  update public.children
  set public_share_token = gen_random_uuid()
  where id = child_uuid
  returning public_share_token into new_token;
  if new_token is null then raise exception 'Jugador no encontrado'; end if;
  return new_token;
end;
$$;
revoke all on function public.rotate_public_share_token(uuid) from public;
grant execute on function public.rotate_public_share_token(uuid) to authenticated;

-- Remove every legacy policy from application tables. This also removes the
-- policies that used `using (true)` under the development override.
do $$
declare policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'profiles','categories','guardians','children','child_guardians','leads',
        'membership_plans','academy_memberships','campuses','campus_enrollments',
        'payments','expenses','messages','documents','child_documents',
        'tournaments_internal','tournament_teams','settings','academy_settings',
        'child_metrics','coach_notes','training_sessions','achievements',
        'child_achievements','goals','progress_events','calendar_events','workers',
        'teams','media_assets','progress_reports','signatures','notifications',
        'orders','order_items','store_products','broadcast_logs','contact_messages'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','categories','guardians','children','child_guardians','leads',
    'membership_plans','academy_memberships','campuses','campus_enrollments',
    'payments','expenses','messages','documents','child_documents',
    'tournaments_internal','tournament_teams','settings','academy_settings',
    'child_metrics','coach_notes','training_sessions','achievements',
    'child_achievements','goals','progress_events','calendar_events','workers',
    'teams','media_assets','progress_reports','signatures','notifications',
    'orders','order_items','store_products','broadcast_logs','contact_messages'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end $$;

-- Identity and CRM.
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "profiles_admin_insert" on public.profiles for insert to authenticated
with check (public.is_admin());
create policy "profiles_admin_delete" on public.profiles for delete to authenticated
using (public.is_admin());

create policy "categories_public_read" on public.categories for select to anon, authenticated using (true);
create policy "categories_admin_write" on public.categories for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "guardians_admin_all" on public.guardians for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "guardians_own_read" on public.guardians for select to authenticated
using (user_id = auth.uid());
create policy "guardians_own_update" on public.guardians for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "children_admin_all" on public.children for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "children_guardian_read" on public.children for select to authenticated
using (public.is_guardian_of(id));
create policy "children_coach_read" on public.children for select to authenticated
using (public.is_coach_of(id));

create policy "child_guardians_admin_all" on public.child_guardians for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "child_guardians_own_read" on public.child_guardians for select to authenticated
using (exists (select 1 from public.guardians g where g.id = guardian_id and g.user_id = auth.uid()));

create policy "workers_admin_all" on public.workers for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "workers_staff_read" on public.workers for select to authenticated
using (public.has_role(array['staff','coach']));

create policy "teams_admin_all" on public.teams for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "teams_staff_read" on public.teams for select to authenticated
using (public.has_role(array['staff','coach']));
create policy "teams_guardian_read" on public.teams for select to authenticated
using (exists (select 1 from public.children c where c.team_id = teams.id and public.is_guardian_of(c.id)));

-- Player development data.
create policy "metrics_admin_coach_all" on public.child_metrics for all to authenticated
using (public.has_role(array['admin','staff']) or public.is_coach_of(child_id))
with check (public.has_role(array['admin','staff']) or public.is_coach_of(child_id));
create policy "metrics_guardian_read" on public.child_metrics for select to authenticated
using (visible_to_guardian and public.is_guardian_of(child_id));

create policy "notes_admin_coach_all" on public.coach_notes for all to authenticated
using (public.has_role(array['admin','staff']) or public.is_coach_of(child_id))
with check (public.has_role(array['admin','staff']) or public.is_coach_of(child_id));
create policy "notes_guardian_read" on public.coach_notes for select to authenticated
using (visibility = 'guardian_visible' and public.is_guardian_of(child_id));

create policy "sessions_admin_coach_all" on public.training_sessions for all to authenticated
using (public.has_role(array['admin','staff']) or public.is_coach_of(child_id))
with check (public.has_role(array['admin','staff']) or public.is_coach_of(child_id));
create policy "sessions_guardian_read" on public.training_sessions for select to authenticated
using (visible_to_guardian and public.is_guardian_of(child_id));

create policy "achievements_public_read" on public.achievements for select to anon, authenticated using (true);
create policy "achievements_admin_all" on public.achievements for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "child_achievements_admin_coach_all" on public.child_achievements for all to authenticated
using (public.has_role(array['admin','staff']) or public.is_coach_of(child_id))
with check (public.has_role(array['admin','staff']) or public.is_coach_of(child_id));
create policy "child_achievements_guardian_read" on public.child_achievements for select to authenticated
using (public.is_guardian_of(child_id));

create policy "goals_admin_coach_all" on public.goals for all to authenticated
using (public.is_admin() or public.is_coach_of(child_id))
with check (public.is_admin() or public.is_coach_of(child_id));
create policy "goals_guardian_read" on public.goals for select to authenticated
using (public.is_guardian_of(child_id));

create policy "events_admin_coach_all" on public.progress_events for all to authenticated
using (public.is_admin() or public.is_coach_of(child_id))
with check (public.is_admin() or public.is_coach_of(child_id));
create policy "events_guardian_read" on public.progress_events for select to authenticated
using (visibility = 'guardian_visible' and public.is_guardian_of(child_id));

create policy "reports_admin_coach_all" on public.progress_reports for all to authenticated
using (public.is_admin() or public.is_coach_of(child_id))
with check (public.is_admin() or public.is_coach_of(child_id));
create policy "reports_guardian_read" on public.progress_reports for select to authenticated
using (public.is_guardian_of(child_id));

-- Calendar, media and documents.
create policy "calendar_admin_all" on public.calendar_events for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "calendar_staff_read" on public.calendar_events for select to authenticated
using (public.has_role(array['staff','coach']));
create policy "calendar_guardian_read" on public.calendar_events for select to authenticated
using (category_id is null or exists (
  select 1 from public.children c where c.category_id = calendar_events.category_id and public.is_guardian_of(c.id)
));

create policy "media_staff_all" on public.media_assets for all to authenticated
using (public.has_role(array['admin','staff','coach']))
with check (public.has_role(array['admin','staff','coach']));
create policy "media_guardian_read" on public.media_assets for select to authenticated
using (
  (child_id is not null and public.is_guardian_of(child_id))
  or (team_id is not null and exists (select 1 from public.children c where c.team_id = media_assets.team_id and public.is_guardian_of(c.id)))
  or (category_id is not null and exists (select 1 from public.children c where c.category_id = media_assets.category_id and public.is_guardian_of(c.id)))
);

create policy "documents_admin_all" on public.documents for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "documents_guardian_read" on public.documents for select to authenticated
using (visibility = 'guardian_visible' and child_id is not null and public.is_guardian_of(child_id));
create policy "child_documents_admin_all" on public.child_documents for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "child_documents_guardian_read" on public.child_documents for select to authenticated
using (public.is_guardian_of(child_id));

create policy "signatures_admin_read" on public.signatures for select to authenticated using (public.is_admin());
create policy "signatures_guardian_read" on public.signatures for select to authenticated
using (exists (select 1 from public.guardians g where g.id = guardian_id and g.user_id = auth.uid()));
create policy "signatures_guardian_insert" on public.signatures for insert to authenticated
with check (exists (select 1 from public.guardians g where g.id = guardian_id and g.user_id = auth.uid()));

-- Commercial and finance data.
create policy "plans_authenticated_read" on public.membership_plans for select to authenticated using (true);
create policy "plans_admin_all" on public.membership_plans for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "memberships_finance_all" on public.academy_memberships for all to authenticated
using (public.has_role(array['admin','finance'])) with check (public.has_role(array['admin','finance']));
create policy "memberships_guardian_read" on public.academy_memberships for select to authenticated
using (public.is_guardian_of(child_id));
create policy "payments_finance_all" on public.payments for all to authenticated
using (public.has_role(array['admin','finance'])) with check (public.has_role(array['admin','finance']));
create policy "payments_guardian_read" on public.payments for select to authenticated
using (child_id is not null and public.is_guardian_of(child_id));
create policy "expenses_finance_all" on public.expenses for all to authenticated
using (public.has_role(array['admin','finance'])) with check (public.has_role(array['admin','finance']));

create policy "campuses_public_read" on public.campuses for select to anon, authenticated using (status = 'published');
create policy "campuses_admin_all" on public.campuses for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "campus_enrollments_admin_all" on public.campus_enrollments for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "campus_enrollments_guardian_read" on public.campus_enrollments for select to authenticated
using (public.is_guardian_of(child_id));

create policy "tournaments_public_read" on public.tournaments_internal for select to anon, authenticated
using (status in ('open','closed'));
create policy "tournaments_admin_all" on public.tournaments_internal for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "tournament_teams_admin_all" on public.tournament_teams for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "products_public_read" on public.store_products for select to anon, authenticated using (is_active = true);
create policy "products_admin_all" on public.store_products for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "orders_admin_read" on public.orders for select to authenticated using (public.is_admin());
create policy "orders_admin_update" on public.orders for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "order_items_admin_read" on public.order_items for select to authenticated using (public.is_admin());

-- Public acquisition: insert-only, no personal-data reads.
create policy "leads_public_insert" on public.leads for insert to anon, authenticated
with check (status = 'new' and source in ('web_agent','form'));
create policy "leads_admin_all" on public.leads for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "contact_messages_public_insert" on public.contact_messages for insert to anon, authenticated
with check (status = 'new');
create policy "contact_messages_admin_all" on public.contact_messages for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Configuration: only explicitly public rows are readable anonymously. The
-- WhatsApp token row always remains private to admins.
create policy "academy_settings_public_read" on public.academy_settings for select to anon, authenticated
using (is_public = true and key <> 'whatsapp_integration');
create policy "academy_settings_admin_all" on public.academy_settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "legacy_settings_public_read" on public.settings for select to anon, authenticated using (true);
create policy "legacy_settings_admin_all" on public.settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- User notifications.
create policy "notifications_admin_all" on public.notifications for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "notifications_own_read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_own_update" on public.notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "broadcast_logs_admin_all" on public.broadcast_logs for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "broadcast_logs_guardian_read" on public.broadcast_logs for select to authenticated
using (category_name = 'Todos' or exists (
  select 1
  from public.children c
  left join public.categories cat on cat.id = c.category_id
  left join public.teams t on t.id = c.team_id
  where public.is_guardian_of(c.id)
    and (cat.name = broadcast_logs.category_name or t.name = broadcast_logs.category_name)
));

-- Atomic public checkout. Client-supplied prices are ignored; catalogue prices
-- and stock are authoritative.
create or replace function public.place_store_order(
  customer_name_input text,
  customer_email_input text,
  customer_phone_input text,
  items_input jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  item jsonb;
  product_row public.store_products%rowtype;
  requested_quantity integer;
  computed_total numeric := 0;
begin
  if length(trim(customer_name_input)) < 2
     or length(trim(customer_name_input)) > 120
     or position('@' in customer_email_input) < 2
     or length(trim(customer_email_input)) > 200
     or length(trim(customer_phone_input)) < 6
     or length(trim(customer_phone_input)) > 30
     or jsonb_typeof(items_input) <> 'array'
     or jsonb_array_length(items_input) < 1
     or jsonb_array_length(items_input) > 20 then
    raise exception 'Datos de pedido inválidos';
  end if;

  for item in select * from jsonb_array_elements(items_input)
  loop
    requested_quantity := greatest(1, least(20, coalesce((item->>'quantity')::integer, 1)));
    select * into product_row from public.store_products
    where id = (item->>'product_id')::uuid and is_active = true
    for update;
    if not found or product_row.stock < requested_quantity then
      raise exception 'Producto no disponible';
    end if;
    if length(coalesce(item->>'size', '')) > 20
       or (nullif(item->>'size','') is not null and cardinality(product_row.sizes) > 0 and not ((item->>'size') = any(product_row.sizes))) then
      raise exception 'Talla no disponible';
    end if;
    computed_total := computed_total + product_row.price * requested_quantity;
  end loop;

  insert into public.orders (customer_name, customer_email, customer_phone, total_amount, status, payment_method)
  values (trim(customer_name_input), lower(trim(customer_email_input)), trim(customer_phone_input), computed_total, 'pending', 'manual')
  returning id into new_order_id;

  for item in select * from jsonb_array_elements(items_input)
  loop
    requested_quantity := greatest(1, least(20, coalesce((item->>'quantity')::integer, 1)));
    select * into product_row from public.store_products where id = (item->>'product_id')::uuid for update;
    insert into public.order_items (order_id, product_id, product_name, quantity, price, size)
    values (new_order_id, product_row.id, product_row.name, requested_quantity, product_row.price, nullif(item->>'size',''));
    update public.store_products set stock = stock - requested_quantity, updated_at = now() where id = product_row.id;
  end loop;

  return new_order_id;
end;
$$;

revoke all on function public.place_store_order(text,text,text,jsonb) from public;
grant execute on function public.place_store_order(text,text,text,jsonb) to anon, authenticated;

-- Storage: personal documents, downloads, player galleries and signatures stay
-- private. Catalogue media and deliberately uploaded public profile/video media
-- use public buckets because the current UI stores their public URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('gallery', 'gallery', false, 8388608, array['image/jpeg','image/png','image/webp']),
  ('signatures', 'signatures', false, 3145728, array['image/png']),
  ('student-documents', 'student-documents', false, 10485760, array['application/pdf','image/jpeg','image/png']),
  ('product-images', 'product-images', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('profile_images', 'profile_images', true, 8388608, array['image/jpeg','image/png','image/webp']),
  ('videos', 'videos', false, 262144000, array['video/mp4','video/webm','video/quicktime']),
  ('downloads', 'downloads', false, 52428800, array['application/pdf','image/jpeg','image/png','application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'academy_%'
  loop
    execute format('drop policy if exists %I on storage.objects', policy_row.policyname);
  end loop;
end $$;

create policy "academy_product_images_public_read" on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');
create policy "academy_product_images_admin_write" on storage.objects for all to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

create policy "academy_profile_images_public_read" on storage.objects for select to anon, authenticated
using (bucket_id = 'profile_images');
create policy "academy_profile_images_admin_write" on storage.objects for all to authenticated
using (bucket_id = 'profile_images' and public.is_admin())
with check (bucket_id = 'profile_images' and public.is_admin());

create policy "academy_videos_staff_write" on storage.objects for all to authenticated
using (bucket_id = 'videos' and public.has_role(array['admin','staff','coach']))
with check (bucket_id = 'videos' and public.has_role(array['admin','staff','coach']));
create policy "academy_videos_guardian_read" on storage.objects for select to authenticated
using (bucket_id = 'videos' and (
  ((storage.foldername(name))[1] = 'child' and public.is_guardian_of(public.try_uuid((storage.foldername(name))[2])))
  or ((storage.foldername(name))[1] = 'team' and exists (
    select 1 from public.children c
    where c.team_id = public.try_uuid((storage.foldername(name))[2]) and public.is_guardian_of(c.id)
  ))
  or ((storage.foldername(name))[1] = 'category' and exists (
    select 1 from public.children c
    where c.category_id = public.try_uuid((storage.foldername(name))[2]) and public.is_guardian_of(c.id)
  ))
));

create policy "academy_downloads_authenticated_read" on storage.objects for select to authenticated
using (bucket_id = 'downloads');
create policy "academy_downloads_admin_write" on storage.objects for all to authenticated
using (bucket_id = 'downloads' and public.is_admin())
with check (bucket_id = 'downloads' and public.is_admin());

create policy "academy_gallery_staff_all" on storage.objects for all to authenticated
using (bucket_id = 'gallery' and public.has_role(array['admin','staff','coach']))
with check (bucket_id = 'gallery' and public.has_role(array['admin','staff','coach']));
create policy "academy_gallery_guardian_read" on storage.objects for select to authenticated
using (bucket_id = 'gallery' and public.is_guardian_of(public.try_uuid((storage.foldername(name))[1])));

create policy "academy_signatures_guardian_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'signatures' and exists (
  select 1 from public.guardians g
  where g.id = public.try_uuid((storage.foldername(name))[1]) and g.user_id = auth.uid()
));
create policy "academy_signatures_owner_read" on storage.objects for select to authenticated
using (bucket_id = 'signatures' and (
  public.is_admin() or exists (
    select 1 from public.guardians g
    where g.id = public.try_uuid((storage.foldername(name))[1]) and g.user_id = auth.uid()
  )
));

create policy "academy_student_documents_admin_all" on storage.objects for all to authenticated
using (bucket_id = 'student-documents' and public.is_admin())
with check (bucket_id = 'student-documents' and public.is_admin());
create policy "academy_student_documents_guardian_read" on storage.objects for select to authenticated
using (bucket_id = 'student-documents' and public.is_guardian_of(public.try_uuid((storage.foldername(name))[1])));
