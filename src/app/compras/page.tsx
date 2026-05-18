import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Priority = "Alta" | "Media" | "Baja";

type Insumo = {
  id: string;
  nombre: string;
  familia_id: string | null;
  unidad_uso: string | null;
  unidad_referencia: string | null;
  unidad_formato_compra: string | null;
  cantidad_formato_compra: number | null;
  precio_referencia: number | null;
  costo_compra: number | null;
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

function factorCantidad(desde: string, hacia: string) {
  const from = normalizarUnidad(desde);
  const to = normalizarUnidad(hacia);

  if (from === to) return 1;
  if (from === "kg" && to === "grs") return 1000;
  if (from === "grs" && to === "kg") return 1 / 1000;
  if (from === "litros" && to === "ml") return 1000;
  if (from === "ml" && to === "litros") return 1 / 1000;

  return 1;
}

function convertirCantidad(cantidad: number, desde: string, hacia: string) {
  return cantidad * factorCantidad(desde, hacia);
}

function definirPrioridad(stockActual: number, stockMinimo: number): Priority {
  if (stockActual <= 0) return "Alta";
  if (stockActual < stockMinimo) return "Alta";
  if (stockActual === stockMinimo) return "Media";
  return "Baja";
}

function formatosSugeridos(insumo: Insumo) {
  const stockActual = Number(insumo.stock_actual ?? 0);
  const stockMinimo = Number(insumo.stock_minimo ?? 0);
  const contenidoFormato = Number(insumo.cantidad_formato_compra ?? 1);
  const faltante = Math.max(stockMinimo - stockActual, 0);

  if (faltante <= 0 || contenidoFormato <= 0) return 0;

  return Math.ceil(faltante / contenidoFormato);
}

function valorStock(insumo: Insumo) {
  const stock = Number(insumo.stock_actual ?? 0);
  const unidadStock =
    insumo.unidad_referencia ?? insumo.unidad_formato_compra ?? insumo.unidad_uso ?? "";
  const unidadUso = insumo.unidad_uso ?? unidadStock;
  const stockEnUso = convertirCantidad(stock, unidadStock, unidadUso);

  return stockEnUso * Number(insumo.costo_unitario_uso ?? 0);
}

async function registrarCompra(formData: FormData) {
  "use server";

  const insumoId = String(formData.get("insumo_id") || "");
  const cantidadFormatos = Number(formData.get("cantidad_formatos") || 0);
  const cantidadPorFormato = Number(formData.get("cantidad_por_formato") || 0);
  const unidadFormato = String(formData.get("unidad_formato") || "");
  const precioTotal = Number(formData.get("precio_total") || 0);
  const proveedor = String(formData.get("proveedor") || "").trim();
  const observacion = String(formData.get("observacion") || "").trim();

  if (
    !insumoId ||
    cantidadFormatos <= 0 ||
    cantidadPorFormato <= 0 ||
    !unidadFormato ||
    precioTotal <= 0
  ) {
    throw new Error("Completa insumo, cantidad, formato, unidad y precio total.");
  }

  const { data: insumo, error: readError } = await supabase
    .from("insumos_costeo")
    .select(
      "id,nombre,unidad_uso,unidad_referencia,unidad_formato_compra,cantidad_formato_compra,precio_referencia,costo_compra,costo_unitario_uso,stock_actual,stock_minimo"
    )
    .eq("id", insumoId)
    .single();

  if (readError) throw new Error(readError.message);

  const item = insumo as Insumo;
  const unidadStock =
    item.unidad_referencia ?? item.unidad_formato_compra ?? unidadFormato;
  const unidadUso = item.unidad_uso ?? unidadStock;
  const stockAnterior = Number(item.stock_actual ?? 0);
  const costoAnterior = Number(item.costo_unitario_uso ?? 0);

  const cantidadTotalCompra = cantidadFormatos * cantidadPorFormato;
  const cantidadCompraEnStock = convertirCantidad(
    cantidadTotalCompra,
    unidadFormato,
    unidadStock
  );
  const cantidadCompraEnUso = convertirCantidad(
    cantidadTotalCompra,
    unidadFormato,
    unidadUso
  );
  const stockAnteriorEnUso = convertirCantidad(
    stockAnterior,
    unidadStock,
    unidadUso
  );
  const valorAnterior = stockAnteriorEnUso * costoAnterior;
  const nuevoStock = stockAnterior + cantidadCompraEnStock;
  const nuevoCostoPromedio =
    stockAnteriorEnUso + cantidadCompraEnUso > 0
      ? (valorAnterior + precioTotal) /
        (stockAnteriorEnUso + cantidadCompraEnUso)
      : precioTotal / cantidadCompraEnUso;

  const { error: updateError } = await supabase
    .from("insumos_costeo")
    .update({
      stock_actual: nuevoStock,
      costo_unitario_uso: nuevoCostoPromedio,
      precio_referencia: precioTotal / cantidadFormatos,
      costo_compra: precioTotal / cantidadFormatos,
      cantidad_formato_compra: cantidadPorFormato,
      unidad_formato_compra: unidadFormato,
      unidad_referencia: unidadStock,
    })
    .eq("id", insumoId);

  if (updateError) throw new Error(updateError.message);

  await supabase.from("compras_insumos").insert([
    {
      insumo_id: insumoId,
      proveedor: proveedor || null,
      cantidad_formatos: cantidadFormatos,
      cantidad_por_formato: cantidadPorFormato,
      unidad_formato: unidadFormato,
      cantidad_total: cantidadTotalCompra,
      precio_total: precioTotal,
      costo_unitario_compra: precioTotal / cantidadCompraEnUso,
      costo_promedio_anterior: costoAnterior,
      costo_promedio_nuevo: nuevoCostoPromedio,
      observacion: observacion || null,
    },
  ]);

  revalidatePath("/compras");
  revalidatePath("/inventario");
  revalidatePath("/recetas-costos");
  redirect(
    `/compras?estado=ok&mensaje=${encodeURIComponent(
      `Compra de ${item.nombre} registrada. Stock actualizado a ${nuevoStock.toLocaleString(
        "es-CL"
      )} ${unidadStock}.`
    )}`
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
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

export default async function ComprasPage({
  searchParams,
}: {
  searchParams?: Promise<{ estado?: string; mensaje?: string }>;
}) {
  const params = await searchParams;
  const mensaje = params?.mensaje;
  const estado = params?.estado === "ok" ? "ok" : "error";
  const { data, error } = await supabase
    .from("insumos_costeo")
    .select(
      "id,nombre,familia_id,unidad_uso,unidad_referencia,unidad_formato_compra,cantidad_formato_compra,precio_referencia,costo_compra,costo_unitario_uso,stock_actual,stock_minimo"
    )
    .eq("activo", true)
    .order("nombre", { ascending: true });

  const insumos: Insumo[] = data ?? [];
  const sugeridos = insumos.filter(
    (item) =>
      Number(item.stock_minimo ?? 0) > 0 &&
      Number(item.stock_actual ?? 0) <= Number(item.stock_minimo ?? 0)
  );

  const urgentes = sugeridos.filter(
    (item) =>
      definirPrioridad(
        Number(item.stock_actual ?? 0),
        Number(item.stock_minimo ?? 0)
      ) === "Alta"
  ).length;
  const valorInventario = insumos.reduce(
    (total, item) => total + valorStock(item),
    0
  );
  const compraEstimada = sugeridos.reduce((total, item) => {
    const formatos = formatosSugeridos(item);
    const precioFormato = Number(item.precio_referencia ?? item.costo_compra ?? 0);
    return total + formatos * precioFormato;
  }, 0);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1">
          <Topbar
            title="Compras Inteligentes"
            subtitle="Compras sugeridas, registro real y costo promedio ponderado"
          />

          <div className="mx-auto w-full max-w-[1560px] space-y-6 p-6">
            {mensaje ? (
              <div
                className={`rounded-2xl border p-5 text-sm font-semibold ${
                  estado === "ok"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-red-100 bg-red-50 text-red-700"
                }`}
              >
                {mensaje}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Insumos bajo mínimo" value={String(sugeridos.length)} />
              <StatCard title="Compras urgentes" value={String(urgentes)} />
              <StatCard title="Compra estimada" value={money(compraEstimada)} />
              <StatCard title="Inventario valorizado" value={money(valorInventario)} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Registrar compra real
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Usa el formato comprado hoy. El sistema recalcula el costo promedio ponderado.
                </p>

                <form action={registrarCompra} className="mt-5 grid gap-4">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Insumo
                    <select
                      name="insumo_id"
                      required
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal"
                    >
                      <option value="">Seleccionar insumo</option>
                      {insumos.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Cantidad de formatos
                      <input
                        name="cantidad_formatos"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="Ej: 2"
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Contenido por formato
                      <input
                        name="cantidad_por_formato"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="Ej: 250"
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Unidad formato
                      <select
                        name="unidad_formato"
                        required
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal"
                      >
                        <option value="">Unidad</option>
                        <option value="kg">kg</option>
                        <option value="grs">grs</option>
                        <option value="litros">litros</option>
                        <option value="ml">ml</option>
                        <option value="un">un</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Precio total pagado
                      <input
                        name="precio_total"
                        type="number"
                        step="1"
                        min="0"
                        required
                        placeholder="Ej: 7600"
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                      />
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Proveedor
                    <input
                      name="proveedor"
                      placeholder="Opcional"
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Observación
                    <input
                      name="observacion"
                      placeholder="Ej: formato alternativo"
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                    />
                  </label>

                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Guardar compra y recalcular costo
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Compras sugeridas por stock mínimo
                </h2>

                {error ? (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Error al cargar compras: {error.message}
                  </div>
                ) : (
                  <div className="mt-5 max-h-[640px] overflow-auto rounded-xl border border-slate-200">
                    <table className="min-w-[980px] w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Insumo</th>
                          <th className="px-4 py-3 text-right">Stock</th>
                          <th className="px-4 py-3 text-right">Mínimo</th>
                          <th className="px-4 py-3 text-right">Sugerido</th>
                          <th className="px-4 py-3 text-right">Valor estimado</th>
                          <th className="px-4 py-3 text-right">Prioridad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sugeridos.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 text-slate-500">
                              No hay insumos bajo mínimo por ahora.
                            </td>
                          </tr>
                        ) : (
                          sugeridos.map((item) => {
                            const unidadStock =
                              item.unidad_referencia ??
                              item.unidad_formato_compra ??
                              item.unidad_uso ??
                              "";
                            const formatos = formatosSugeridos(item);
                            const precioFormato = Number(
                              item.precio_referencia ?? item.costo_compra ?? 0
                            );
                            const prioridad = definirPrioridad(
                              Number(item.stock_actual ?? 0),
                              Number(item.stock_minimo ?? 0)
                            );

                            return (
                              <tr key={item.id} className="border-t bg-white hover:bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-900">
                                  {item.nombre}
                                  <p className="text-xs font-normal text-slate-500">
                                    Formato ref.: {item.cantidad_formato_compra ?? 1}{" "}
                                    {item.unidad_formato_compra ?? unidadStock}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {item.stock_actual ?? 0} {unidadStock}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {item.stock_minimo ?? 0} {unidadStock}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                  {formatos} formato{formatos === 1 ? "" : "s"}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                  {money(formatos * precioFormato)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <PriorityBadge priority={prioridad} />
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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
