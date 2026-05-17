-- Permisos configurables por perfil para Emporio Flow.
-- Ejecutar una vez en Supabase SQL Editor.

create table if not exists permisos_roles (
  rol text primary key,
  modulos text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint permisos_roles_rol_check
    check (rol in ('admin', 'gerencia', 'supervisor', 'trabajador', 'compras'))
);

alter table permisos_roles enable row level security;

drop policy if exists "permisos_roles_select_authenticated" on permisos_roles;

create policy "permisos_roles_select_authenticated"
on permisos_roles
for select
to authenticated
using (true);

insert into permisos_roles (rol, modulos)
values
  (
    'admin',
    array[
      '/dashboard',
      '/inventario',
      '/compras',
      '/produccion',
      '/cierre-turno',
      '/usuarios',
      '/recetas-costos',
      '/biblioteca',
      '/reportes',
      '/configuracion'
    ]
  ),
  (
    'gerencia',
    array[
      '/dashboard',
      '/inventario',
      '/compras',
      '/produccion',
      '/cierre-turno',
      '/usuarios',
      '/recetas-costos',
      '/biblioteca',
      '/reportes',
      '/configuracion'
    ]
  ),
  (
    'supervisor',
    array[
      '/dashboard',
      '/inventario',
      '/compras',
      '/produccion',
      '/cierre-turno',
      '/usuarios',
      '/recetas-costos',
      '/biblioteca'
    ]
  ),
  (
    'compras',
    array[
      '/dashboard',
      '/inventario',
      '/compras',
      '/produccion'
    ]
  ),
  (
    'trabajador',
    array[
      '/dashboard',
      '/produccion',
      '/usuarios',
      '/biblioteca'
    ]
  )
on conflict (rol) do nothing;
