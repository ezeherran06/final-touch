-- Ejecutá este archivo en Supabase > SQL Editor.
-- Reemplazá el correo de ejemplo por el mismo correo con el que vas a iniciar sesión.

create table if not exists public.final_touch_settings (
  id text primary key check (id = 'main'),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.final_touch_private (
  id text primary key check (id = 'main'),
  data jsonb not null default '{"turns":[],"clients":[]}'::jsonb
);

alter table public.final_touch_settings enable row level security;
alter table public.final_touch_private enable row level security;

grant select on public.final_touch_settings to anon, authenticated;
grant insert, update, delete on public.final_touch_settings to authenticated;
grant select, insert, update, delete on public.final_touch_private to authenticated;
revoke all on public.final_touch_private from anon;

drop policy if exists "Public can read Final Touch settings" on public.final_touch_settings;
create policy "Public can read Final Touch settings"
  on public.final_touch_settings for select to anon, authenticated
  using (true);

drop policy if exists "Owner can manage Final Touch settings" on public.final_touch_settings;
create policy "Owner can manage Final Touch settings"
  on public.final_touch_settings for all to authenticated
  using ((auth.jwt() ->> 'email') = 'REEMPLAZAR_POR_TU_CORREO')
  with check ((auth.jwt() ->> 'email') = 'REEMPLAZAR_POR_TU_CORREO');

drop policy if exists "Owner can manage Final Touch private data" on public.final_touch_private;
create policy "Owner can manage Final Touch private data"
  on public.final_touch_private for all to authenticated
  using ((auth.jwt() ->> 'email') = 'REEMPLAZAR_POR_TU_CORREO')
  with check ((auth.jwt() ->> 'email') = 'REEMPLAZAR_POR_TU_CORREO');
