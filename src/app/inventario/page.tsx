import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

type InventoryStatus = "normal" | "critical" | "overstock";

type Producto = {
  id: string;
  nombre: string;
  tipo: "Insumo" | "Subproducto" | "Producto final";
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  unidad: string | null;
  estado: InventoryStatus;
};

type InsumoCosteo = {
  id: string;
  nombre: string;
  unidad_uso: string | null;
  unidad_referencia: string | null;
  unidad_formato_compra: string | null;
  cantidad_formato_compra: number | null;
  precio_referencia: number | null;
  costo_unitario_uso: number | null;
  stock_actual: number | null;
  stock_minimo: number | null;
};

function money(v: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function normalizarUnidad(unidad: string) {
  const u = unidad.trim().toLowerCase();

  if (["gr", "grs", "g", "gramo", "gramos"].includes(u)) return "grs";
  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(u)) return "kg";
  if (["ml", "mililitro", "mililitros"].includes(u)) return "ml";
  if (["lt", "lts", "litro", "litros"].includes(u)) return "litros";
  if (["un", "unidad", "unidades", "u"].includes(u)) return "un";

  return u;
}

function factorConversion(unidadStock: string, unidadUso: string) {
  const stock = normalizarUnidad(unidadStock);
  const uso = normalizarUnidad(unidadUso);

  if (stock === "kg" && uso === "grs") return 1000;
  if (stock === "litros" && uso === "ml") return 1000;
  if (stock === uso) return 1;

  return 1;
}

function valorInsumo(item: InsumoCosteo) {
  const stock = Number(item.stock_actual ?? 0);
  const costoUso = Number(item.costo_unitario_uso ?? 0);
  const unidadStock =
    item.unidad_referencia ?? item.unidad_formato_compra ?? item.unidad_uso ?? "";
  const unidadUso = item.unidad_uso ?? unidadStock;
  const factor = factorConversion(unidadStock, unidadUso);

  return stock * factor * costoUso;
}

function estadoInsumo(item: InsumoCosteo): InventoryStatus {
  const stock = Number(item.stock_actual ?? 0);
  const minimo = Number(item.stock_minimo ?? 0);

  if (minimo > 0 && stock <= minimo) return "critical";
  return "normal";
}

async function ajustarStock(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const accion = String(formData.get("accion"));
  const actual = Number(formData.get("actual"));

  const nuevoStock = accion === "sumar" ? actual + 1 : Math.max(actual - 1, 0);

  const { error } = await supabase
    .from("productos")
    .update({ stock_actual: nuevoStock })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inventario");
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: InventoryStatus }) {
  const styles = {
    normal: "bg-emerald-50 text-emerald-700 border-emerald-100",
    critical: "bg-red-50 text-red-700 border-red-100",
    overstock: "bg-amber-50 text-amber-700 border-amber-100",
  };

  const labels = {
    normal: "Normal",
    critical: "Crítico",
    overstock: "Sobre stock",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default async function InventarioPage() {
  const [{ data, error }, { data: insumosData, error: insumosError }] =
    await Promise.all([
      supabase
        .from("productos")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("insumos_costeo")
        .select(
          "id,nombre,unidad_uso,unidad_referencia,unidad_formato_compra,cantidad_formato_compra,precio_referencia,costo_unitario_uso,stock_actual,stock_minimo"
        )
        .eq("activo", true)
        .order("nombre", { ascending: true }),
    ]);

  const productos: Producto[] = data ?? [];
  const insumos: InsumoCosteo[] = insumosData ?? [];

  const totalItems = productos.length;
  const criticalItems = productos.filter((p) => p.estado === "critical").length;
  const overstockItems = productos.filter((p) => p.estado === "overstock").length;
  const normalItems = productos.filter((p) => p.estado === "normal").length;
  const valorTotalInsumos = insumos.reduce(
    (total, item) => total + valorInsumo(item),
    0
  );
  const insumosCriticos = insumos.filter(
    (item) => estadoInsumo(item) === "critical"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1">
          <Topbar
            title="Inventario Inteligente"
            subtitle="Control de insumos, subproductos y stock crítico"
          />

          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Ítems activos" value={String(totalItems)} />
              <StatCard title="Críticos" value={String(criticalItems)} />
              <StatCard title="Sobre stock" value={String(overstockItems)} />
              <StatCard title="Normales" value={String(normalItems)} />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Inventario valorizado de insumos
                  </h3>
                  <p className="text-sm text-slate-500">
                    Stock físico convertido a valor usando el costo por unidad de receta.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-500">Insumos activos</p>
                    <p className="text-lg font-bold text-slate-900">
                      {insumos.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 px-4 py-3">
                    <p className="text-xs text-red-700">Bajo mínimo</p>
                    <p className="text-lg font-bold text-red-700">
                      {insumosCriticos}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-4 py-3">
                    <p className="text-xs text-emerald-700">Valor total</p>
                    <p className="text-lg font-bold text-emerald-800">
                      {money(valorTotalInsumos)}
                    </p>
                  </div>
                </div>
              </div>

              {insumosError ? (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Error al cargar insumos valorizados: {insumosError.message}
                </div>
              ) : (
                <div className="mt-6 overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Insumo</th>
                        <th className="px-4 py-3 text-right">Stock físico</th>
                        <th className="px-4 py-3 text-right">Mínimo</th>
                        <th className="px-4 py-3 text-right">Costo receta</th>
                        <th className="px-4 py-3 text-right">Valor stock</th>
                        <th className="px-4 py-3 text-right">Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {insumos.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 text-slate-500">
                            Aún no hay insumos registrados para valorizar.
                          </td>
                        </tr>
                      ) : (
                        insumos.map((item) => {
                          const unidadStock =
                            item.unidad_referencia ??
                            item.unidad_formato_compra ??
                            item.unidad_uso ??
                            "";
                          const stock = Number(item.stock_actual ?? 0);
                          const minimo = Number(item.stock_minimo ?? 0);

                          return (
                            <tr key={item.id} className="border-t bg-white hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {item.nombre}
                                <p className="text-xs font-normal text-slate-500">
                                  Formato: {item.cantidad_formato_compra ?? 1}{" "}
                                  {item.unidad_formato_compra ?? unidadStock} ·{" "}
                                  {money(Number(item.precio_referencia ?? 0))}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                {stock.toLocaleString("es-CL")} {unidadStock}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {minimo.toLocaleString("es-CL")} {unidadStock}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {money(Number(item.costo_unitario_uso ?? 0))} /{" "}
                                {item.unidad_uso ?? unidadStock}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">
                                {money(valorInsumo(item))}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <StatusBadge status={estadoInsumo(item)} />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Inventario actual
                  </h3>
                  <p className="text-sm text-slate-500">
                    Vista general del stock y estado operativo
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href="/nuevo-item"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 text-center"
                  >
                    + Nuevo ítem
                  </a>
                  <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    Generar compra sugerida
                  </button>
                </div>
              </div>

              {error ? (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Error al cargar inventario: {error.message}
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-sm text-slate-500">
                        <th className="px-4 py-2">Nombre</th>
                        <th className="px-4 py-2">Tipo</th>
                        <th className="px-4 py-2">Categoría</th>
                        <th className="px-4 py-2">Stock actual</th>
                        <th className="px-4 py-2">Mínimo</th>
                        <th className="px-4 py-2">Máximo</th>
                        <th className="px-4 py-2">Unidad</th>
                        <th className="px-4 py-2">Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {productos.map((item) => (
                        <tr
                          key={item.id}
                          className="bg-slate-50 text-sm text-slate-700"
                        >
                          <td className="rounded-l-2xl px-4 py-4 font-medium text-slate-900">
                            {item.nombre}
                          </td>
                          <td className="px-4 py-4">{item.tipo}</td>
                          <td className="px-4 py-4">{item.categoria}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <form action={ajustarStock}>
                                <input type="hidden" name="id" value={item.id} />
                                <input
                                  type="hidden"
                                  name="actual"
                                  value={item.stock_actual}
                                />
                                <input
                                  type="hidden"
                                  name="accion"
                                  value="restar"
                                />
                                <button
                                  type="submit"
                                  className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-sm font-bold hover:bg-slate-100"
                                >
                                  -
                                </button>
                              </form>

                              <span className="min-w-[40px] text-center font-semibold text-slate-900">
                                {item.stock_actual}
                              </span>

                              <form action={ajustarStock}>
                                <input type="hidden" name="id" value={item.id} />
                                <input
                                  type="hidden"
                                  name="actual"
                                  value={item.stock_actual}
                                />
                                <input
                                  type="hidden"
                                  name="accion"
                                  value="sumar"
                                />
                                <button
                                  type="submit"
                                  className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-sm font-bold hover:bg-slate-100"
                                >
                                  +
                                </button>
                              </form>
                            </div>
                          </td>
                          <td className="px-4 py-4">{item.stock_minimo}</td>
                          <td className="px-4 py-4">{item.stock_maximo}</td>
                          <td className="px-4 py-4">{item.unidad ?? "-"}</td>
                          <td className="rounded-r-2xl px-4 py-4">
                            <StatusBadge status={item.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
