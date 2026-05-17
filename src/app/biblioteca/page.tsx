import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";

type Documento = {
  titulo: string;
  tipo: string;
  area: string;
  estado: "Vigente" | "Borrador" | "Revisar";
  fecha: string;
};

const documentos: Documento[] = [
  {
    titulo: "Manual de apertura de local",
    tipo: "Manual",
    area: "Operaciones",
    estado: "Vigente",
    fecha: "2026-05-01",
  },
  {
    titulo: "Procedimiento de mise en place",
    tipo: "Procedimiento",
    area: "Producción",
    estado: "Vigente",
    fecha: "2026-04-24",
  },
  {
    titulo: "Circular uso correcto de mermas",
    tipo: "Circular",
    area: "Administración",
    estado: "Revisar",
    fecha: "2026-04-18",
  },
  {
    titulo: "Recetario base empanadas",
    tipo: "Recetario",
    area: "Cocina",
    estado: "Borrador",
    fecha: "2026-04-10",
  },
];

const categorias = [
  {
    titulo: "Procedimientos",
    descripcion: "Procesos operativos, pasos de trabajo y estándares internos.",
    total: 18,
  },
  {
    titulo: "Manuales",
    descripcion: "Guías de capacitación, operación y administración.",
    total: 9,
  },
  {
    titulo: "Circulares",
    descripcion: "Comunicados internos y actualizaciones oficiales.",
    total: 6,
  },
  {
    titulo: "Recetarios",
    descripcion: "Recetas documentadas, fichas técnicas y versiones aprobadas.",
    total: 24,
  },
  {
    titulo: "Emplatados",
    descripcion: "Fotos de referencia, presentación final y estándares visuales.",
    total: 12,
  },
  {
    titulo: "Empresa",
    descripcion: "Documentos generales, políticas y material institucional.",
    total: 7,
  },
];

function StatusBadge({ estado }: { estado: Documento["estado"] }) {
  const styles = {
    Vigente: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Borrador: "bg-amber-50 text-amber-700 border-amber-100",
    Revisar: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[estado]}`}
    >
      {estado}
    </span>
  );
}

export default function BibliotecaPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1">
          <Topbar
            title="Biblioteca"
            subtitle="Procedimientos, manuales, circulares, recetarios e imágenes"
          />

          <div className="space-y-6 p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Centro documental
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Toda la documentación interna de Emporio Flow en un solo lugar.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    placeholder="Buscar documento..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 sm:w-72"
                  />
                  <button className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                    Subir documento
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {categorias.map((categoria) => (
                <div
                  key={categoria.titulo}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {categoria.titulo}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {categoria.descripcion}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {categoria.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Documentos recientes
                </h2>

                <div className="mt-5 overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-[760px] w-full text-sm">
                    <thead className="bg-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Documento</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Área</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentos.map((documento) => (
                        <tr
                          key={documento.titulo}
                          className="border-t bg-white hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {documento.titulo}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {documento.tipo}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {documento.area}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {documento.fecha}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <StatusBadge estado={documento.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Emplatados
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Referencias visuales para presentación de productos.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {["Empanadas", "Tortas", "Cafetería", "Eventos"].map(
                      (item) => (
                        <div
                          key={item}
                          className="aspect-square rounded-xl border border-slate-200 bg-slate-100 p-3"
                        >
                          <div className="flex h-full items-end">
                            <p className="text-sm font-semibold text-slate-700">
                              {item}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Próxima conexión
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    En la siguiente etapa este módulo puede guardar archivos reales
                    en Supabase Storage, con permisos por rol y vista previa.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
