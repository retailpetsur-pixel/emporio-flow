import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";

export default function RecetasCostosPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="flex-1">
          <Topbar title="Recetas y costos" subtitle="Fichas técnicas y costeo automático" />
          <div className="p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Módulo en construcción</h3>
              <p className="mt-2 text-slate-600">
                Aquí irán recetas, subproductos, rendimiento, costo unitario y margen estimado.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}