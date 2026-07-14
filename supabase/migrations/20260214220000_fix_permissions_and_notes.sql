-- 1. Role-backed admin check. Never bypass authorization in migrations.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 2. Add Missing Policies for Plans
alter table membership_plans enable row level security;
drop policy if exists "Admin full plans" on membership_plans;
create policy "Public read plans" on membership_plans for select using (true);
create policy "Admin full plans" on membership_plans for all using (public.is_admin()) with check (public.is_admin());

-- 3. Add Missing Policies for Payments
alter table payments enable row level security;
drop policy if exists "Admin full payments" on payments;
create policy "Admin full payments" on payments for all using (public.is_admin()) with check (public.is_admin());

-- 4. Add Missing Policies for Documents
alter table documents enable row level security;
drop policy if exists "Admin full documents" on documents;
create policy "Admin full documents" on documents for all using (public.is_admin()) with check (public.is_admin());

-- 5. Add Missing Policies for Achievements
alter table achievements enable row level security;
drop policy if exists "Admin full achievements" on achievements;
create policy "Public read achievements" on achievements for select using (true);
create policy "Admin full achievements" on achievements for all using (public.is_admin()) with check (public.is_admin());

alter table child_achievements enable row level security;
drop policy if exists "Admin full child_achievements" on child_achievements;
create policy "Admin full child_achievements" on child_achievements for all using (public.is_admin()) with check (public.is_admin());

-- 6. Add Missing Policies for Coach Notes
alter table coach_notes enable row level security;
drop policy if exists "Admin full notes" on coach_notes;
create policy "Admin full notes" on coach_notes for all using (public.is_admin()) with check (public.is_admin());

-- 7. Ensure Child Documents (my custom table) has policy
alter table child_documents enable row level security;
drop policy if exists "Admin full child_documents" on child_documents;
create policy "Admin full child_documents" on child_documents for all using (public.is_admin()) with check (public.is_admin());

-- 8. Fix Child Guardians Insert
alter table child_guardians enable row level security;
drop policy if exists "Admin full child_guardians" on child_guardians;
create policy "Admin full child_guardians" on child_guardians for all using (public.is_admin()) with check (public.is_admin());

-- 9. Fix Leads
alter table leads enable row level security;
drop policy if exists "Admin full leads" on leads;
create policy "Admin full leads" on leads for all using (public.is_admin()) with check (public.is_admin());
