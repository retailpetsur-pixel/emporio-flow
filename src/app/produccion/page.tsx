import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { supabase } from "@/lib/supabase";

type ProductionStatus = "Pendiente" | "En proceso" | "Listo" | "Ajustado";

type ProduccionItem = {
  id: string;
  categoria: string;
  producto: string;
  sugerido: number;
  real: number;
  estado: ProductionStatus;
  nota: string | null;
  fecha: string;
};

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

function StatusBadge({ status }: { status: ProductionStatus }) {
  const styles = {
    Pendiente: "bg-slate-100 text-slate-700 border-slate-200",
    "En proceso": "bg-amber-50 text-amber-700 border-amber-100",
    Listo: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Ajustado: "bg-blue-50 text-blue-700 border-blue-100",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default async function ProduccionPage() {
  const hoy = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("produccion")
    .select("*")
    .eq("fecha", hoy)
    .order("created_at", { ascending: true });

  const items: ProduccionItem[] = data ?? [];

  const grouped = items.reduce<Record<string, ProduccionItem[]>>((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria].push(item);
    return acc;
  }, {});

  const totalProductos = items.length;
  const totalObjetivo = items.reduce((sum, item) => sum + Number(item.sugerido), 0);
  const ajustes = items.filter((item) => item.estado === "Ajustado").length;
  const pendientes = items.filter((item) => item.estado === "Pendiente").length;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1">
          <Topbar
            title="Producción del Día"
            subtitle="Lista real cargada desde Supabase"
          />

          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Productos planificados" value={String(totalProductos)} />
              <StatCard title="Total unidades objetivo" value={String(totalObjetivo)} />
              <StatCard title="Ajustes realizados" value={String(ajustes)} />
              <StatCard title="Pendientes" value={String(pendientes)} />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Plan de producción
                  </h3>
                  <p className="text-sm text-slate-500">
                    Producción real del día {hoy}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Ajustar producción
                  </button>
                  <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Imprimir lista
                  </button>
                  <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    Finalizar producción
                  </button>
                </div>
              </div>

              {error ? (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Error al cargar producción: {error.message}
                </div>
              ) : items.length === 0 ? (
                <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                  No hay producción cargada para hoy.
                </div>
              ) : null}
            </div>

            <div className="mt-6 space-y-6">
              {Object.entries(grouped).map(([categoria, lista]) => (
                <div
                  key={categoria}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {categoria}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {lista.length} ítems
                    </span>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-left text-sm text-slate-500">
                          <th className="px-4 py-2">Producto</th>
                          <th className="px-4 py-2">Sugerido</th>
                          <th className="px-4 py-2">Real</th>
                          <th className="px-4 py-2">Estado</th>
                          <th className="px-4 py-2">Observación</th>
                        </tr>
                      </thead>

                      <tbody>
                        {lista.map((item) => (
                          <tr
                            key={item.id}
                            className="bg-slate-50 text-sm text-slate-700"
                          >
                            <td className="rounded-l-2xl px-4 py-4 font-medium text-slate-900">
                              {item.producto}
                            </td>
                            <td className="px-4 py-4">{item.sugerido}</td>
                            <td className="px-4 py-4 font-semibold text-slate-900">
                              {item.real}
                            </td>
                            <td className="px-4 py-4">
                              <StatusBadge status={item.estado} />
                            </td>
                            <td className="rounded-r-2xl px-4 py-4">
                              {item.nota ?? "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Ajustes operativos
                </h3>

                <div className="mt-4 space-y-3">
                  {items.filter((item) => item.estado === "Ajustado").length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No hay ajustes registrados hoy.
                    </div>
                  ) : (
                    items
                      .filter((item) => item.estado === "Ajustado")
                      .map((item) => (
                        <div
                          key={`ajuste-${item.id}`}
                          className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700"
                        >
                          {item.producto}: {item.nota ?? "Ajuste registrado"}
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Vista rápida del equipo
                </h3>

                <div className="mt-4 space-y-3">
                  {items.slice(0, 6).map((item) => (
                    <div
                      key={`quick-${item.id}`}
                      className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      {item.producto} —{" "}
                      <span className="font-semibold">{item.real}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}