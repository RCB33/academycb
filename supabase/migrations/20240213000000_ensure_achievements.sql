-- Ensure achievements table exists
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text null,
  icon text null,
  created_at timestamptz default now()
);

alter table achievements enable row level security;

-- Ensure child_achievements table exists
create table if not exists public.child_achievements (
  child_id uuid references children(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete cascade,
  earned_at date not null default current_date,
  note text null,
  primary key (child_id, achievement_id)
);

alter table child_achievements enable row level security;

-- Policies
do $$ 
begin
    if not exists (select 1 from pg_policies where policyname = 'Admin full achievements' and tablename = 'achievements') then
        create policy "Admin full achievements" on achievements for all using (
            exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
        );
    end if;

    if not exists (select 1 from pg_policies where policyname = 'Public read achievements' and tablename = 'achievements') then
        create policy "Public read achievements" on achievements for select using (true);
    end if;

    if not exists (select 1 from pg_policies where policyname = 'Admin full child_achievements' and tablename = 'child_achievements') then
        create policy "Admin full child_achievements" on child_achievements for all using (
             exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
        );
    end if;

    if not exists (select 1 from pg_policies where policyname = 'Guardian read child_achievements' and tablename = 'child_achievements') then
        create policy "Guardian read child_achievements" on child_achievements for select using (
            exists (
                select 1 from public.guardians g
                join public.child_guardians cg on cg.guardian_id = g.id
                where g.user_id = auth.uid()
                and cg.child_id = child_achievements.child_id
            )
        );
    end if;
end $$;

-- Seed data
insert into achievements (name, description, icon) values 
('MVP del Mes', 'Mejor jugador del mes', 'trophy'),
('Asistencia Perfecta', 'No ha faltado a ningún entreno', 'calendar-check'),
('Goleador', 'Ha marcado 5 goles', 'goal'),
('Muro Defensivo', 'Defensa impasable', 'shield'),
('Espíritu de Equipo', 'Compañerismo ejemplar', 'heart'),
('Francotirador', 'Precisión en tiros libres', 'crosshair'),
('Hattrick', 'Tres goles en un partido', 'flame')
on conflict (name) do nothing;
