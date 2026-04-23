import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

async function crearProducto(formData: FormData) {
  "use server";

  const nombre = String(formData.get("nombre") || "").trim();
  const tipo = String(formData.get("tipo") || "").trim();
  const categoria = String(formData.get("categoria") || "").trim();
  const stock_actual = Number(formData.get("stock_actual") || 0);
  const stock_minimo = Number(formData.get("stock_minimo") || 0);
  const stock_maximo = Number(formData.get("stock_maximo") || 0);
  const unidad = String(formData.get("unidad") || "").trim();
  const estado = String(formData.get("estado") || "normal").trim();

  if (!nombre || !tipo || !categoria) {
    throw new Error("Nombre, tipo y categoría son obligatorios.");
  }

  const { error } = await supabase.from("productos").insert([
    {
      nombre,
      tipo,
      categoria,
      stock_actual,
      stock_minimo,
      stock_maximo,
      unidad,
      estado,
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/inventario");
}

export default function NuevoItemPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1">
          <Topbar
            title="Nuevo ítem"
            subtitle="Crear producto, insumo o subproducto"
          />

          <div className="p-6">
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Formulario de creación
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Completa los campos para agregar un nuevo ítem al inventario.
              </p>

              <form action={crearProducto} className="mt-6 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Nombre
                  </label>
                  <input
                    name="nombre"
                    type="text"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    placeholder="Ej: Queso mantecoso"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Tipo
                    </label>
                    <select
                      name="tipo"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="">Seleccionar</option>
                      <option value="Insumo">Insumo</option>
                      <option value="Subproducto">Subproducto</option>
                      <option value="Producto final">Producto final</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Categoría
                    </label>
                    <input
                      name="categoria"
                      type="text"
                      required
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                      placeholder="Ej: Lácteos"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Stock actual
                    </label>
                    <input
                      name="stock_actual"
                      type="number"
                      step="0.01"
                      defaultValue={0}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Stock mínimo
                    </label>
                    <input
                      name="stock_minimo"
                      type="number"
                      step="0.01"
                      defaultValue={0}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Stock máximo
                    </label>
                    <input
                      name="stock_maximo"
                      type="number"
                      step="0.01"
                      defaultValue={0}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Unidad
                    </label>
                    <input
                      name="unidad"
                      type="text"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                      placeholder="Ej: kg, un, lt"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Estado
                    </label>
                    <select
                      name="estado"
                      defaultValue="normal"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="normal">Normal</option>
                      <option value="critical">Crítico</option>
                      <option value="overstock">Sobre stock</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Guardar ítem
                  </button>

                  <a
                    href="/inventario"
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 text-center"
                  >
                    Volver a inventario
                  </a>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}