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
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("created_at", { ascending: true });

  const productos: Producto[] = data ?? [];

  const totalItems = productos.length;
  const criticalItems = productos.filter((p) => p.estado === "critical").length;
  const overstockItems = productos.filter((p) => p.estado === "overstock").length;
  const normalItems = productos.filter((p) => p.estado === "normal").length;

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