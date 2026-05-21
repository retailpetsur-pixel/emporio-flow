import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import AutoSubmitForm from "@/components/emporio/auto-submit-form";
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
  const decimals = Number.isInteger(v) ? 0 : 2;

  return `$${new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(v || 0)}`;
}

function unitMoney(v: number) {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v || 0);
}

function quantity(v: number) {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v || 0);
}

function decimal(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
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

function claveProductoInventario(item: Producto) {
  return [
    normalizarTexto(item.nombre),
    normalizarTexto(item.tipo),
    normalizarTexto(item.categoria),
    normalizarTexto(item.unidad ?? ""),
  ].join("|");
}

function quitarProductosDuplicados(productos: Producto[]) {
  const porClave = new Map<string, Producto>();

  productos.forEach((item) => {
    const clave = claveProductoInventario(item);

    if (!porClave.has(clave)) {
      porClave.set(clave, item);
    }
  });

  return Array.from(porClave.values());
}

function productoDesdeInsumo(
  insumo: InsumoCosteo,
  familiaPorId: Map<string, string>
): Producto {
  const unidad =
    insumo.unidad_referencia ??
    insumo.unidad_formato_compra ??
    insumo.unidad_uso ??
    null;
  const stockActual = Number(insumo.stock_actual ?? 0);
  const stockMinimo = Number(insumo.stock_minimo ?? 0);

  return {
    id: insumo.id,
    nombre: insumo.nombre,
    tipo: "Insumo",
    categoria: familiaPorId.get(insumo.familia_id ?? "") ?? "Sin familia",
    stock_actual: stockActual,
    stock_minimo: stockMinimo,
    stock_maximo: 0,
    unidad,
    estado: estadoProducto(stockActual, stockMinimo, 0),
  };
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
    .from("insumos_costeo")
    .select(
      "id,nombre,stock_actual,stock_minimo,unidad_referencia,unidad_formato_compra,unidad_uso"
    )
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
  let nuevoStock = stockActual;
  const unidad =
    producto.unidad_referencia ??
    producto.unidad_formato_compra ??
    producto.unidad_uso ??
    "";

  if (accion === "fijar") {
    nuevoStock = decimal(formData.get("stock_real"));
  } else {
    nuevoStock = stockActual + decimal(formData.get("delta"));
  }

  nuevoStock = Math.max(nuevoStock, 0);

  const { error } = await supabase
    .from("insumos_costeo")
    .update({
      stock_actual: nuevoStock,
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
        unidad
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs leading-5 text-slate-500 sm:text-sm">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 sm:mt-3 sm:text-3xl">
        {value}
      </p>
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
    val_q?: string;
    val_familia?: string;
    ex_q?: string;
    ex_categoria?: string;
    ex_tipo?: string;
    ex_estado?: string;
  }>;
}) {
  const params = await searchParams;
  const mensaje = params?.mensaje;
  const estadoMensaje = params?.estado === "ok" ? "ok" : "error";
  const busquedaValorizado = String(params?.val_q ?? "").trim();
  const filtroFamiliaValorizado = String(params?.val_familia ?? "");
  const busquedaExistencias = String(params?.ex_q ?? "").trim();
  const filtroCategoriaExistencias = String(params?.ex_categoria ?? "");
  const filtroTipoExistencias = String(params?.ex_tipo ?? "");
  const filtroEstadoExistencias = String(params?.ex_estado ?? "");
  const busquedaValorizadoNormalizada = normalizarTexto(busquedaValorizado);
  const busquedaExistenciasNormalizada = normalizarTexto(busquedaExistencias);
  const hayFiltroValorizado = Boolean(
    busquedaValorizado || filtroFamiliaValorizado
  );
  const hayFiltroExistencias = Boolean(
    busquedaExistencias ||
      filtroCategoriaExistencias ||
      filtroTipoExistencias ||
      filtroEstadoExistencias
  );
  const abrirValorizado = !hayFiltroExistencias || hayFiltroValorizado;
  const abrirExistencias = !hayFiltroValorizado || hayFiltroExistencias;

  const [{ data: insumosData, error: insumosError }, { data: familiasData }] =
    await Promise.all([
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

  const insumos: InsumoCosteo[] = insumosData ?? [];
  const familias: Familia[] = familiasData ?? [];
  const familiaPorId = new Map(familias.map((familia) => [familia.id, familia.nombre]));
  const productosBase = insumos.map((insumo) =>
    productoDesdeInsumo(insumo, familiaPorId)
  );
  const productos = quitarProductosDuplicados(productosBase);

  const familiaOpciones = Array.from(
    new Set(
      insumos
        .map((item) => familiaPorId.get(item.familia_id ?? ""))
        .filter(esTexto)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  const categoriaExistenciasOpciones = Array.from(
    new Set(productos.map((item) => item.categoria).filter(esTexto))
  ).sort((a, b) => a.localeCompare(b, "es"));

  const sugerenciasInsumos = Array.from(
    new Set(insumos.map((item) => item.nombre))
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"))
    .slice(0, 80);

  const sugerenciasExistencias = Array.from(
    new Set(productos.map((item) => item.nombre))
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"))
    .slice(0, 80);

  const productosFiltrados = productos.filter((item) => {
    const coincideTexto =
      !busquedaExistenciasNormalizada ||
      normalizarTexto(`${item.nombre} ${item.tipo} ${item.categoria}`).includes(
        busquedaExistenciasNormalizada
      );
    const coincideCategoria =
      !filtroCategoriaExistencias || item.categoria === filtroCategoriaExistencias;
    const coincideTipo =
      !filtroTipoExistencias || item.tipo === filtroTipoExistencias;
    const coincideEstado =
      !filtroEstadoExistencias || item.estado === filtroEstadoExistencias;

    return coincideTexto && coincideCategoria && coincideTipo && coincideEstado;
  });

  const insumosFiltrados = insumos.filter((item) => {
    const familia = familiaPorId.get(item.familia_id ?? "") ?? "";
    const coincideTexto =
      !busquedaValorizadoNormalizada ||
      normalizarTexto(`${item.nombre} ${familia}`).includes(
        busquedaValorizadoNormalizada
      );
    const coincideCategoria =
      !filtroFamiliaValorizado || familia === filtroFamiliaValorizado;

    return coincideTexto && coincideCategoria;
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

          <div className="px-3 py-4 sm:p-6">
            {mensaje ? (
              <div
                className={`mb-4 rounded-2xl border p-4 text-sm font-semibold sm:mb-6 sm:p-5 ${
                  estadoMensaje === "ok"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-red-100 bg-red-50 text-red-700"
                }`}
              >
                {mensaje}
              </div>
            ) : null}

            <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm sm:mb-6 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Entrada de mercadería
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
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

            <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Ítems activos" value={String(totalItems)} />
              <StatCard title="Críticos" value={String(criticalItems)} />
              <StatCard title="Sobre stock" value={String(overstockItems)} />
              <StatCard title="Normales" value={String(normalItems)} />
            </div>

            <details
              open={abrirValorizado}
              id="valorizado"
              className="group mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6"
            >
              <summary className="cursor-pointer list-none">
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

                <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
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
                <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                  <span className="hidden group-open:inline">Contraer</span>
                  <span className="group-open:hidden">Expandir</span>
                </div>

                <div className="mt-4 grid gap-3 group-open:hidden sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-500">Insumos</p>
                    <p className="text-lg font-bold text-slate-900">
                      {insumos.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-4 py-3">
                    <p className="text-xs text-emerald-700">Valor total</p>
                    <p className="text-lg font-bold text-emerald-800">
                      {money(valorTotalInsumos)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 px-4 py-3">
                    <p className="text-xs text-red-700">Bajo mínimo</p>
                    <p className="text-lg font-bold text-red-700">
                      {insumosCriticos}
                    </p>
                  </div>
                </div>
              </summary>

              <AutoSubmitForm
                action="/inventario#valorizado"
                className="mt-5 grid gap-3 md:grid-cols-[1fr_260px_auto]"
              >
                <input type="hidden" name="ex_q" value={busquedaExistencias} />
                <input
                  type="hidden"
                  name="ex_categoria"
                  value={filtroCategoriaExistencias}
                />
                <input type="hidden" name="ex_tipo" value={filtroTipoExistencias} />
                <input
                  type="hidden"
                  name="ex_estado"
                  value={filtroEstadoExistencias}
                />

                <div>
                  <input
                    name="val_q"
                    list="inventario-valorizado-sugerencias"
                    defaultValue={busquedaValorizado}
                    placeholder="Buscar insumo..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  />
                  <datalist id="inventario-valorizado-sugerencias">
                    {sugerenciasInsumos.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <select
                    name="val_familia"
                    defaultValue={filtroFamiliaValorizado}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  >
                    <option value="">Todas las familias</option>
                    {familiaOpciones.map((familia) => (
                      <option key={familia} value={familia}>
                        {familia}
                      </option>
                    ))}
                  </select>
                </div>

                {hayFiltroValorizado ? (
                  <a
                    href={`/inventario?ex_q=${encodeURIComponent(
                      busquedaExistencias
                    )}&ex_categoria=${encodeURIComponent(
                      filtroCategoriaExistencias
                    )}&ex_tipo=${encodeURIComponent(
                      filtroTipoExistencias
                    )}&ex_estado=${encodeURIComponent(
                      filtroEstadoExistencias
                    )}#valorizado`}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Limpiar
                  </a>
                ) : null}
              </AutoSubmitForm>

              {insumosError ? (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Error al cargar insumos valorizados: {insumosError.message}
                </div>
              ) : (
                <>
                <div className="mt-5 grid gap-3 md:hidden">
                  {insumosFiltrados.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No hay insumos valorizados para esta búsqueda.
                    </div>
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
                        <article
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <a
                                href={`/recetas-costos?insumo=${item.id}`}
                                className="block truncate text-sm font-bold text-slate-950 hover:text-emerald-700 hover:underline"
                              >
                                {item.nombre}
                              </a>
                              <p className="mt-1 text-xs text-slate-500">
                                Formato: {item.cantidad_formato_compra ?? 1}{" "}
                                {item.unidad_formato_compra ?? unidadStock} ·{" "}
                                {money(Number(item.precio_referencia ?? 0))}
                              </p>
                            </div>
                            <StatusBadge status={estadoInsumo(item)} />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <p className="text-xs text-slate-500">Stock físico</p>
                              <p className="font-bold text-slate-900">
                                {quantity(stock)} {unidadStock}
                              </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <p className="text-xs text-slate-500">Mínimo</p>
                              <p className="font-bold text-slate-900">
                                {quantity(minimo)} {unidadStock}
                              </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <p className="text-xs text-slate-500">Costo receta</p>
                              <p className="font-bold text-slate-900">
                                ${unitMoney(Number(item.costo_unitario_uso ?? 0))} /{" "}
                                {item.unidad_uso ?? unidadStock}
                              </p>
                            </div>
                            <div className="rounded-lg bg-slate-900 px-3 py-2 text-white">
                              <p className="text-xs text-slate-300">Valor stock</p>
                              <p className="font-bold">{money(valorInsumo(item))}</p>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>

                <div className="mt-6 hidden max-h-[70vh] overflow-auto rounded-xl border border-slate-200 md:block">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="sticky top-0 z-20 bg-slate-100 text-left text-xs font-bold uppercase text-slate-500 shadow-sm">
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
                                {quantity(stock)} {unidadStock}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {quantity(minimo)} {unidadStock}
                              </td>
                              <td className="px-4 py-3 text-right">
                                ${unitMoney(Number(item.costo_unitario_uso ?? 0))} /{" "}
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
                </>
              )}
            </details>

            <details
              open={abrirExistencias}
              id="existencias"
              className="group mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6"
            >
              <summary className="cursor-pointer list-none">
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
                <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                  <span className="hidden group-open:inline">Contraer</span>
                  <span className="group-open:hidden">Expandir</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 group-open:hidden sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-500">Ítems</p>
                    <p className="text-lg font-bold text-slate-900">
                      {totalItems}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 px-4 py-3">
                    <p className="text-xs text-red-700">Críticos</p>
                    <p className="text-lg font-bold text-red-700">
                      {criticalItems}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-4 py-3">
                    <p className="text-xs text-amber-700">Sobre stock</p>
                    <p className="text-lg font-bold text-amber-700">
                      {overstockItems}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-4 py-3">
                    <p className="text-xs text-emerald-700">Normales</p>
                    <p className="text-lg font-bold text-emerald-800">
                      {normalItems}
                    </p>
                  </div>
                </div>
              </summary>

              <AutoSubmitForm
                action="/inventario#existencias"
                className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_240px_180px_180px_auto]"
              >
                <input type="hidden" name="val_q" value={busquedaValorizado} />
                <input
                  type="hidden"
                  name="val_familia"
                  value={filtroFamiliaValorizado}
                />

                <div>
                  <input
                    name="ex_q"
                    list="inventario-existencias-sugerencias"
                    defaultValue={busquedaExistencias}
                    placeholder="Buscar producto..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  />
                  <datalist id="inventario-existencias-sugerencias">
                    {sugerenciasExistencias.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <select
                    name="ex_categoria"
                    defaultValue={filtroCategoriaExistencias}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  >
                    <option value="">Todas las familias</option>
                    {categoriaExistenciasOpciones.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    name="ex_tipo"
                    defaultValue={filtroTipoExistencias}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  >
                    <option value="">Todos</option>
                    <option value="Insumo">Insumo</option>
                    <option value="Subproducto">Subproducto</option>
                    <option value="Producto final">Producto final</option>
                  </select>
                </div>

                <div>
                  <select
                    name="ex_estado"
                    defaultValue={filtroEstadoExistencias}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  >
                    <option value="">Todos</option>
                    <option value="critical">Crítico</option>
                    <option value="normal">Normal</option>
                    <option value="overstock">Sobre stock</option>
                  </select>
                </div>

                {hayFiltroExistencias ? (
                  <a
                    href={`/inventario?val_q=${encodeURIComponent(
                      busquedaValorizado
                    )}&val_familia=${encodeURIComponent(
                      filtroFamiliaValorizado
                    )}#existencias`}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Limpiar
                  </a>
                ) : null}
              </AutoSubmitForm>

              {insumosError ? (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Error al cargar inventario: {insumosError.message}
                </div>
              ) : (
                <>
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                  Para inventario físico registra el total real en la unidad de
                  la fila. Ejemplo: si dice kg, pesa y escribe kilos totales
                  como 2,5; si dice un, cuenta unidades. Los envases, cajas y
                  formatos de compra se registran en Compras.
                </div>

                <div className="mt-5 grid gap-3 md:hidden">
                  {productosFiltrados.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No hay existencias para esta búsqueda.
                    </div>
                  ) : (
                    productosFiltrados.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <a
                              href={`/nuevo-item?id=${item.id}`}
                              className="block truncate text-sm font-bold text-slate-950 underline-offset-4 hover:text-emerald-700 hover:underline"
                            >
                              {item.nombre}
                            </a>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.tipo} · {item.categoria}
                            </p>
                          </div>
                          <StatusBadge status={item.estado} />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="text-xs text-slate-500">Actual</p>
                            <p className="font-bold text-slate-900">
                              {quantity(item.stock_actual)} {item.unidad ?? ""}
                            </p>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="text-xs text-slate-500">Mínimo</p>
                            <p className="font-bold text-slate-900">
                              {quantity(item.stock_minimo)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="text-xs text-slate-500">Máximo</p>
                            <p className="font-bold text-slate-900">
                              {quantity(item.stock_maximo)}
                            </p>
                          </div>
                        </div>

                        <form action={ajustarStockProducto} className="mt-4 grid gap-2">
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="accion" value="fijar" />
                          <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            Conteo físico real
                          </label>
                          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-emerald-400">
                            <input
                              name="stock_real"
                              type="text"
                              inputMode="decimal"
                              placeholder="Ej: 2,5"
                              className="min-w-0 flex-1 border-0 bg-white px-3 py-3 text-right text-sm text-slate-900 outline-none"
                            />
                            <span className="border-l border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600">
                              {item.unidad ?? "-"}
                            </span>
                          </div>
                          <button
                            type="submit"
                            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            Guardar conteo
                          </button>
                        </form>
                      </article>
                    ))
                  )}
                </div>

                <div className="mt-6 hidden max-h-[70vh] overflow-auto rounded-xl border border-slate-200 md:block">
                  <table className="min-w-[1120px] w-full border-separate border-spacing-y-2">
                    <thead className="sticky top-0 z-20 bg-white shadow-sm">
                      <tr className="text-left text-sm text-slate-500">
                        <th className="px-4 py-2">Nombre</th>
                        <th className="px-4 py-2">Tipo</th>
                        <th className="px-4 py-2">Categoría</th>
                        <th className="px-4 py-2 text-right">Stock actual</th>
                        <th className="px-4 py-2">Mínimo</th>
                        <th className="px-4 py-2">Máximo</th>
                        <th className="px-4 py-2">Unidad</th>
                        <th className="px-4 py-2">Estado</th>
                        <th className="px-4 py-2 text-right">Conteo físico real</th>
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
                            {quantity(item.stock_actual)} {item.unidad ?? ""}
                          </td>
                          <td className="px-4 py-4">{quantity(item.stock_minimo)}</td>
                          <td className="px-4 py-4">{quantity(item.stock_maximo)}</td>
                          <td className="px-4 py-4">{item.unidad ?? "-"}</td>
                          <td className="px-4 py-4">
                            <StatusBadge status={item.estado} />
                          </td>
                          <td className="rounded-r-2xl px-4 py-4">
                            <div className="flex flex-col items-end gap-2">
                              <p className="text-xs font-semibold text-slate-500">
                                Registrar en {item.unidad ?? "unidad base"}
                              </p>
                              <form
                                action={ajustarStockProducto}
                                className="flex items-center justify-end gap-2"
                              >
                                <input type="hidden" name="id" value={item.id} />
                                <input type="hidden" name="accion" value="fijar" />
                                <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-emerald-400">
                                  <input
                                    name="stock_real"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Stock real"
                                    className="w-28 border-0 bg-white px-3 py-2 text-right text-sm text-slate-900 outline-none"
                                  />
                                  <span className="border-l border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
                                    {item.unidad ?? "-"}
                                  </span>
                                </div>
                                <button
                                  type="submit"
                                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                >
                                  Guardar
                                </button>
                              </form>
                              <p className="max-w-56 text-right text-xs leading-5 text-slate-500">
                                Escribe el total contado, no la cantidad de
                                envases.
                              </p>
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
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}
