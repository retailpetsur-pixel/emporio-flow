-- Permite planificar productos aunque todavía no tengan receta creada.
-- Ejecutar una sola vez en Supabase SQL Editor antes de usar "producto nuevo"
-- en la planificación semanal.

alter table public.plan_produccion_semanal
  add column if not exists producto_nombre text;

alter table public.plan_produccion_semanal
  alter column receta_id drop not null;
