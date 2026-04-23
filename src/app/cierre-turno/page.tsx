import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { supabase } from "@/lib/supabase";

type CierreItem = {
  id: string;
  turno: string;
  producto: string;
  saldo_vendible: number;
  merma: number;
  observacion: string | null;
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

export default async function CierreTurnoPage() {
  const hoy = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("cierre_turno")
    .select("*")
    .eq("fecha", hoy)
    .order("created_at", { ascending: true });

  const items: CierreItem[] = data ?? [];

  const totalProductos = items.length;
  const totalSaldo = items.reduce(
    (sum, item) => sum + Number(item.saldo_vendible),
    0
  );
  const totalMerma = items.reduce((sum, item) => sum + Number(item.merma), 0);
  const conObservacion = items.filter((item) => item.observacion).length;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1">
          <Topbar
            title="Cierre de turno"
            subtitle="Registro real de saldo vendible y merma"
          />

          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Productos registrados" value={String(totalProductos)} />
              <StatCard title="Saldo informado" value={String(totalSaldo)} />
              <StatCard title="Merma real" value={String(totalMerma)} />
              <StatCard title="Con observación" value={String(conObservacion)} />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Cierre registrado
                  </h3>
                  <p className="text-sm text-slate-500">
                    Datos cargados desde Supabase para la fecha {hoy}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Nuevo cierre
                  </button>
                  <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    Exportar resumen
                  </button>
                </div>
              </div>

              {error ? (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Error al cargar cierre de turno: {error.message}
                </div>
              ) : items.length === 0 ? (
                <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                  No hay registros de cierre para hoy.
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-sm text-slate-500">
                        <th className="px-4 py-2">Turno</th>
                        <th className="px-4 py-2">Producto</th>
                        <th className="px-4 py-2">Saldo vendible</th>
                        <th className="px-4 py-2">Merma</th>
                        <th className="px-4 py-2">Observación</th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="bg-slate-50 text-sm text-slate-700"
                        >
                          <td className="rounded-l-2xl px-4 py-4 font-medium text-slate-900">
                            {item.turno}
                          </td>
                          <td className="px-4 py-4">{item.producto}</td>
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {item.saldo_vendible}
                          </td>
                          <td className="px-4 py-4">{item.merma}</td>
                          <td className="rounded-r-2xl px-4 py-4">
                            {item.observacion ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Observaciones del turno
                </h3>

                <div className="mt-4 space-y-3">
                  {items.filter((item) => item.observacion).length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No hay observaciones registradas hoy.
                    </div>
                  ) : (
                    items
                      .filter((item) => item.observacion)
                      .map((item) => (
                        <div
                          key={`obs-${item.id}`}
                          className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700"
                        >
                          {item.producto}: {item.observacion}
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Resumen rápido
                </h3>

                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <div
                      key={`quick-${item.id}`}
                      className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      {item.producto} — saldo{" "}
                      <span className="font-semibold">{item.saldo_vendible}</span>
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