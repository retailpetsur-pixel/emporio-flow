import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

type InsumoCosteo = {
  id: string;
  nombre: string;
  familia_id: string | null;
  unidad_uso: string | null;
  unidad_referencia: string | null;
  unidad_formato_compra: string | null;
  cantidad_formato_compra: number | null;
  precio_referencia: number | null;
  costo_unitario_uso: number | null;
  stock_actual: number | null;
  stock_minimo: number | null;
};

type Familia = {
  id: string;
  nombre: string;
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

function factorConversion(unidadStock: string, unidadUso: string) {
  const stock = normalizarUnidad(unidadStock);
  const uso = normalizarUnidad(unidadUso);

  if (stock === "kg" && uso === "grs") return 1000;
  if (stock === "litros" && uso === "ml") return 1000;
  if (stock === uso) return 1;

  return 1;
}

function valorInsumo(item: InsumoCosteo) {
  const stock = Number(item.stock_actual ?? 0);
  const costoUso = Number(item.costo_unitario_uso ?? 0);
  const unidadStock =
    item.unidad_referencia ?? item.unidad_formato_compra ?? item.unidad_uso ?? "";
  const unidadUso = item.unidad_uso ?? unidadStock;
  const factor = factorConversion(unidadStock, unidadUso);

  return stock * factor * costoUso;
}

function estadoInsumo(item: InsumoCosteo): InventoryStatus {
  const stock = Number(item.stock_actual ?? 0);
  const minimo = Number(item.stock_minimo ?? 0);

  if (minimo > 0 && stock <= minimo) return "critical";
  return "normal";
}

function estadoProducto(
  stockActual: number,
  stockMinimo: number,
  stockMaximo: number
): InventoryStatus {
  if (stockMinimo > 0 && stockActual <= stockMinimo) return "critical";
  if (stockMaximo > 0 && stockActual > stockMaximo) return "overstock";
  return "normal";
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function esTexto(valor: string | undefined): valor is string {
  return Boolean(valor);
}

async function ajustarStockProducto(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const accion = String(formData.get("accion") || "");

  if (!id) {
    redirect(
      `/inventario?estado=error&mensaje=${encodeURIComponent(
        "No pude identificar el producto a ajustar."
      )}`
    );
  }

  const { data: producto, error: readError } = await supabase
    .from("productos")
    .select("id,nombre,stock_actual,stock_minimo,stock_maximo,unidad")
    .eq("id", id)
    .single();

  if (readError || !producto) {
    redirect(
      `/inventario?estado=error&mensaje=${encodeURIComponent(
        readError?.message ?? "No encontré el producto en inventario."
      )}`
    );
  }

  const stockActual = Number(producto.stock_actual ?? 0);
  const stockMinimo = Number(producto.stock_minimo ?? 0);
  const stockMaximo = Number(producto.stock_maximo ?? 0);
  let nuevoStock = stockActual;

  if (accion === "fijar") {
    nuevoStock = Number(formData.get("stock_real") || 0);
  } else {
    nuevoStock = stockActual + Number(formData.get("delta") || 0);
  }

  nuevoStock = Math.max(nuevoStock, 0);

  const { error } = await supabase
    .from("productos")
    .update({
      stock_actual: nuevoStock,
      estado: estadoProducto(nuevoStock, stockMinimo, stockMaximo),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/inventario?estado=error&mensaje=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/inventario");
  redirect(
    `/inventario?estado=ok&mensaje=${encodeURIComponent(
      `${producto.nombre} actualizado a ${nuevoStock.toLocaleString("es-CL")} ${
        producto.unidad ?? ""
      }.`
    )}`
  );
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

export default async function InventarioPage({
  searchParams,
}: {
  searchParams?: Promise<{
    estado?: string;
    mensaje?: string;
    q?: string;
    categoria?: string;
    tipo?: string;
    estado_stock?: string;
  }>;
}) {
  const params = await searchParams;
  const mensaje = params?.mensaje;
  const estadoMensaje = params?.estado === "ok" ? "ok" : "error";
  const busqueda = String(params?.q ?? "").trim();
  const filtroCategoria = String(params?.categoria ?? "");
  const filtroTipo = String(params?.tipo ?? "");
  const filtroEstadoStock = String(params?.estado_stock ?? "");
  const busquedaNormalizada = normalizarTexto(busqueda);

  const [
    { data, error },
    { data: insumosData, error: insumosError },
    { data: familiasData },
  ] =
    await Promise.all([
      supabase
        .from("productos")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("insumos_costeo")
        .select(
          "id,nombre,familia_id,unidad_uso,unidad_referencia,unidad_formato_compra,cantidad_formato_compra,precio_referencia,costo_unitario_uso,stock_actual,stock_minimo"
        )
        .eq("activo", true)
        .order("nombre", { ascending: true }),
      supabase
        .from("familias_productos")
        .select("id,nombre")
        .eq("activo", true)
        .order("nombre", { ascending: true }),
    ]);

  const productos: Producto[] = data ?? [];
  const insumos: InsumoCosteo[] = insumosData ?? [];
  const familias: Familia[] = familiasData ?? [];
  const familiaPorId = new Map(familias.map((familia) => [familia.id, familia.nombre]));

  const categoriaOpciones = Array.from(
    new Set([
      ...productos.map((item) => item.categoria).filter(esTexto),
      ...insumos
        .map((item) => familiaPorId.get(item.familia_id ?? ""))
        .filter(esTexto),
    ])
  ).sort((a, b) => a.localeCompare(b, "es"));

  const sugerencias = Array.from(
    new Set([...productos.map((item) => item.nombre), ...insumos.map((item) => item.nombre)])
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"))
    .slice(0, 80);

  const productosFiltrados = productos.filter((item) => {
    const coincideTexto =
      !busquedaNormalizada ||
      normalizarTexto(`${item.nombre} ${item.tipo} ${item.categoria}`).includes(
        busquedaNormalizada
      );
    const coincideCategoria =
      !filtroCategoria || item.categoria === filtroCategoria;
    const coincideTipo = !filtroTipo || item.tipo === filtroTipo;
    const coincideEstado =
      !filtroEstadoStock || item.estado === filtroEstadoStock;

    return coincideTexto && coincideCategoria && coincideTipo && coincideEstado;
  });

  const insumosFiltrados = insumos.filter((item) => {
    const familia = familiaPorId.get(item.familia_id ?? "") ?? "";
    const estado = estadoInsumo(item);
    const coincideTexto =
      !busquedaNormalizada ||
      normalizarTexto(`${item.nombre} ${familia}`).includes(busquedaNormalizada);
    const coincideCategoria = !filtroCategoria || familia === filtroCategoria;
    const coincideTipo = !filtroTipo || filtroTipo === "Insumo";
    const coincideEstado = !filtroEstadoStock || estado === filtroEstadoStock;

    return coincideTexto && coincideCategoria && coincideTipo && coincideEstado;
  });

  const totalItems = productos.length;
  const criticalItems = productos.filter((p) => p.estado === "critical").length;
  const overstockItems = productos.filter((p) => p.estado === "overstock").length;
  const normalItems = productos.filter((p) => p.estado === "normal").length;
  const valorTotalInsumos = insumos.reduce(
    (total, item) => total + valorInsumo(item),
    0
  );
  const insumosCriticos = insumos.filter(
    (item) => estadoInsumo(item) === "critical"
  ).length;

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
            {mensaje ? (
              <div
                className={`mb-6 rounded-2xl border p-5 text-sm font-semibold ${
                  estadoMensaje === "ok"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-red-100 bg-red-50 text-red-700"
                }`}
              >
                {mensaje}
              </div>
            ) : null}

            <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Entrada de mercadería
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">
                    Registrar compra o ingreso
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-800">
                    Usa esta opción para ingresar formatos reales de compra,
                    cantidades y precios. El inventario se actualizará con costo
                    promedio ponderado.
                  </p>
                </div>
                <a
                  href="/compras"
                  className="rounded-xl bg-emerald-700 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                >
                  Registrar entrada
                </a>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Buscar en inventario
                  </h3>
                  <p className="text-sm text-slate-500">
                    Filtra por nombre, familia, tipo o estado de stock.
                  </p>
                </div>
                {(busqueda || filtroCategoria || filtroTipo || filtroEstadoStock) ? (
                  <a
                    href="/inventario"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Limpiar filtros
                  </a>
                ) : null}
              </div>

              <form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="xl:col-span-2">
                  <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                    Buscar texto
                  </label>
                  <input
                    name="q"
                    list="inventario-sugerencias"
                    defaultValue={busqueda}
                    placeholder="Ej: mozzarella, harina, empanada..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  />
                  <datalist id="inventario-sugerencias">
                    {sugerencias.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                    Familia / categoría
                  </label>
                  <select
                    name="categoria"
                    defaultValue={filtroCategoria}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  >
                    <option value="">Todas</option>
                    {categoriaOpciones.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                    Tipo
                  </label>
                  <select
                    name="tipo"
                    defaultValue={filtroTipo}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  >
                    <option value="">Todos</option>
                    <option value="Insumo">Insumo</option>
                    <option value="Subproducto">Subproducto</option>
                    <option value="Producto final">Producto final</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                    Estado
                  </label>
                  <select
                    name="estado_stock"
                    defaultValue={filtroEstadoStock}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  >
                    <option value="">Todos</option>
                    <option value="critical">Crítico</option>
                    <option value="normal">Normal</option>
                    <option value="overstock">Sobre stock</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 md:col-span-2 xl:col-span-5"
                >
                  Aplicar búsqueda
                </button>
              </form>
            </div>

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
                    Inventario valorizado
                  </h3>
                  <p className="text-sm text-slate-500">
                    Valor económico del stock, calculado con el costo promedio
                    vigente de cada insumo.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-500">Insumos activos</p>
                    <p className="text-lg font-bold text-slate-900">
                      {insumos.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 px-4 py-3">
                    <p className="text-xs text-red-700">Bajo mínimo</p>
                    <p className="text-lg font-bold text-red-700">
                      {insumosCriticos}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-4 py-3">
                    <p className="text-xs text-emerald-700">Valor total</p>
                    <p className="text-lg font-bold text-emerald-800">
                      {money(valorTotalInsumos)}
                    </p>
                  </div>
                </div>
              </div>

              {insumosError ? (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Error al cargar insumos valorizados: {insumosError.message}
                </div>
              ) : (
                <div className="mt-6 overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Insumo</th>
                        <th className="px-4 py-3 text-right">Stock físico</th>
                        <th className="px-4 py-3 text-right">Mínimo</th>
                        <th className="px-4 py-3 text-right">Costo receta</th>
                        <th className="px-4 py-3 text-right">Valor stock</th>
                        <th className="px-4 py-3 text-right">Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {insumosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 text-slate-500">
                            No hay insumos valorizados para esta búsqueda.
                          </td>
                        </tr>
                      ) : (
                        insumosFiltrados.map((item) => {
                          const unidadStock =
                            item.unidad_referencia ??
                            item.unidad_formato_compra ??
                            item.unidad_uso ??
                            "";
                          const stock = Number(item.stock_actual ?? 0);
                          const minimo = Number(item.stock_minimo ?? 0);

                          return (
                            <tr key={item.id} className="border-t bg-white hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-900">
                                <a
                                  href={`/recetas-costos?insumo=${item.id}`}
                                  className="font-semibold text-slate-950 hover:text-emerald-700 hover:underline"
                                >
                                  {item.nombre}
                                </a>
                                <p className="text-xs font-normal text-slate-500">
                                  Formato: {item.cantidad_formato_compra ?? 1}{" "}
                                  {item.unidad_formato_compra ?? unidadStock} ·{" "}
                                  {money(Number(item.precio_referencia ?? 0))}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                {stock.toLocaleString("es-CL")} {unidadStock}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {minimo.toLocaleString("es-CL")} {unidadStock}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {money(Number(item.costo_unitario_uso ?? 0))} /{" "}
                                {item.unidad_uso ?? unidadStock}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">
                                {money(valorInsumo(item))}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <StatusBadge status={estadoInsumo(item)} />
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

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Inventario de existencias
                  </h3>
                  <p className="text-sm text-slate-500">
                    Vista física del stock operativo. Las entradas reales se
                    registran desde Compras porque los formatos pueden variar.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href="/compras"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 text-center"
                  >
                    Registrar entrada
                  </a>
                  <a
                    href="/compras"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Ver compras sugeridas
                  </a>
                </div>
              </div>

              {error ? (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Error al cargar inventario: {error.message}
                </div>
              ) : (
                <>
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                  Los botones de ajuste rápido se retiraron de esta vista para
                  evitar errores de formato. Para ingresar mercadería, usa
                  Compras: ahí se registra formato comprado, cantidad, precio y
                  costo promedio ponderado.
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-[1040px] w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-sm text-slate-500">
                        <th className="px-4 py-2">Nombre</th>
                        <th className="px-4 py-2">Tipo</th>
                        <th className="px-4 py-2">Categoría</th>
                        <th className="px-4 py-2 text-right">Stock actual</th>
                        <th className="px-4 py-2">Mínimo</th>
                        <th className="px-4 py-2">Máximo</th>
                        <th className="px-4 py-2">Unidad</th>
                        <th className="px-4 py-2">Estado</th>
                        <th className="px-4 py-2 text-right">Ajuste físico</th>
                      </tr>
                    </thead>

                    <tbody>
                      {productosFiltrados.length === 0 ? (
                        <tr className="bg-slate-50 text-sm text-slate-700">
                          <td
                            colSpan={9}
                            className="rounded-2xl px-4 py-5 text-slate-500"
                          >
                            No hay existencias para esta búsqueda.
                          </td>
                        </tr>
                      ) : (
                      productosFiltrados.map((item) => (
                        <tr
                          key={item.id}
                          className="bg-slate-50 text-sm text-slate-700"
                        >
                          <td className="rounded-l-2xl px-4 py-4 font-medium text-slate-900">
                            <a
                              href={`/nuevo-item?id=${item.id}`}
                              className="font-semibold text-slate-950 underline-offset-4 hover:text-emerald-700 hover:underline"
                            >
                              {item.nombre}
                            </a>
                          </td>
                          <td className="px-4 py-4">{item.tipo}</td>
                          <td className="px-4 py-4">{item.categoria}</td>
                          <td className="px-4 py-4 text-right font-semibold text-slate-900">
                            {item.stock_actual}
                          </td>
                          <td className="px-4 py-4">{item.stock_minimo}</td>
                          <td className="px-4 py-4">{item.stock_maximo}</td>
                          <td className="px-4 py-4">{item.unidad ?? "-"}</td>
                          <td className="px-4 py-4">
                            <StatusBadge status={item.estado} />
                          </td>
                          <td className="rounded-r-2xl px-4 py-4">
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center justify-end gap-2">
                                <form action={ajustarStockProducto}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <input type="hidden" name="accion" value="delta" />
                                  <input type="hidden" name="delta" value="-1" />
                                  <button
                                    type="submit"
                                    className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-100"
                                    title="Restar 1"
                                  >
                                    -
                                  </button>
                                </form>

                                <form action={ajustarStockProducto}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <input type="hidden" name="accion" value="delta" />
                                  <input type="hidden" name="delta" value="1" />
                                  <button
                                    type="submit"
                                    className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-100"
                                    title="Sumar 1"
                                  >
                                    +
                                  </button>
                                </form>
                              </div>

                              <form
                                action={ajustarStockProducto}
                                className="flex items-center justify-end gap-2"
                              >
                                <input type="hidden" name="id" value={item.id} />
                                <input type="hidden" name="accion" value="fijar" />
                                <input
                                  name="stock_real"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Stock real"
                                  className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm text-slate-900"
                                />
                                <button
                                  type="submit"
                                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                >
                                  Guardar
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
