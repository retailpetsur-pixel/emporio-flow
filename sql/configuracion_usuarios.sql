-- Configuracion base para usuarios, perfiles y permisos de Emporio Flow.
-- Ejecutar en Supabase SQL Editor antes de publicar.

create table if not exists perfiles_usuario (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nombre text not null default 'Usuario',
  rol text not null default 'trabajador',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table perfiles_usuario
  add column if not exists email text;

alter table perfiles_usuario
  add column if not exists nombre text default 'Usuario';

alter table perfiles_usuario
  add column if not exists rol text default 'trabajador';

alter table perfiles_usuario
  add column if not exists activo boolean default true;

alter table perfiles_usuario
  add column if not exists created_at timestamptz default now();

alter table perfiles_usuario
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'perfiles_usuario_email_key'
  ) then
    alter table perfiles_usuario
      add constraint perfiles_usuario_email_key unique (email);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'perfiles_usuario_rol_check'
  ) then
    alter table perfiles_usuario
      add constraint perfiles_usuario_rol_check
      check (rol in ('admin', 'gerencia', 'supervisor', 'trabajador', 'compras'));
  end if;
end $$;

alter table perfiles_usuario enable row level security;

drop policy if exists "perfiles_usuario_select_authenticated" on perfiles_usuario;
drop policy if exists "perfiles_usuario_insert_authenticated" on perfiles_usuario;
drop policy if exists "perfiles_usuario_update_authenticated" on perfiles_usuario;
drop function if exists usuario_puede_configurar_perfiles();

create or replace function usuario_puede_configurar_perfiles()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from perfiles_usuario
    where lower(email) = lower(auth.jwt() ->> 'email')
      and activo = true
      and rol in ('admin', 'gerencia')
  );
$$;

create policy "perfiles_usuario_select_authenticated"
on perfiles_usuario
for select
to authenticated
using (
  lower(email) = lower(auth.jwt() ->> 'email')
  or usuario_puede_configurar_perfiles()
);

create policy "perfiles_usuario_insert_authenticated"
on perfiles_usuario
for insert
to authenticated
with check (usuario_puede_configurar_perfiles());

create policy "perfiles_usuario_update_authenticated"
on perfiles_usuario
for update
to authenticated
using (usuario_puede_configurar_perfiles())
with check (usuario_puede_configurar_perfiles());

-- Crea o asegura tu primer administrador.
-- Cambia el correo por el que usas para entrar a Emporio Flow.
insert into perfiles_usuario (email, nombre, rol, activo)
values ('admin@emporio.cl', 'Administrador', 'admin', true)
on conflict (email) do update
set nombre = excluded.nombre,
    rol = excluded.rol,
    activo = excluded.activo;
