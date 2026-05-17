-- Campos necesarios para el cuaderno semanal editable.
-- Ejecutar en Supabase SQL Editor si las columnas venta/vendible no existen.

alter table public.produccion_control_diario
add column if not exists venta numeric default 0;

alter table public.produccion_control_diario
add column if not exists vendible numeric default 0;
