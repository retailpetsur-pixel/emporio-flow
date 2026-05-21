import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { purchasePriority, stockValue, suggestedFormats } from "@/lib/domain/inventory";
import { calculatePurchaseCost, resolvePurchasePrice } from "@/lib/domain/purchasing";
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

function decimal(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function registrarCompra(formData: FormData) {
  "use server";

  const insumoId = String(formData.get("insumo_id") || "");
  const cantidadFormatos = decimal(formData.get("cantidad_formatos"));
  const cantidadPorFormato = decimal(formData.get("cantidad_por_formato"));
  const unidadFormato = String(formData.get("unidad_formato") || "");
  const precioTotalIngresado = decimal(formData.get("precio_total"));
  const precioUnitarioFormato = decimal(formData.get("precio_unitario_formato"));
  const { precioTotal, precioFormato, modoPrecio } = resolvePurchasePrice({
    cantidadFormatos,
    precioTotal: precioTotalIngresado,
    precioUnitarioFormato,
  });

  if (
    !insumoId ||
    cantidadFormatos <= 0 ||
    cantidadPorFormato <= 0 ||
    !unidadFormato ||
    precioTotal <= 0
  ) {
    throw new Error(
      "Completa insumo, cantidad, formato, unidad y al menos un precio: total o unitario."
    );
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

  const { nuevoStock, nuevoCostoPromedio } = calculatePurchaseCost({
    stockActual: stockAnterior,
    costoAnterior,
    cantidadFormatos,
    cantidadPorFormato,
    unidadFormato,
    unidadStock,
    unidadUso,
    precioTotal,
  });

  const { error: updateError } = await supabase
    .from("insumos_costeo")
    .update({
      stock_actual: nuevoStock,
      costo_unitario_uso: nuevoCostoPromedio,
      precio_referencia: precioFormato,
      costo_compra: precioFormato,
      cantidad_formato_compra: cantidadPorFormato,
      unidad_formato_compra: unidadFormato,
      unidad_referencia: unidadStock,
    })
    .eq("id", insumoId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/compras");
  revalidatePath("/inventario");
  revalidatePath("/recetas-costos");
  redirect(
    `/compras?estado=ok&mensaje=${encodeURIComponent(
      `Compra de ${item.nombre} registrada. Stock actualizado a ${nuevoStock.toLocaleString(
        "es-CL",
        { maximumFractionDigits: 2 }
      )} ${unidadStock}. Precio tomado por ${
        modoPrecio === "unitario" ? "valor unitario" : "total de compra"
      }.`
    )}`
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs leading-5 text-slate-500 sm:text-sm">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 sm:mt-3 sm:text-3xl">
        {value}
      </p>
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
      purchasePriority(
        Number(item.stock_actual ?? 0),
        Number(item.stock_minimo ?? 0)
      ) === "Alta"
  ).length;
  const valorInventario = insumos.reduce(
    (total, item) => total + stockValue(item),
    0
  );
  const compraEstimada = sugeridos.reduce((total, item) => {
    const formatos = suggestedFormats(item);
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

          <div className="mx-auto w-full max-w-[1560px] space-y-4 px-3 py-4 sm:space-y-6 sm:p-6">
            {mensaje ? (
              <div
                className={`rounded-2xl border p-4 text-sm font-semibold sm:p-5 ${
                  estado === "ok"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-red-100 bg-red-50 text-red-700"
                }`}
              >
                {mensaje}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Insumos bajo mínimo" value={String(sugeridos.length)} />
              <StatCard title="Compras urgentes" value={String(urgentes)} />
              <StatCard title="Compra estimada" value={money(compraEstimada)} />
              <StatCard title="Inventario valorizado" value={money(valorInventario)} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[420px_1fr] xl:gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Registrar compra real
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Usa el formato comprado hoy. Puedes ingresar precio total o precio unitario por formato.
                </p>

                <form action={registrarCompra} className="mt-4 grid gap-4 sm:mt-5">
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
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="Ej: 2"
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Contenido por formato
                      <input
                        name="cantidad_por_formato"
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="Ej: 2,5"
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

                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Precio total pagado
                      <input
                        name="precio_total"
                        type="text"
                        inputMode="decimal"
                        placeholder="Ej: 7600"
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Precio unitario/formato
                      <input
                        name="precio_unitario_formato"
                        type="text"
                        inputMode="decimal"
                        placeholder="Ej: 3800"
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                      />
                    </label>
                  </div>

                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                    Si completas ambos precios, se usará el total pagado. Para boletas con varios insumos, usa el precio unitario de la línea.
                  </p>

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
                    className="rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white sm:py-3"
                  >
                    Guardar compra y recalcular costo
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Compras sugeridas por stock mínimo
                </h2>

                {error ? (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Error al cargar compras: {error.message}
                  </div>
                ) : (
                  <div className="mt-5 hidden max-h-[640px] overflow-auto rounded-xl border border-slate-200 md:block">
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
                            const formatos = suggestedFormats(item);
                            const precioFormato = Number(
                              item.precio_referencia ?? item.costo_compra ?? 0
                            );
                            const prioridad = purchasePriority(
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

                {!error ? (
                  <div className="mt-4 grid gap-3 md:hidden">
                    {sugeridos.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                        No hay insumos bajo mínimo por ahora.
                      </div>
                    ) : (
                      sugeridos.map((item) => {
                        const unidadStock =
                          item.unidad_referencia ??
                          item.unidad_formato_compra ??
                          item.unidad_uso ??
                          "";
                        const formatos = suggestedFormats(item);
                        const precioFormato = Number(
                          item.precio_referencia ?? item.costo_compra ?? 0
                        );
                        const prioridad = purchasePriority(
                          Number(item.stock_actual ?? 0),
                          Number(item.stock_minimo ?? 0)
                        );

                        return (
                          <article
                            key={item.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-bold text-slate-950">
                                  {item.nombre}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                  Formato ref.: {item.cantidad_formato_compra ?? 1}{" "}
                                  {item.unidad_formato_compra ?? unidadStock}
                                </p>
                              </div>
                              <PriorityBadge priority={prioridad} />
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                              <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <p className="text-xs text-slate-500">Stock</p>
                                <p className="font-bold text-slate-900">
                                  {item.stock_actual ?? 0} {unidadStock}
                                </p>
                              </div>
                              <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <p className="text-xs text-slate-500">Mínimo</p>
                                <p className="font-bold text-slate-900">
                                  {item.stock_minimo ?? 0} {unidadStock}
                                </p>
                              </div>
                              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                                <p className="text-xs text-emerald-700">Comprar</p>
                                <p className="font-bold text-emerald-900">
                                  {formatos} formato{formatos === 1 ? "" : "s"}
                                </p>
                              </div>
                              <div className="rounded-lg bg-slate-900 px-3 py-2 text-white">
                                <p className="text-xs text-slate-300">Estimado</p>
                                <p className="font-bold">
                                  {money(formatos * precioFormato)}
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
