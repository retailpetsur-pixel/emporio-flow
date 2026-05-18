import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

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

async function guardarProducto(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
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

  const payload = {
      nombre,
      tipo,
      categoria,
      stock_actual,
      stock_minimo,
      stock_maximo,
      unidad,
      estado,
    };

  const { error } = id
    ? await supabase.from("productos").update(payload).eq("id", id)
    : await supabase.from("productos").insert([payload]);

  if (error) {
    throw new Error(error.message);
  }

  redirect(
    `/inventario?estado=ok&mensaje=${encodeURIComponent(
      id ? `${nombre} actualizado.` : `${nombre} creado en inventario.`
    )}`
  );
}

export default async function NuevoItemPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const id = params?.id;

  const { data: producto } = id
    ? await supabase
        .from("productos")
        .select("id,nombre,tipo,categoria,stock_actual,stock_minimo,stock_maximo,unidad,estado")
        .eq("id", id)
        .maybeSingle()
    : { data: null };

  const item = producto as Producto | null;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1">
          <Topbar
            title={item ? "Detalle de ítem" : "Nuevo ítem"}
            subtitle={
              item
                ? "Revisar y modificar datos de inventario"
                : "Crear producto, insumo o subproducto"
            }
          />

          <div className="p-6">
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                {item ? "Editar ítem de inventario" : "Formulario de creación"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {item
                  ? "Ajusta nombre, categoría, mínimos, máximos o stock físico."
                  : "Completa los campos para agregar un nuevo ítem al inventario."}
              </p>

              <form action={guardarProducto} className="mt-6 grid gap-4">
                <input type="hidden" name="id" value={item?.id ?? ""} />

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Nombre
                  </label>
                  <input
                    name="nombre"
                    type="text"
                    required
                    defaultValue={item?.nombre ?? ""}
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
                      defaultValue={item?.tipo ?? ""}
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
                      defaultValue={item?.categoria ?? ""}
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
                      defaultValue={item?.stock_actual ?? 0}
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
                      defaultValue={item?.stock_minimo ?? 0}
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
                      defaultValue={item?.stock_maximo ?? 0}
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
                      defaultValue={item?.unidad ?? ""}
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
                      defaultValue={item?.estado ?? "normal"}
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
                    {item ? "Guardar cambios" : "Guardar ítem"}
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
