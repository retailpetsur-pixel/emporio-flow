-- Configuracion global del sistema para apariencia y preferencias compartidas.
-- Ejecutar una vez en Supabase SQL Editor.

create table if not exists configuracion_sistema (
  clave text primary key,
  valor jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table configuracion_sistema enable row level security;

drop policy if exists "configuracion_sistema_select_authenticated"
on configuracion_sistema;

create policy "configuracion_sistema_select_authenticated"
on configuracion_sistema
for select
to authenticated
using (true);

insert into configuracion_sistema (clave, valor)
values (
  'apariencia',
  '{
    "dashboardOrder": [],
    "cardSize": "normal",
    "iconSize": "normal",
    "textDensity": "normal",
    "cardAspect": "auto"
  }'::jsonb
)
on conflict (clave) do nothing;
