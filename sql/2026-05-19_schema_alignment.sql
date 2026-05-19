-- Schema alignment for Emporio Flow application code.
-- Apply in Supabase SQL Editor when enabling the optional purchase history
-- and full weekly production notebook fields.

alter table public.produccion_control_diario
  add column if not exists venta numeric default 0;

alter table public.produccion_control_diario
  add column if not exists vendible numeric default 0;

create table if not exists public.compras_insumos (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references public.insumos_costeo(id) on delete restrict,
  proveedor text,
  cantidad_formatos numeric not null default 0,
  cantidad_por_formato numeric not null default 0,
  unidad_formato text not null,
  cantidad_total numeric not null default 0,
  precio_total numeric not null default 0,
  costo_unitario_compra numeric not null default 0,
  costo_promedio_anterior numeric not null default 0,
  costo_promedio_nuevo numeric not null default 0,
  observacion text,
  created_at timestamptz not null default now()
);

alter table public.compras_insumos enable row level security;

drop policy if exists "compras_insumos_select_authenticated" on public.compras_insumos;
drop policy if exists "compras_insumos_insert_authenticated" on public.compras_insumos;

create policy "compras_insumos_select_authenticated"
on public.compras_insumos for select
to authenticated
using (true);

create policy "compras_insumos_insert_authenticated"
on public.compras_insumos for insert
to authenticated
with check (true);
