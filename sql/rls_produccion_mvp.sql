-- Permisos MVP para guardar planificación y cierres desde la app.
-- Ejecutar en Supabase SQL Editor.
-- Más adelante conviene reemplazar estas políticas por permisos por rol.

alter table public.plan_produccion_semanal enable row level security;
alter table public.stock_operativo_cierre enable row level security;
alter table public.produccion_recetas enable row level security;
alter table public.produccion_control_diario enable row level security;

drop policy if exists "mvp_select_plan_produccion_semanal" on public.plan_produccion_semanal;
drop policy if exists "mvp_insert_plan_produccion_semanal" on public.plan_produccion_semanal;
drop policy if exists "mvp_update_plan_produccion_semanal" on public.plan_produccion_semanal;
drop policy if exists "mvp_delete_plan_produccion_semanal" on public.plan_produccion_semanal;

create policy "mvp_select_plan_produccion_semanal"
on public.plan_produccion_semanal for select
to anon, authenticated
using (true);

create policy "mvp_insert_plan_produccion_semanal"
on public.plan_produccion_semanal for insert
to anon, authenticated
with check (true);

create policy "mvp_update_plan_produccion_semanal"
on public.plan_produccion_semanal for update
to anon, authenticated
using (true)
with check (true);

create policy "mvp_delete_plan_produccion_semanal"
on public.plan_produccion_semanal for delete
to anon, authenticated
using (true);

drop policy if exists "mvp_select_stock_operativo_cierre" on public.stock_operativo_cierre;
drop policy if exists "mvp_insert_stock_operativo_cierre" on public.stock_operativo_cierre;
drop policy if exists "mvp_update_stock_operativo_cierre" on public.stock_operativo_cierre;
drop policy if exists "mvp_delete_stock_operativo_cierre" on public.stock_operativo_cierre;

create policy "mvp_select_stock_operativo_cierre"
on public.stock_operativo_cierre for select
to anon, authenticated
using (true);

create policy "mvp_insert_stock_operativo_cierre"
on public.stock_operativo_cierre for insert
to anon, authenticated
with check (true);

create policy "mvp_update_stock_operativo_cierre"
on public.stock_operativo_cierre for update
to anon, authenticated
using (true)
with check (true);

create policy "mvp_delete_stock_operativo_cierre"
on public.stock_operativo_cierre for delete
to anon, authenticated
using (true);

drop policy if exists "mvp_select_produccion_recetas" on public.produccion_recetas;
drop policy if exists "mvp_insert_produccion_recetas" on public.produccion_recetas;
drop policy if exists "mvp_update_produccion_recetas" on public.produccion_recetas;
drop policy if exists "mvp_delete_produccion_recetas" on public.produccion_recetas;

create policy "mvp_select_produccion_recetas"
on public.produccion_recetas for select
to anon, authenticated
using (true);

create policy "mvp_insert_produccion_recetas"
on public.produccion_recetas for insert
to anon, authenticated
with check (true);

create policy "mvp_update_produccion_recetas"
on public.produccion_recetas for update
to anon, authenticated
using (true)
with check (true);

create policy "mvp_delete_produccion_recetas"
on public.produccion_recetas for delete
to anon, authenticated
using (true);

drop policy if exists "mvp_select_produccion_control_diario" on public.produccion_control_diario;
drop policy if exists "mvp_insert_produccion_control_diario" on public.produccion_control_diario;
drop policy if exists "mvp_update_produccion_control_diario" on public.produccion_control_diario;
drop policy if exists "mvp_delete_produccion_control_diario" on public.produccion_control_diario;

create policy "mvp_select_produccion_control_diario"
on public.produccion_control_diario for select
to anon, authenticated
using (true);

create policy "mvp_insert_produccion_control_diario"
on public.produccion_control_diario for insert
to anon, authenticated
with check (true);

create policy "mvp_update_produccion_control_diario"
on public.produccion_control_diario for update
to anon, authenticated
using (true)
with check (true);

create policy "mvp_delete_produccion_control_diario"
on public.produccion_control_diario for delete
to anon, authenticated
using (true);
