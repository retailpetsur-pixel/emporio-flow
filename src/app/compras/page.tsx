import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { supabase } from "@/lib/supabase";

type PurchaseStatus = "pendiente" | "pedido" | "comprado" | "recibido";
type Priority = "Alta" | "Media" | "Baja";

type Producto = {
  id: string;
  nombre: string;
  tipo: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  unidad: string | null;
  estado: string;
};

type PurchaseItem = {
  id: string;
  item: string;
  mode: "Presencial" | "Proveedor";
  supplier: string;
  stock: string;
  suggested: string;
  priority: Priority;
  status: PurchaseStatus;
  category: string;
};

function definirModoCompra(categoria: string): "Presencial" | "Proveedor" {
  const proveedorCats = ["Lácteos", "Panadería", "Bebidas", "Producción"];
  return proveedorCats.includes(categoria) ? "Proveedor" : "Presencial";
}

function definirProveedor(categoria: string): string {
  const map: Record<string, string> = {
    "Lácteos": "Lácteos Sur",
    "Panadería": "Molino Central",
    "Bebidas": "Distribuidora Norte",
    "Producción": "Proveedor interno",
    "Verduras": "Compra local",
    "Carnes": "Carnicería mayorista",
  };

  return map[categoria] ?? "Compra local";
}

function definirPrioridad(
  stockActual: number,
  stockMinimo: number
): Priority {
  if (stockActual <= 0) return "Alta";
  if (stockActual < stockMinimo) return "Alta";
  if (stockActual === stockMinimo) return "Media";
  return "Baja";
}

function sugerirCantidad(producto: Producto): number {
  const objetivo = producto.stock_maximo > 0 ? producto.stock_maximo : producto.stock_minimo;
  const faltante = objetivo - producto.stock_actual;
  return faltante > 0 ? faltante : 0;
}

function formatearCantidad(valor: number, unidad: string | null) {
  return `${valor} ${unidad ?? ""}`.trim();
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

function StatusBadge({ status }: { status: PurchaseStatus }) {
  const labels = {
    pendiente: "Pendiente",
    pedido: "Pedido",
    comprado: "Comprado",
    recibido: "Recibido",
  };

  const styles = {
    pendiente: "bg-red-50 text-red-700 border-red-100",
    pedido: "bg-amber-50 text-amber-700 border-amber-100",
    comprado: "bg-blue-50 text-blue-700 border-blue-100",
    recibido: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const styles = {
    Alta: "bg-red-50 text-red-700 border-red-100",
    Media: "bg-amber-50 text-amber-700 border-amber-100",
    Baja: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}

export default async function ComprasPage() {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("created_at", { ascending: true });

  const productos: Producto[] = data ?? [];

  const sugeridos: PurchaseItem[] = productos
    .filter((producto) => producto.stock_actual <= producto.stock_minimo)
    .map((producto) => {
      const mode = definirModoCompra(producto.categoria);
      const suggestedQty = sugerirCantidad(producto);

      return {
        id: producto.id,
        item: producto.nombre,
        mode,
        supplier: definirProveedor(producto.categoria),
        stock: formatearCantidad(producto.stock_actual, producto.unidad),
        suggested: formatearCantidad(suggestedQty, producto.unidad),
        priority: definirPrioridad(producto.stock_actual, producto.stock_minimo),
        status: "pendiente",
        category: producto.categoria,
      };
    });

  const presencial = sugeridos.filter((item) => item.mode === "Presencial");
  const proveedor = sugeridos.filter((item) => item.mode === "Proveedor");

  const urgentes = sugeridos.filter((item) => item.priority === "Alta").length;
  const pendientes = sugeridos.filter((item) => item.status === "pendiente").length;
  const sobreStock = productos.filter(
    (producto) => producto.stock_maximo > 0 && producto.stock_actual > producto.stock_maximo
  ).length;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1">
          <Topbar
            title="Compras Inteligentes"
            subtitle="Compras sugeridas según stock mínimo y máximo"
          />

          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Ítems sugeridos hoy" value={String(sugeridos.length)} />
              <StatCard title="Compras urgentes" value={String(urgentes)} />
              <StatCard title="Pedidos pendientes" value={String(pendientes)} />
              <StatCard title="Sobre stock detectado" value={String(sobreStock)} />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Gestión de compras
                  </h3>
                  <p className="text-sm text-slate-500">
                    Lista generada automáticamente desde inventario real
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Exportar lista
                  </button>
                  <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    Confirmar compras del día
                  </button>
                </div>
              </div>

              {error ? (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Error al cargar compras: {error.message}
                </div>
              ) : sugeridos.length === 0 ? (
                <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  No hay compras sugeridas por ahora. Todos los productos están sobre su mínimo.
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Salir a comprar
                  </h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {presencial.length} ítems
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {presencial.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No hay compras presenciales sugeridas.
                    </div>
                  ) : (
                    presencial.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.item}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Stock actual: {item.stock} · Sugerido: {item.suggested}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Origen: {item.supplier}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <PriorityBadge priority={item.priority} />
                            <StatusBadge status={item.status} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Pedir a proveedor
                  </h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {proveedor.length} ítems
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {proveedor.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No hay pedidos a proveedor sugeridos.
                    </div>
                  ) : (
                    proveedor.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.item}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Stock actual: {item.stock} · Sugerido: {item.suggested}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Proveedor: {item.supplier}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <PriorityBadge priority={item.priority} />
                            <StatusBadge status={item.status} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Alertas de compras
                </h3>

                <div className="mt-4 space-y-3">
                  {sugeridos.length === 0 ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      No hay alertas activas de compra.
                    </div>
                  ) : (
                    <>
                      {sugeridos.slice(0, 3).map((item) => (
                        <div
                          key={`alert-${item.id}`}
                          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                          {item.item} está en {item.stock} y se sugiere comprar {item.suggested}.
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Resumen automático
                </h3>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Productos bajo mínimo:{" "}
                    <span className="font-semibold">{sugeridos.length}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Compras presenciales:{" "}
                    <span className="font-semibold">{presencial.length}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Pedidos a proveedor:{" "}
                    <span className="font-semibold">{proveedor.length}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Ítems urgentes:{" "}
                    <span className="font-semibold">{urgentes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}