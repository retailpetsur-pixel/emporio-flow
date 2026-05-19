import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnvFile() {
  const raw = readFileSync(".env.local", "utf8");

  return Object.fromEntries(
    raw
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
      })
  );
}

const env = { ...readEnvFile(), ...process.env };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const checks = [
  ["perfiles_usuario", "perfiles_usuario", "email,nombre,rol,activo"],
  ["permisos_roles", "permisos_roles", "rol,modulos"],
  ["productos", "productos", "id,nombre,tipo,categoria,stock_actual,stock_minimo,stock_maximo,unidad,estado,created_at"],
  ["produccion", "produccion", "id,fecha,producto,categoria,real,estado,created_at"],
  ["cierre_turno", "cierre_turno", "id,fecha,producto,saldo_vendible,merma,observacion,created_at"],
  ["trabajadores", "trabajadores", "id,nombre_completo,estado,created_at"],
  ["sectores", "sectores", "id,nombre,created_at"],
  ["turnos_personal", "turnos_personal", "id,fecha,hora_inicio,sector_id,trabajador_id,trabajadores(nombre_completo),sectores(nombre)"],
  ["solicitudes_permiso", "solicitudes_permiso", "id,estado,trabajador_id,created_at,trabajadores(nombre_completo)"],
  ["familias_productos", "familias_productos", "id,nombre,descripcion,activo"],
  ["familias_recetas", "familias_recetas", "id,nombre,descripcion,activo"],
  ["tipos_receta", "tipos_receta", "id,nombre,activo"],
  ["insumos_costeo", "insumos_costeo", "id,nombre,familia_id,unidad_uso,costo_unitario_uso,unidad_referencia,cantidad_formato_compra,unidad_formato_compra,precio_referencia,costo_compra,costo_total_formato,factor_conversion_uso,stock_actual,stock_minimo,activo"],
  ["recetas", "recetas", "id,nombre,categoria,tipo_receta_id,familia_receta_id,porciones,merma_porcentaje,tiempo_minutos,precio_venta_actual,costo_total_calculado,costo_unitario_calculado,margen_actual_porcentaje,precio_sugerido,tipo_produccion,unidad_rinde,activo"],
  ["receta_detalle", "receta_detalle", "id,receta_id,tipo_item,insumo_id,subreceta_id,cantidad_uso,unidad_uso"],
  ["produccion_recetas", "produccion_recetas", "id,receta_id,fecha,cantidad_producida,costo_unitario_estimado,costo_total_estimado,observacion,created_at"],
  ["plan_produccion_semanal", "plan_produccion_semanal", "id,semana_inicio,receta_id,producto_nombre,objetivo_semanal,stock_objetivo_diario,observacion"],
  ["stock_operativo_cierre", "stock_operativo_cierre", "id,fecha,receta_id,stock_cierre,observacion"],
  ["produccion_control_diario", "produccion_control_diario", "id,fecha,receta_id,elaborado,merma"],
];

let failures = 0;

for (const [label, table, select] of checks) {
  const { error } = await supabase.from(table).select(select).limit(1);

  if (error) {
    failures += 1;
    console.error(`${label}: ${error.code || "ERROR"} ${error.message}`);
  } else {
    console.log(`${label}: OK`);
  }
}

process.exit(failures ? 1 : 0);
