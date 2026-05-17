"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/emporio/sidebar";
import { createClient } from "@/lib/supabase-browser";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

type Item = { id: string; nombre: string };

type Insumo = {
  id: string;
  nombre: string;
  unidad_uso: string | null;
  costo_unitario_uso: number | null;
  unidad_compra: string | null;
  costo_compra: number | null;
  familia_id: string | null;
  precio_referencia: number | null;
  unidad_referencia: string | null;
  cantidad_formato_compra: number | null;
  unidad_formato_compra: string | null;
  stock_actual: number | null;
  stock_minimo: number | null;
};

type Receta = {
  id: string;
  nombre: string;
  categoria: string;
  tipo_receta_id: string | null;
  familia_receta_id: string | null;
  porciones: number;
  merma_porcentaje: number;
  tiempo_minutos: number;
  precio_venta_actual: number;
  costo_total_calculado: number | null;
  costo_unitario_calculado: number | null;
  margen_actual_porcentaje: number | null;
  precio_sugerido: number | null;
  tipo_produccion: string | null;
  unidad_rinde: string | null;
};

type DetalleDB = {
  id: string;
  receta_id: string;
  tipo_item: "insumo" | "subreceta";
  insumo_id: string | null;
  subreceta_id: string | null;
  cantidad_uso: number;
  unidad_uso: string;
};

type Linea = {
  tipo_item: "insumo" | "subreceta";
  item_id: string;
  cantidad_uso: string;
  unidad_uso: string;
};

type VistaModulo = "inicio" | "recetas" | "costos" | "insumos" | "produccion";
type FiltroEstadoReceta =
  | "todas"
  | "sin_costo"
  | "uso_interno"
  | "margen_bajo"
  | "subrecetas";

function money(v: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function Label({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {title}
      </label>
      {children}
    </div>
  );
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

function factorConversion(unidadReferencia: string, unidadUso: string) {
  const ref = normalizarUnidad(unidadReferencia);
  const uso = normalizarUnidad(unidadUso);

  if (ref === "kg" && uso === "grs") return 1000;
  if (ref === "litros" && uso === "ml") return 1000;
  if (ref === uso) return 1;

  throw new Error(
    `Conversión no válida: ${unidadReferencia} → ${unidadUso}. Usa kg→grs, litros→ml o unidades iguales.`
  );
}

function factorCantidad(desde: string, hacia: string) {
  const from = normalizarUnidad(desde);
  const to = normalizarUnidad(hacia);

  if (from === to) return 1;

  if (from === "kg" && to === "grs") return 1000;
  if (from === "grs" && to === "kg") return 1 / 1000;

  if (from === "litros" && to === "ml") return 1000;
  if (from === "ml" && to === "litros") return 1 / 1000;

  console.warn("Conversión de cantidad no soportada:", from, to);
  return 1;
}

function convertirCantidad(cantidad: number, desde: string, hacia: string) {
  return cantidad * factorCantidad(desde, hacia);
}

function RecetasCostosContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [tipos, setTipos] = useState<Item[]>([]);
  const [familias, setFamilias] = useState<Item[]>([]);
  const [familiasInsumos, setFamiliasInsumos] = useState<Item[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [subrecetas, setSubrecetas] = useState<Receta[]>([]);
  const [detalleDB, setDetalleDB] = useState<DetalleDB[]>([]);

  const [vistaModulo, setVistaModulo] = useState<VistaModulo>("inicio");

  const [recetaEditandoId, setRecetaEditandoId] = useState("");
  const [recetaVistaId, setRecetaVistaId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [familiaId, setFamiliaId] = useState("");
  const [nombre, setNombre] = useState("");
  const [porciones, setPorciones] = useState("1");
  const [unidadRinde, setUnidadRinde] = useState("grs");
  const [precioVenta, setPrecioVenta] = useState("0");
  const [merma, setMerma] = useState("0");
  const [tiempo, setTiempo] = useState("0");
  const [tipoProduccion, setTipoProduccion] = useState("minuta");

  const [lineas, setLineas] = useState<Linea[]>([
    { tipo_item: "insumo", item_id: "", cantidad_uso: "", unidad_uso: "" },
  ]);

  const [insumoEditandoId, setInsumoEditandoId] = useState("");
  const [nuevoInsumoNombre, setNuevoInsumoNombre] = useState("");
  const [nuevoInsumoFamiliaId, setNuevoInsumoFamiliaId] = useState("");
  const [nuevoPrecioReferencia, setNuevoPrecioReferencia] = useState("");
  const [nuevoUnidadReferencia, setNuevoUnidadReferencia] = useState("kg");
  const [nuevoCantidadFormato, setNuevoCantidadFormato] = useState("1");
  const [nuevoUnidadFormato, setNuevoUnidadFormato] = useState("kg");
  const [nuevoUnidadUso, setNuevoUnidadUso] = useState("grs");
  const [nuevoStockFormatos, setNuevoStockFormatos] = useState("0");
  const [nuevoStockMinimo, setNuevoStockMinimo] = useState("0");

  const [produccionRecetaId, setProduccionRecetaId] = useState("");
  const [cantidadProducida, setCantidadProducida] = useState("");
  const [observacionProduccion, setObservacionProduccion] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardandoInsumo, setGuardandoInsumo] = useState(false);
  const [busquedaInsumo, setBusquedaInsumo] = useState("");
  const [filtroFamilia, setFiltroFamilia] = useState("");
  const [filtroFamiliaReceta, setFiltroFamiliaReceta] = useState("");
  const [busquedaReceta, setBusquedaReceta] = useState("");
  const [filtroEstadoReceta, setFiltroEstadoReceta] =
    useState<FiltroEstadoReceta>("todas");
  const [mostrarFormularioReceta, setMostrarFormularioReceta] = useState(false);
  const [mostrarFormularioInsumo, setMostrarFormularioInsumo] = useState(false);
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [importandoExcel, setImportandoExcel] = useState(false);

  async function cargar() {
    const [
      tiposRes,
      familiasRes,
      familiasInsumosRes,
      insumosRes,
      recetasRes,
      detalleRes,
    ] = await Promise.all([
      supabase.from("tipos_receta").select("id,nombre").eq("activo", true),
      supabase.from("familias_recetas").select("id,nombre").eq("activo", true),
      supabase
        .from("familias_productos")
        .select("id,nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("insumos_costeo")
        .select(
          "id,nombre,unidad_uso,costo_unitario_uso,unidad_compra,costo_compra,familia_id,precio_referencia,unidad_referencia,cantidad_formato_compra,unidad_formato_compra,stock_actual,stock_minimo"
        )
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("recetas")
        .select(
"id,nombre,categoria,tipo_receta_id,familia_receta_id,porciones,merma_porcentaje,tiempo_minutos,precio_venta_actual,costo_total_calculado,costo_unitario_calculado,margen_actual_porcentaje,precio_sugerido,tipo_produccion,unidad_rinde"        )
        .eq("activo", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("receta_detalle")
        .select(
          "id,receta_id,tipo_item,insumo_id,subreceta_id,cantidad_uso,unidad_uso"
        ),
    ]);

    const recetasData = (recetasRes.data ?? []) as Receta[];

    setTipos((tiposRes.data ?? []) as Item[]);
    setFamilias((familiasRes.data ?? []) as Item[]);
    setFamiliasInsumos((familiasInsumosRes.data ?? []) as Item[]);
    setInsumos((insumosRes.data ?? []) as Insumo[]);
    setRecetas(recetasData);
    setSubrecetas(recetasData.filter((r) => r.categoria === "Subreceta"));
    setDetalleDB((detalleRes.data ?? []) as DetalleDB[]);
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");

    if (!id || recetas.length === 0) return;
    if (recetaEditandoId === id) return;

    cargarRecetaParaEditar(id);
    setVistaModulo("recetas");
  }, [searchParams, recetas, recetaEditandoId]);

  function getInsumo(id: string) {
    return insumos.find((x) => x.id === id);
  }

  function getFamiliaInsumo(id: string | null) {
    return familiasInsumos.find((x) => x.id === id)?.nombre ?? "-";
  }

  function getSubreceta(id: string) {
    return subrecetas.find((x) => x.id === id);
  }
async function crearFamiliaRecetaRapida() {
  const nombre = prompt("Nombre de la nueva familia de producto:");

  if (!nombre || !nombre.trim()) return;

  const { data, error } = await supabase
    .from("familias_recetas")
    .insert([{ nombre: nombre.trim(), activo: true }])
    .select("id,nombre")
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  setFamilias((prev) => [...prev, data as Item]);
  setFamiliaId(data.id);
}

async function crearTipoRecetaRapido() {
  const nombre = prompt("Nombre del tipo de receta:");

  if (!nombre || !nombre.trim()) return;

  const { data, error } = await supabase
    .from("tipos_receta")
    .insert([{ nombre: nombre.trim(), activo: true }])
    .select("id,nombre")
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  setTipos((prev) => [...prev, data as Item]);
  setTipoId(data.id);
}
  function limpiarFormulario() {
    setRecetaEditandoId("");
    setTipoId("");
    setFamiliaId("");
    setNombre("");
    setPorciones("1");
    setPrecioVenta("0");
    setMerma("0");
    setTiempo("0");
    setTipoProduccion("minuta");
    setLineas([
      { tipo_item: "insumo", item_id: "", cantidad_uso: "", unidad_uso: "" },
    ]);
    setMostrarFormularioReceta(false);
  }

  function cargarRecetaParaEditar(id: string) {
    const receta = recetas.find((r) => r.id === id);
    if (!receta) return;

    const detalles = detalleDB.filter((d) => d.receta_id === id);

    setRecetaEditandoId(id);
    setRecetaVistaId("");
    setTipoId(receta.tipo_receta_id ?? "");
    setFamiliaId(receta.familia_receta_id ?? "");
    setNombre(receta.nombre);
    setPorciones(String(receta.porciones ?? 1));
    setPrecioVenta(String(receta.precio_venta_actual ?? 0));
    setMerma(String(receta.merma_porcentaje ?? 0));
    setTiempo(String(receta.tiempo_minutos ?? 0));
    setTipoProduccion(receta.tipo_produccion ?? "minuta");

    setLineas(
      detalles.length > 0
        ? detalles.map((d) => ({
            tipo_item: d.tipo_item ?? "insumo",
            item_id:
              d.tipo_item === "subreceta"
                ? d.subreceta_id ?? ""
                : d.insumo_id ?? "",
            cantidad_uso: String(d.cantidad_uso ?? ""),
            unidad_uso: d.unidad_uso ?? "",
          }))
        : [
            {
              tipo_item: "insumo",
              item_id: "",
              cantidad_uso: "",
              unidad_uso: "",
            },
          ]
    );
  }

  function addLinea() {
    setLineas([
      ...lineas,
      { tipo_item: "insumo", item_id: "", cantidad_uso: "", unidad_uso: "" },
    ]);
  }

  function removeLinea(index: number) {
    if (lineas.length === 1) return;
    setLineas(lineas.filter((_, i) => i !== index));
  }

  function changeLinea(index: number, campo: keyof Linea, valor: string) {
    const nuevas = [...lineas];
    nuevas[index] = { ...nuevas[index], [campo]: valor };

    if (campo === "tipo_item") {
      nuevas[index].item_id = "";
      nuevas[index].unidad_uso = "";
    }

    if (campo === "item_id") {
      if (nuevas[index].tipo_item === "insumo") {
        nuevas[index].unidad_uso = getInsumo(valor)?.unidad_uso ?? "";
      } else {
        nuevas[index].unidad_uso = "un";
      }
    }

if (campo === "unidad_uso") {
  const unidadAnterior = lineas[index].unidad_uso;
  const unidadNueva = valor;
  const cantidadActual = Number(lineas[index].cantidad_uso || 0);

  if (unidadAnterior && unidadNueva && cantidadActual > 0) {
    nuevas[index].cantidad_uso = String(
      convertirCantidad(cantidadActual, unidadAnterior, unidadNueva)
    );
  }
}

    setLineas(nuevas);
  }

function costoLinea(linea: Linea) {
  const cantidad = Number(linea.cantidad_uso || 0);

  if (linea.tipo_item === "insumo") {
    const insumo = getInsumo(linea.item_id);

    if (!insumo) return 0;

    const unidadBase =
      insumo.unidad_uso ?? linea.unidad_uso;

    const cantidadConvertida =
      convertirCantidad(
        cantidad,
        linea.unidad_uso,
        unidadBase
      );

    const costoUnitario = Number(
      insumo.costo_unitario_uso ?? 0
    );

    return costoUnitario * cantidadConvertida;
  }

  const sub = getSubreceta(linea.item_id);

  if (!sub) return 0;

const unidadRinde = sub.unidad_rinde ?? "un";

const cantidadConvertida = convertirCantidad(
  cantidad,
  linea.unidad_uso,
  unidadRinde
);

const detallesSubreceta = detalleDB.filter(
  (d) => d.receta_id === sub.id
);

const costoTotalSubreceta = detallesSubreceta.reduce(
  (sum, detalle) => sum + costoDetalleVista(detalle),
  0
);

const rindeSubreceta = Number(sub.porciones || 1);

const costoUnitarioSubreceta =
  rindeSubreceta > 0
    ? costoTotalSubreceta / rindeSubreceta
    : costoTotalSubreceta;

return costoUnitarioSubreceta * cantidadConvertida;
}

async function recalcularReceta(
  recetaId: string,
  silencioso = false
) {  
  const receta = recetas.find((r) => r.id === recetaId);

  if (!receta) {
    alert("Receta no encontrada");
    return;
  }

  const detalles = detalleDB.filter((d) => d.receta_id === recetaId);

  const costoTotal = detalles.reduce(
    (acc, detalle) => acc + costoDetalleVista(detalle),
    0
  );

  const rinde = Number(receta.porciones || 1);
  const costoUnitario = rinde > 0 ? costoTotal / rinde : costoTotal;

  const precioVenta = Number(receta.precio_venta_actual || 0);

  const margen =
    precioVenta > 0
      ? ((precioVenta - costoUnitario) / precioVenta) * 100
      : 0;

  const precioSugerido = costoUnitario > 0 ? costoUnitario / 0.3 : 0;

  const { error } = await supabase
    .from("recetas")
    .update({
      costo_total_calculado: costoTotal,
      costo_unitario_calculado: costoUnitario,
      margen_actual_porcentaje: margen,
      precio_sugerido: precioSugerido,
    })
    .eq("id", recetaId);

  if (error) {
    alert(error.message);
    return;
  }

 const nuevasRecetas = recetas.map((r) => {
  if (r.id !== recetaId) return r;

  return {
    ...r,
    costo_total_calculado: costoTotal,
    costo_unitario_calculado: costoUnitario,
    margen_actual_porcentaje: margen,
    precio_sugerido: precioSugerido,
  };
});

setRecetas(nuevasRecetas);

if (!silencioso) {
  alert(
    `Costos actualizados. Total: ${money(costoTotal)} / Unidad: ${money(
      costoUnitario
    )}`
  );
}
}

async function actualizarCostosMasivo() {
  const confirmar = confirm(
    "¿Actualizar costos de todas las recetas activas? Esto recalculará costos, margen y precio sugerido."
  );

  if (!confirmar) return;

  try {
    setMensaje("Actualizando costos...");

const subrecetasPrimero = recetas.filter(
  (r) => r.categoria === "Subreceta"
);

const recetasFinales = recetas.filter(
  (r) => r.categoria !== "Subreceta"
);

for (const receta of subrecetasPrimero) {
  await recalcularReceta(receta.id, true);
}

await cargar();

for (const receta of recetasFinales) {
  await recalcularReceta(receta.id, true);
}

    await cargar();

    setMensaje("✅ Costos actualizados correctamente.");
    alert("Costos actualizados correctamente.");
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al actualizar costos.";

    setMensaje(mensaje);
    alert(mensaje);
  }
}


  const resumen = useMemo(() => {
    const base = lineas.reduce((sum, linea) => sum + costoLinea(linea), 0);

    const mermaNumero = Number(merma || 0);
    const ajustado =
      mermaNumero > 0 && mermaNumero < 100
        ? base / (1 - mermaNumero / 100)
        : base;

    const rinde = Number(porciones || 1);
    const unidad = rinde > 0 ? ajustado / rinde : 0;

    const venta = Number(precioVenta || 0);
    const margen = venta - unidad;
    const margenPct = venta > 0 ? (margen / venta) * 100 : 0;

    const sugerido = unidad / 0.3;

    return { base, ajustado, unidad, margen, margenPct, sugerido };
  }, [lineas, merma, porciones, precioVenta, insumos, subrecetas]);

  const insumosFiltrados = insumos.filter((item) => {
    const coincideNombre = item.nombre
      .toLowerCase()
      .includes(busquedaInsumo.toLowerCase());

    const coincideFamilia =
      !filtroFamilia || item.familia_id === filtroFamilia;

    return coincideNombre && coincideFamilia;
  });

  const insumosBajoMinimo = insumos.filter(
    (item) =>
      Number(item.stock_minimo ?? 0) > 0 &&
      Number(item.stock_actual ?? 0) <= Number(item.stock_minimo ?? 0)
  );
  const insumosSinCosto = insumos.filter(
    (item) => Number(item.costo_unitario_uso ?? 0) <= 0
  );
  const valorStockInsumos = insumos.reduce(
    (total, item) =>
      total +
      Number(item.stock_actual ?? 0) *
        Number(item.costo_unitario_uso ?? 0),
    0
  );
  const alertasInsumos = [...insumosBajoMinimo, ...insumosSinCosto]
    .filter(
      (item, index, list) =>
        list.findIndex((x) => x.id === item.id) === index
    )
    .slice(0, 5);

  const precioFormatoPreview = Number(nuevoPrecioReferencia || 0);
  const cantidadFormatoPreview = Number(nuevoCantidadFormato || 0);
  const stockFormatosPreview = Number(nuevoStockFormatos || 0);
  let costoUsoPreview = 0;

  if (precioFormatoPreview > 0 && cantidadFormatoPreview > 0) {
    try {
      const factorPreview = factorConversion(nuevoUnidadFormato, nuevoUnidadUso);
      costoUsoPreview =
        precioFormatoPreview / (cantidadFormatoPreview * factorPreview);
    } catch {
      costoUsoPreview = 0;
    }
  }

  const stockActualPreview =
    cantidadFormatoPreview > 0 && stockFormatosPreview > 0
      ? cantidadFormatoPreview * stockFormatosPreview
      : 0;

  const recetaVista = recetaVistaId
    ? recetas.find((receta) => receta.id === recetaVistaId)
    : null;

  const detallesRecetaVista = recetaVista
    ? detalleDB.filter((detalle) => detalle.receta_id === recetaVista.id)
    : [];
    
function costoDetalleVista(d: DetalleDB): number {
  const cantidad = Number(d.cantidad_uso || 0);

  if (d.tipo_item === "insumo") {
    const insumo = getInsumo(d.insumo_id ?? "");
    if (!insumo) return 0;

    const cantidadConvertida = convertirCantidad(
      cantidad,
      d.unidad_uso,
      insumo.unidad_uso ?? d.unidad_uso
    );

    return Number(insumo.costo_unitario_uso ?? 0) * cantidadConvertida;
  }

  const sub = getSubreceta(d.subreceta_id ?? "");
  if (!sub) return 0;

  const detallesSubreceta = detalleDB.filter(
    (detalle) => detalle.receta_id === sub.id
  );

  let costoTotalSubreceta = 0;

  for (const detalle of detallesSubreceta) {
    costoTotalSubreceta += costoDetalleVista(detalle);
  }

  const rindeSubreceta = Number(sub.porciones || 1);
  const costoUnitarioSub =
    rindeSubreceta > 0 ? costoTotalSubreceta / rindeSubreceta : costoTotalSubreceta;

  const cantidadConvertida = convertirCantidad(
    cantidad,
    d.unidad_uso,
    sub.unidad_rinde ?? "un"
  );

  return costoUnitarioSub * cantidadConvertida;
}

const totalRecetaVista = detallesRecetaVista.reduce(
  (acc, d) => acc + costoDetalleVista(d),
  0
);

  const recetasSinCosto = recetas.filter(
    (receta) => Number(receta.costo_unitario_calculado ?? 0) <= 0
  ).length;

  const recetasConMargen = recetas.filter(
    (receta) => Number(receta.margen_actual_porcentaje ?? 0) > 0
  );

  const margenPromedio = recetasConMargen.length
    ? recetasConMargen.reduce(
        (total, receta) => total + Number(receta.margen_actual_porcentaje ?? 0),
        0
      ) / recetasConMargen.length
    : 0;

  const mejoresMargenes = [...recetas]
    .filter((receta) => Number(receta.margen_actual_porcentaje ?? 0) > 0)
    .sort(
      (a, b) =>
        Number(b.margen_actual_porcentaje ?? 0) -
        Number(a.margen_actual_porcentaje ?? 0)
    )
    .slice(0, 5);

  const productosMargenCritico = [...recetas]
    .filter(
      (receta) =>
        Number(receta.precio_venta_actual ?? 0) > 0 &&
        Number(receta.margen_actual_porcentaje ?? 0) < 30
    )
    .slice(0, 5);

  function estadoReceta(receta: Receta) {
    const costo = Number(receta.costo_unitario_calculado ?? 0);
    const venta = Number(receta.precio_venta_actual ?? 0);
    const margen = venta > 0 ? ((venta - costo) / venta) * 100 : 0;

    if (costo <= 0) return "Sin costo";
    if (venta <= 0) return "Uso interno";
    if (margen < 30) return "Margen bajo";

    return "Costeada";
  }

  const recetasFiltradas = recetas.filter((receta) => {
  const coincideFamilia =
    !filtroFamiliaReceta ||
    receta.familia_receta_id === filtroFamiliaReceta;

  const coincideTexto =
    !busquedaReceta ||
    receta.nombre
      .toLowerCase()
      .includes(busquedaReceta.toLowerCase()) ||
    receta.categoria
      .toLowerCase()
      .includes(busquedaReceta.toLowerCase());

  const costo = Number(receta.costo_unitario_calculado ?? 0);
  const venta = Number(receta.precio_venta_actual ?? 0);
  const margen = venta > 0 ? ((venta - costo) / venta) * 100 : 0;
  const coincideEstado =
    filtroEstadoReceta === "todas" ||
    (filtroEstadoReceta === "sin_costo" && costo <= 0) ||
    (filtroEstadoReceta === "uso_interno" && venta <= 0) ||
    (filtroEstadoReceta === "margen_bajo" && venta > 0 && margen < 30) ||
    (filtroEstadoReceta === "subrecetas" && receta.categoria === "Subreceta");

  return coincideFamilia && coincideTexto && coincideEstado;
});

async function crearFamiliaInsumoRapida() {
  const nombre = prompt("Nombre de la nueva familia de insumo:");

  if (!nombre?.trim()) return;

  const { data, error } = await supabase
    .from("familias_productos")
    .insert([
      {
        nombre: nombre.trim(),
        activo: true,
      },
    ])
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  await cargar();

  setNuevoInsumoFamiliaId(data.id);
}

  async function guardarInsumoRapido() {
    try {
      setGuardandoInsumo(true);
      setMensaje("");

      if (!nuevoInsumoNombre.trim() || !nuevoInsumoFamiliaId) {
        throw new Error("Completa nombre y familia del insumo.");
      }

      const precio = Number(nuevoPrecioReferencia || 0);
      const cantidad = Number(nuevoCantidadFormato || 0);
      const stockFormatos = Number(nuevoStockFormatos || 0);
      const stockMinimo = Number(nuevoStockMinimo || 0);

      if (precio <= 0 || cantidad <= 0) {
        throw new Error("Precio y cantidad deben ser mayores a 0.");
      }

      const factor = factorConversion(nuevoUnidadFormato, nuevoUnidadUso);
      const costoTotal = precio;
      const cantidadTotalUso = cantidad * factor;
      const costoUnitarioUso = costoTotal / cantidadTotalUso;

      const payload = {
        nombre: nuevoInsumoNombre.trim(),
        familia_id: nuevoInsumoFamiliaId,
        categoria: null,
        precio_referencia: precio,
        unidad_referencia: nuevoUnidadFormato,
        cantidad_formato_compra: cantidad,
        unidad_formato_compra: nuevoUnidadFormato,
        costo_total_formato: costoTotal,
        unidad_uso: nuevoUnidadUso,
        factor_conversion_uso: factor,
        costo_unitario_uso: costoUnitarioUso,
        unidad_compra: nuevoUnidadFormato,
        cantidad_compra: cantidad,
        costo_compra: precio,
        stock_actual: stockFormatos * cantidad,
        stock_minimo: stockMinimo,
        activo: true,
      };

      if (insumoEditandoId) {
        const { error } = await supabase
          .from("insumos_costeo")
          .update(payload)
          .eq("id", insumoEditandoId);

        if (error) throw new Error(error.message);
        setMensaje("✅ Insumo actualizado.");
      } else {
        const { error } = await supabase.from("insumos_costeo").insert([payload]);

        if (error) throw new Error(error.message);
        setMensaje("✅ Insumo creado y disponible para usar.");
      }

      limpiarFormularioInsumo();
      await cargar();
    } catch (error) {
      const texto =
        error instanceof Error ? error.message : "Error guardando insumo.";
      setMensaje(texto);
      alert(texto);
    } finally {
      setGuardandoInsumo(false);
    }
  }

  function limpiarFormularioInsumo() {
    setInsumoEditandoId("");
    setNuevoInsumoNombre("");
    setNuevoInsumoFamiliaId("");
    setNuevoPrecioReferencia("");
    setNuevoCantidadFormato("1");
    setNuevoUnidadReferencia("kg");
    setNuevoUnidadFormato("kg");
    setNuevoUnidadUso("grs");
    setNuevoStockFormatos("0");
    setNuevoStockMinimo("0");
  }

  function cargarInsumoParaEditar(insumo: Insumo) {
    setVistaModulo("insumos");
    setMostrarFormularioInsumo(true);
    setInsumoEditandoId(insumo.id);
    setNuevoInsumoNombre(insumo.nombre);
    setNuevoInsumoFamiliaId(insumo.familia_id ?? "");
    setNuevoPrecioReferencia(String(insumo.precio_referencia ?? insumo.costo_compra ?? ""));
    setNuevoUnidadReferencia(insumo.unidad_referencia ?? insumo.unidad_compra ?? "kg");
    setNuevoCantidadFormato(String(insumo.cantidad_formato_compra ?? 1));
    setNuevoUnidadFormato(insumo.unidad_formato_compra ?? insumo.unidad_compra ?? "kg");
    setNuevoUnidadUso(insumo.unidad_uso ?? "grs");
    setNuevoStockFormatos(
      String(
        Number(insumo.cantidad_formato_compra ?? 0) > 0
          ? Number(insumo.stock_actual ?? 0) /
              Number(insumo.cantidad_formato_compra ?? 1)
          : 0
      )
    );
    setNuevoStockMinimo(String(insumo.stock_minimo ?? 0));
  }

async function eliminarInsumo(id: string) {
  const confirmar = confirm(
    "¿Seguro que quieres eliminar este insumo? Quedará inactivo y no aparecerá en la lista."
  );

  if (!confirmar) return;

  const insumo = insumos.find((item) => item.id === id);
  const nombreEliminado = `${insumo?.nombre ?? "insumo"}_eliminado_${Date.now()}`;

  const { error } = await supabase
    .from("insumos_costeo")
    .update({
      activo: false,
      nombre: nombreEliminado,
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  setMensaje("✅ Insumo eliminado.");
  limpiarFormularioInsumo();
  await cargar();
}

async function eliminarReceta(id: string) {
  const confirmar = confirm(
    "¿Seguro que quieres eliminar esta receta? Quedará inactiva y no aparecerá en la lista."
  );

  if (!confirmar) return;

  const receta = recetas.find((r) => r.id === id);

  const nombreEliminado = `${
    receta?.nombre ?? "receta"
  }_eliminada_${Date.now()}`;

  const { data, error } = await supabase
    .from("recetas")
    .update({
      activo: false,
      nombre: nombreEliminado,
    })
    .eq("id", id)
    .select("id,nombre,activo");

  if (error) {
    alert(error.message);
    return;
  }

  if (!data || data.length === 0) {
    alert("No se actualizó ninguna receta. Revisa permisos o ID.");
    return;
  }

  setRecetas((prev) => prev.filter((r) => r.id !== id));
  setSubrecetas((prev) => prev.filter((r) => r.id !== id));
  setRecetaVistaId("");
  setRecetaEditandoId("");
  setMensaje("✅ Receta eliminada.");
}

  async function guardar() {
    try {
      setGuardando(true);
      setMensaje("");

      if (!tipoId || !familiaId || !nombre.trim()) {
        throw new Error("Completa tipo, familia y nombre.");
      }

      const tipo = tipos.find((x) => x.id === tipoId);
      console.log("DEBUG GUARDAR", {
  recetaEditandoId,
  tipoId,
  tipoNombre: tipo?.nombre,
  familiaId,
  nombre,
  recetaPayloadTipo: tipoId,
});

      if (!tipo) {
  throw new Error("Selecciona un tipo de receta válido.");
}

      const validas = lineas.filter(
        (x) => x.item_id && Number(x.cantidad_uso) > 0
      );

      if (validas.length === 0) {
        throw new Error("Agrega al menos un ingrediente.");
      }

      let recetaId = recetaEditandoId;

      const recetaPayload = {
        nombre: nombre.trim(),
        categoria: tipo.nombre,
        tipo_receta_id: tipoId,
        familia_receta_id: familiaId,
        porciones: Number(porciones || 1),
        merma_porcentaje: Number(merma || 0),
        tiempo_minutos: Number(tiempo || 0),
        precio_venta_actual: Number(precioVenta || 0),
        costo_total_calculado: resumen.ajustado,
        costo_unitario_calculado: resumen.unidad,
        margen_actual_porcentaje:
          Number(precioVenta || 0) > 0
          ? ((Number(precioVenta || 0) - resumen.unidad) /
            Number(precioVenta || 0)) *
            100
            : 0,
        precio_sugerido: resumen.unidad > 0 ? resumen.unidad / 0.3 : 0,
        tipo_produccion: tipoProduccion,
        unidad_rinde: unidadRinde,
        activo: true,
      };

if (recetaId) {
  const { error } = await supabase
    .from("recetas")
    .update(recetaPayload)
    .eq("id", recetaId);

  if (error) throw new Error(error.message);

  const { data: recetaActualizada, error: readError } = await supabase
    .from("recetas")
    .select("id,nombre,precio_venta_actual,categoria,tipo_receta_id")
    .eq("id", recetaId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  console.log("RECETA LEÍDA DESPUÉS DE ACTUALIZAR:", recetaActualizada);

        const { error: deleteError } = await supabase
          .from("receta_detalle")
          .delete()
          .eq("receta_id", recetaId);

        if (deleteError) throw new Error(deleteError.message);
      } else {
        const { data: receta, error } = await supabase
          .from("recetas")
          .insert([recetaPayload])
          .select("id")
          .single();

        if (error) throw new Error(error.message);
        recetaId = receta.id;
      }

      const detalle = validas.map((x) => ({
        receta_id: recetaId,
        tipo_item: x.tipo_item,
        insumo_id: x.tipo_item === "insumo" ? x.item_id : null,
        subreceta_id: x.tipo_item === "subreceta" ? x.item_id : null,
        cantidad_uso: Number(x.cantidad_uso),
        unidad_uso: x.unidad_uso,
      }));

      const { error: detalleError } = await supabase
        .from("receta_detalle")
        .insert(detalle);

      if (detalleError) throw new Error(detalleError.message);

     setMensaje(
  recetaEditandoId ? "✅ Receta actualizada." : "✅ Receta guardada."
);

await cargar();

if (recetaId) {
  setRecetas((prev) =>
    prev.map((r) =>
      r.id === recetaId
        ? {
            ...r,
            ...recetaPayload,
            id: recetaId,
          }
        : r
    )
  );

  setSubrecetas((prev) =>
    prev.map((r) =>
      r.id === recetaId
        ? {
            ...r,
            ...recetaPayload,
            id: recetaId,
          }
        : r
    )
  );

  setRecetaVistaId(recetaId);
  setRecetaEditandoId("");
} else {
  limpiarFormulario();
}

    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function registrarProduccion() {
    try {
      setMensaje("");

      const receta = recetas.find((r) => r.id === produccionRecetaId);
      const cantidad = Number(cantidadProducida || 0);

      if (!receta || cantidad <= 0) {
        alert("Selecciona receta y cantidad producida.");
return;
      }

      const costoUnitario = Number(receta.costo_unitario_calculado ?? 0);

      // 🔥 DESCONTAR INSUMOS SEGÚN RECETA
const detalles = detalleDB.filter((d) => d.receta_id === receta.id);

for (const detalle of detalles) {
  if (detalle.tipo_item !== "insumo" || !detalle.insumo_id) continue;

  const insumo = insumos.find((i) => i.id === detalle.insumo_id);
  if (!insumo) continue;

  const cantidadReceta = Number(detalle.cantidad_uso || 0);
  const cantidadTotal = cantidadReceta * cantidad;

  // Convertir a unidad base del insumo
const ref = normalizarUnidad(insumo.unidad_referencia || "");
const uso = normalizarUnidad(detalle.unidad_uso || "");

let factor = 1;

if (ref === "kg" && uso === "grs") factor = 1 / 1000;
else if (ref === "litros" && uso === "ml") factor = 1 / 1000;
else if (ref === uso) factor = 1;
else {
  console.warn("Conversión no controlada:", ref, uso);
}

  const descuento = cantidadTotal * factor;

  const stockActual = Number(insumo.stock_actual || 0);
  const nuevoStock = stockActual - descuento;

  await supabase
    .from("insumos_costeo")
    .update({ stock_actual: nuevoStock })
    .eq("id", insumo.id);
}
      
      const { error } = await supabase.from("produccion_recetas").insert([
        {
          receta_id: receta.id,
          cantidad_producida: cantidad,
          costo_unitario_estimado: costoUnitario,
          costo_total_estimado: costoUnitario * cantidad,
          observacion: observacionProduccion || null,
        },
      ]);

      if (error) throw new Error(error.message);

      setMensaje("✅ Producción registrada.");
      setProduccionRecetaId("");
      setCantidadProducida("");
      setObservacionProduccion("");
    } catch (error) {
      setMensaje(
        error instanceof Error ? error.message : "Error al registrar producción."
      );
    }
  }

  async function descargarPlantilla() {
    const workbook = new ExcelJS.Workbook();

    const hojaInsumos = workbook.addWorksheet("Insumos");
    const hojaFamilias = workbook.addWorksheet("Familias");

    hojaInsumos.columns = [
      { header: "nombre", key: "nombre", width: 30 },
      { header: "familia", key: "familia", width: 28 },
      { header: "precio_formato", key: "precio_formato", width: 18 },
      { header: "cantidad_formato", key: "cantidad_formato", width: 18 },
      { header: "unidad_formato_compra", key: "unidad_formato_compra", width: 24 },
      { header: "unidad_uso", key: "unidad_uso", width: 14 },
      { header: "stock_actual", key: "stock_actual", width: 16 },
      { header: "stock_minimo", key: "stock_minimo", width: 16 },
    ];

    hojaFamilias.columns = [{ header: "familia", key: "familia", width: 30 }];

    familiasInsumos.forEach((familia) => {
      hojaFamilias.addRow({ familia: familia.nombre });
    });

    insumos.forEach((insumo) => {
      const familia = familiasInsumos.find((f) => f.id === insumo.familia_id);

      hojaInsumos.addRow({
        nombre: insumo.nombre,
        familia: familia?.nombre ?? "",
        precio_formato: insumo.precio_referencia ?? insumo.costo_compra ?? 0,
        cantidad_formato: insumo.cantidad_formato_compra ?? 1,
        unidad_formato_compra:
          insumo.unidad_formato_compra ?? insumo.unidad_compra ?? "kg",
        unidad_uso: insumo.unidad_uso ?? "grs",
        stock_actual: insumo.stock_actual ?? 0,
        stock_minimo: insumo.stock_minimo ?? 0,
      });
    });

    if (insumos.length === 0) {
      hojaInsumos.addRow({
        nombre: "Harina",
        familia: familiasInsumos[0]?.nombre ?? "",
        precio_formato: 17500,
        cantidad_formato: 25,
        unidad_formato_compra: "kg",
        unidad_uso: "grs",
        stock_actual: 25,
        stock_minimo: 5,
      });
    }

    const totalFamilias = familiasInsumos.length + 1;

    for (let row = 2; row <= 300; row++) {
      hojaInsumos.getCell(`B${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`Familias!$A$2:$A$${totalFamilias}`],
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "base_maestra_insumos.xlsx";
    link.click();

    URL.revokeObjectURL(url);
  }

  async function importarExcel() {
    if (!archivoExcel) {
      alert("Selecciona un archivo Excel.");
      return;
    }

    try {
      setImportandoExcel(true);

      const data = await archivoExcel.arrayBuffer();
      const workbook = XLSX.read(data);

      const hoja = workbook.Sheets[workbook.SheetNames[0]];
     const filasRaw = XLSX.utils.sheet_to_json(hoja);

const filas = filasRaw.filter((fila: any) => {
  const nombre = String(fila.nombre || "").trim();
  const familia = String(fila.familia || "").trim();

  return nombre !== "" || familia !== "";
});

      if (filas.length === 0) {
        throw new Error("El archivo está vacío.");
      }

      const payload = filas.map((fila: any) => {
        const familiaTexto = String(fila.familia || "").trim();

        const familiaEncontrada = familiasInsumos.find(
          (f) => f.nombre.trim().toLowerCase() === familiaTexto.toLowerCase()
        );

 if (!familiaTexto) {
  throw new Error(
    `La fila del insumo "${fila.nombre || "sin nombre"}" no tiene familia.`
  );
}

if (!familiaEncontrada) {
  throw new Error(`No existe la familia: ${familiaTexto}`);
}

        const precio = Number(fila.precio_formato || fila.precio_referencia || 0);
        const cantidad = Number(fila.cantidad_formato || 1);
        const unidadFormato = String(fila.unidad_formato_compra || "kg");
        const unidadUso = String(fila.unidad_uso || "grs");
        const factor = factorConversion(unidadFormato, unidadUso);
        const costoUnitarioUso = precio / (cantidad * factor);
        const stockActual = Number(fila.stock_actual || 0);
        const stockMinimo = Number(fila.stock_minimo || 0);

        return {
          nombre: String(fila.nombre || "").trim(),
          familia_id: familiaEncontrada.id,
          precio_referencia: precio,
          unidad_referencia: unidadFormato,
          cantidad_formato_compra: cantidad,
          unidad_formato_compra: unidadFormato,
          costo_total_formato: precio,
          unidad_uso: unidadUso,
          factor_conversion_uso: factor,
          costo_unitario_uso: costoUnitarioUso,
          unidad_compra: unidadFormato,
          cantidad_compra: cantidad,
          costo_compra: precio,
          stock_actual: stockActual,
          stock_minimo: stockMinimo,
          activo: true,
        };
      });

      const { error } = await supabase
        .from("insumos_costeo")
        .upsert(payload, { onConflict: "nombre" });

      if (error) throw new Error(error.message);

      alert("✅ Insumos importados correctamente.");
      setArchivoExcel(null);
      await cargar();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Error importando archivo."
      );
    } finally {
      setImportandoExcel(false);
    }
  }

  function ModuleCard({
    id,
    title,
    description,
  }: {
    id: VistaModulo;
    title: string;
    description: string;
  }) {
    const active = vistaModulo === id;

    return (
      <button
        type="button"
        onClick={() => setVistaModulo(id)}
        className={`rounded-xl border px-4 py-3 text-left shadow-sm transition-colors ${
          active
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
        }`}
      >
        <h2 className={active ? "text-sm font-bold text-white" : "text-sm font-bold text-slate-900"}>
          {title}
        </h2>
        <p className={active ? "mt-1 text-xs text-slate-300" : "mt-1 text-xs text-slate-500"}>
          {description}
        </p>
      </button>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur lg:px-6">
            <div className="mx-auto w-full max-w-[1560px]">
              <p className="text-sm text-slate-500">Emporio Flow</p>
              <h1 className="text-2xl font-bold text-slate-900">
                Recetas y costos
              </h1>
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-[1560px] gap-3 px-4 py-4 lg:grid-cols-3 lg:px-6">
            <ModuleCard
              id="recetas"
              title="Recetas"
              description="Crear, ver y editar recetas"
            />
            <ModuleCard
              id="costos"
              title="Costos"
              description="Márgenes, alertas y precios sugeridos"
            />
            <ModuleCard
              id="insumos"
              title="Insumos maestros"
              description="Base maestra, Excel y edición"
            />

          </div>

          {vistaModulo === "inicio" ? (
            <div className="mx-auto w-full max-w-[1560px] px-4 pb-6 lg:px-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Centro de control de rentabilidad
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Lectura rápida de recetas, costos, insumos y alertas operativas.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium text-slate-500">
                        Recetas activas
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {recetas.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <p className="text-xs font-medium text-emerald-700">
                        Margen promedio
                      </p>
                      <p className="mt-1 text-2xl font-bold text-emerald-800">
                        {margenPromedio.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                      <p className="text-xs font-medium text-red-700">
                        Insumos bajo mínimo
                      </p>
                      <p className="mt-1 text-2xl font-bold text-red-700">
                        {insumosBajoMinimo.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium text-slate-500">
                        Stock valorizado
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {money(valorStockInsumos)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">
                    Focos de revisión
                  </h3>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setVistaModulo("recetas")}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <p className="text-sm font-bold text-slate-900">
                        Recetas sin costo
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {recetasSinCosto}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVistaModulo("costos")}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <p className="text-sm font-bold text-slate-900">
                        Margen crítico
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {productosMargenCritico.length}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVistaModulo("insumos")}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <p className="text-sm font-bold text-slate-900">
                        Insumos sin costo
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {insumosSinCosto.length}
                      </p>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">
                    Alertas rápidas
                  </h3>
                  <div className="mt-4 space-y-3">
                    {alertasInsumos.length === 0 &&
                    productosMargenCritico.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        No hay alertas críticas por ahora.
                      </p>
                    ) : (
                      <>
                        {productosMargenCritico.slice(0, 2).map((receta) => (
                          <div
                            key={receta.id}
                            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                          >
                            {receta.nombre}: margen{" "}
                            {Number(
                              receta.margen_actual_porcentaje ?? 0
                            ).toFixed(1)}
                            %
                          </div>
                        ))}
                        {alertasInsumos.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700"
                          >
                            {item.nombre}: revisar stock o costo.
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {vistaModulo === "costos" ? (
            <div className="mx-auto grid w-full max-w-[1560px] gap-5 px-4 pb-6 lg:px-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm xl:col-span-3">
  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 className="text-lg font-bold text-emerald-900">
        Actualizar costos
      </h2>

      <p className="mt-1 text-sm text-emerald-700">
        Recalcula todas las recetas activas usando los precios actuales de insumos y subrecetas.
      </p>
    </div>

    <button
      type="button"
      onClick={actualizarCostosMasivo}
      className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
    >
      Actualizar costos masivo
    </button>
  </div>
</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Recetas activas</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {recetas.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Margen promedio</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {margenPromedio.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Recetas sin costo</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {recetasSinCosto}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Productos con mejor margen
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Ranking por utilidad y margen actual.
                    </p>
                  </div>
                </div>
               <div className="erp-scroll mt-4 max-h-[520px] overflow-y-auto rounded-xl border border-slate-200">
  <div className="sticky top-0 z-10 grid grid-cols-[minmax(180px,1fr)_90px_90px_100px_82px] gap-3 bg-slate-100 px-3 py-3 text-xs font-bold uppercase text-slate-500">
    <div>Producto</div>
    <div className="text-right">Costo</div>
    <div className="text-right">Venta</div>
    <div className="text-right">Utilidad</div>
    <div className="text-right">Margen</div>
  </div>

  {mejoresMargenes.length === 0 ? (
    <div className="px-4 py-4 text-sm text-slate-500">
      Aún no hay productos con margen calculado.
    </div>
  ) : (
    mejoresMargenes.map((receta) => {
      const costo = Number(receta.costo_unitario_calculado ?? 0);
      const venta = Number(receta.precio_venta_actual ?? 0);
      const utilidad = venta - costo;
      const margen = venta > 0 ? (utilidad / venta) * 100 : 0;

      return (
        <div
          key={receta.id}
          className="grid grid-cols-[minmax(180px,1fr)_90px_90px_100px_82px] items-center gap-3 border-t border-slate-200 bg-white px-3 py-3 text-sm hover:bg-slate-50"
        >
          <div className="min-w-0">
            <button
  type="button"
  onClick={() => {
    setRecetaVistaId(receta.id);
    setVistaModulo("recetas");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  className="max-w-full truncate text-left font-semibold text-slate-900 hover:text-emerald-700 hover:underline"
>
  {receta.nombre}
</button>
            <p className="text-xs text-slate-500">{receta.categoria}</p>
          </div>

          <div className="text-right font-medium text-slate-700">
            {money(costo)}
          </div>

          <div className="text-right font-medium text-slate-700">
            {money(venta)}
          </div>

          <div
            className={`text-right font-semibold ${
              utilidad >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {money(utilidad)}
          </div>

          <div className="text-right">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                margen >= 60
                  ? "bg-emerald-50 text-emerald-700"
                  : margen >= 30
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {margen.toFixed(1)}%
            </span>
          </div>
        </div>
      );
    })
  )}
</div>
      </div>

              <div className="self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Margen crítico
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Productos con precio de venta y margen menor a 30%.
                </p>
                <div className="mt-4 space-y-3">
                  {productosMargenCritico.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No hay alertas críticas por ahora.
                    </p>
                  ) : (
                    productosMargenCritico.map((receta) => (
                      <div
                        key={receta.id}
                        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                      >
                        {receta.nombre} · {Number(receta.margen_actual_porcentaje ?? 0).toFixed(1)}%
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {vistaModulo === "recetas" ? (
            <div
              className={`mx-auto grid w-full max-w-[1560px] gap-6 px-4 pb-6 lg:px-6 ${
                mostrarFormularioReceta || recetaEditandoId
                  ? "xl:grid-cols-[minmax(0,1fr)_340px]"
                  : "xl:grid-cols-1"
              }`}
            >
              <div className="space-y-6">
                {recetaVista ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Vista receta</p>
                        <h2 className="text-2xl font-bold text-slate-900">
                          {recetaVista.nombre}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                       {recetaVista.categoria} · Costo unidad:{" "}
                       {money(
                        Number(recetaVista.porciones ?? 1) > 0
                         ? totalRecetaVista / Number(recetaVista.porciones ?? 1)
                         : totalRecetaVista
                       )}{" "}
                     · Venta: {money(Number(recetaVista.precio_venta_actual ?? 0))}
                        </p>
                      </div>
                      <div className="flex gap-2">
<button
  type="button"
  onClick={() => {
    cargarRecetaParaEditar(recetaVista.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
>
  Editar receta
</button>

<button
  type="button"
onClick={async () => {
  await recalcularReceta(recetaVista.id);
}}
  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
>
  Recalcular
</button>

                        <button
                          type="button"
                          onClick={() => {
                          setRecetaVistaId("");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          Volver a lista
                        </button>
                        
                        <button
  type="button"
  onClick={() => {
    setVistaModulo("costos");
    setRecetaVistaId("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  className="rounded-xl border px-4 py-2 text-sm"
>
  Volver a costos
</button>

                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Rinde</p>
                        <p className="mt-1 font-bold">{recetaVista.porciones}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Precio venta</p>
                        <p className="mt-1 font-bold">{money(recetaVista.precio_venta_actual)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Margen</p>
                     <p className="mt-1 font-bold">
  {Number(recetaVista.precio_venta_actual ?? 0) > 0
    ? (
        ((Number(recetaVista.precio_venta_actual ?? 0) -
          (Number(recetaVista.porciones ?? 1) > 0
            ? totalRecetaVista / Number(recetaVista.porciones ?? 1)
            : totalRecetaVista)) /
          Number(recetaVista.precio_venta_actual ?? 0)) *
        100
      ).toFixed(1)
    : "0.0"}
  %
</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Precio sugerido</p>
                        <p className="mt-1 font-bold">
  {money(
    (Number(recetaVista.porciones ?? 1) > 0
      ? totalRecetaVista / Number(recetaVista.porciones ?? 1)
      : totalRecetaVista) / 0.3
  )}
</p>
                      </div>
                    </div>

                    <div className="erp-scroll mt-5 max-h-[420px] overflow-y-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2 text-right">Cantidad</th>
                            <th className="px-3 py-2">Unidad</th>
                            <th className="px-3 py-2 text-right">Costo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detallesRecetaVista.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-4 text-slate-500">
                                Esta receta aún no tiene ingredientes registrados.
                              </td>
                            </tr>
                          ) : (
                            detallesRecetaVista.map((detalle) => {
                              const itemNombre =
                                detalle.tipo_item === "subreceta"
                                  ? getSubreceta(detalle.subreceta_id ?? "")?.nombre
                                  : getInsumo(detalle.insumo_id ?? "")?.nombre;
                            const costoDetalle = costoDetalleVista(detalle);
                              

                              const costo =
                            detalle.tipo_item === "subreceta"
                              ? (getSubreceta(detalle.subreceta_id ?? "")?.costo_unitario_calculado || 0) *
                              detalle.cantidad_uso
                              : (getInsumo(detalle.insumo_id ?? "")?.costo_unitario_uso || 0) *
                                detalle.cantidad_uso;

                              return (
                                <tr key={detalle.id} className="border-t bg-white hover:bg-slate-50">
                                  <td className="px-3 py-2">{detalle.tipo_item}</td>
<td className="px-3 py-2">
  {detalle.tipo_item === "subreceta" ? (
    <button
      type="button"
      onClick={() => {
        if (!detalle.subreceta_id) return;

        setRecetaVistaId(detalle.subreceta_id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="font-medium text-emerald-700 hover:underline"
    >
      {itemNombre ?? "-"}
    </button>
  ) : (
    itemNombre ?? "-"
  )}
</td>   
                               <td className="px-3 py-2 text-right">{detalle.cantidad_uso}</td>
                                  <td className="px-3 py-2">{detalle.unidad_uso}</td>
                                  <td className="px-3 py-2 text-right font-semibold">
                                     {money(costoDetalle)}
                                     </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-right">
  <p className="text-sm text-slate-500">Total ingredientes</p>
  <p className="text-xl font-bold text-slate-900">
    {money(totalRecetaVista)}
  </p>
</div>
                  </div>
                ) : null}

                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-xl font-bold text-slate-900">
                      {recetaEditandoId ? "Editar receta" : "Crear receta"}
                    </h2>

                <button
  type="button"
  onClick={() => {
    if (recetaEditandoId) {
      limpiarFormulario();
    }

    setMostrarFormularioReceta((actual) => !actual);
    setRecetaEditandoId("");
  }}
  className="w-full rounded-xl border px-4 py-2 text-sm sm:w-auto"
>
  {mostrarFormularioReceta || recetaEditandoId ? "Ocultar formulario" : "Crear receta"}
</button>
                  </div>

                  <div
  className={`mt-5 grid min-w-0 gap-4 ${
    mostrarFormularioReceta || recetaEditandoId ? "" : "hidden"
  }`}
>
                    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                    <Label title="Tipo receta">
  <select
    value={tipoId}
    onChange={(e) => {
      const value = e.target.value;

      if (value === "__nuevo__") {
        crearTipoRecetaRapido();
        return;
      }

      setTipoId(value);
    }}
    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
  >
    <option value="">Seleccionar tipo</option>
    <option value="__nuevo__">+ Crear nuevo tipo</option>
    {tipos.map((x) => (
      <option key={x.id} value={x.id}>
        {x.nombre}
      </option>
    ))}
  </select>
</Label>

                      <Label title="Familia producto">
                        <select
                          value={familiaId}
                         onChange={(e) => {
                          if (e.target.value === "__nueva__") {
                            crearFamiliaRecetaRapida();
                           return;
                         }

                        setFamiliaId(e.target.value);
                      }}

                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        >
                          <option value="">Seleccionar familia</option>
                          <option value="__nueva__">+ Crear nueva familia</option>
                          {familias.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.nombre}
                            </option>
                          ))}
                        </select>
                      </Label>
                    </div>

                    <Label title="Nombre receta">
                      <input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Pizza pepperoni, disco empanada, salsa pomodoro"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </Label>

                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      <Label title="Rinde">
                        <input
                          value={porciones}
                          onChange={(e) => setPorciones(e.target.value)}
                          type="number"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </Label>

                      <Label title="Unidad rinde">
                        <select
                          value={unidadRinde}
                          onChange={(e) => setUnidadRinde(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        >
                          <option value="grs">grs</option>
                          <option value="ml">ml</option>
                          <option value="un">un</option>
                          <option value="kg">kg</option>
                          <option value="litros">litros</option>
                        </select>
                      </Label>

                      <Label title="Precio venta">
                        <input
                          value={precioVenta}
                          onChange={(e) => setPrecioVenta(e.target.value)}
                          type="number"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </Label>

                      <Label title="Merma %">
                        <input
                          value={merma}
                          onChange={(e) => setMerma(e.target.value)}
                          type="number"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </Label>

                      <Label title="Tiempo min">
                        <input
                          value={tiempo}
                          onChange={(e) => setTiempo(e.target.value)}
                          type="number"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </Label>

                      <Label title="Tipo producción">
  <select
    value={tipoProduccion}
    onChange={(e) => setTipoProduccion(e.target.value)}
    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
  >
    <option value="minuta">A la minuta</option>
    <option value="produccion">Producción anticipada</option>
    <option value="mise_en_place">Mise en place</option>
  </select>
</Label>

                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <strong>Nota:</strong> Primero crea la receta y luego agrega sus ingredientes.
                      Puedes usar insumos directos o subrecetas ya costeadas.
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Ingredientes
                      </h2>
                      <p className="text-sm text-slate-500">
                        Agrega insumos directos o subrecetas reutilizables.
                      </p>
                    </div>

                   <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:flex">
  <button
    type="button"
    onClick={() => {
      setVistaModulo("insumos");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
    className="w-full rounded-xl border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 lg:w-auto"
  >
    + Crear insumo rápido
  </button>

  <button
    type="button"
    onClick={addLinea}
    className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white lg:w-auto"
  >
    + Línea
  </button>
</div>
                  </div>

                  <div className="erp-scroll mt-5 max-h-[460px] overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead>
                        <tr className="sticky top-0 z-10 border-b bg-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                          <th className="px-3 py-3">Tipo</th>
                          <th className="px-3 py-3">Ingrediente</th>
                          <th className="px-3 py-3 text-right">Cantidad</th>
                          <th className="px-3 py-3">Unidad</th>
                          <th className="px-3 py-3 text-right">Costo línea</th>
                          <th className="px-3 py-3 text-right">Acción</th>
                        </tr>
                      </thead>

                      <tbody>
                        {lineas.map((linea, index) => (
                          <tr key={index} className="border-b bg-white last:border-b-0 hover:bg-slate-50">
                            <td className="px-3 py-3">
                              <select
                                value={linea.tipo_item}
                                onChange={(e) =>
                                  changeLinea(
                                    index,
                                    "tipo_item",
                                    e.target.value as "insumo" | "subreceta"
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              >
                                <option value="insumo">Insumo</option>
                                <option value="subreceta">Subreceta</option>
                              </select>
                            </td>

                            <td className="px-3 py-3">
                              <select
                                value={linea.item_id}
                                onChange={(e) =>
                                  changeLinea(index, "item_id", e.target.value)
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              >
                                <option value="">Seleccionar</option>
                                {linea.tipo_item === "insumo"
                                  ? insumos.map((x) => (
                                      <option key={x.id} value={x.id}>
                                        {x.nombre}
                                      </option>
                                    ))
                                  : subrecetas.map((x) => (
                                      <option key={x.id} value={x.id}>
                                        {x.nombre}
                                      </option>
                                    ))}
                              </select>
                            </td>

                            <td className="px-3 py-3">
                              <input
                                value={linea.cantidad_uso}
                                onChange={(e) =>
                                  changeLinea(
                                    index,
                                    "cantidad_uso",
                                    e.target.value
                                  )
                                }
                                type="number"
                                step="0.01"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm"
                              />
                            </td>

                            <td className="px-3 py-3">
                              <select
                                value={linea.unidad_uso}
                                onChange={(e) =>
                                  changeLinea(index, "unidad_uso", e.target.value)
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                              >
                                <option value="">Unidad</option>
                                <option value="grs">grs</option>
                                <option value="ml">ml</option>
                                <option value="un">un</option>
                                <option value="kg">kg</option>
                                <option value="litros">litros</option>
                              </select>
                            </td>

                            <td className="px-3 py-3 text-right font-semibold text-slate-900">
                              {money(costoLinea(linea))}
                            </td>

                            <td className="px-3 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => removeLinea(index)}
                                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <h2 className="text-xl font-bold text-slate-900">
                    Recetas / productos recientes
                  </h2>

<input
  type="text"
  value={busquedaReceta}
  onChange={(e) => setBusquedaReceta(e.target.value)}
  placeholder="Buscar receta, producto o subreceta..."
  className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
/>

                  <select
  value={filtroFamiliaReceta}
  onChange={(e) => setFiltroFamiliaReceta(e.target.value)}
  className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
>
  <option value="">Todas las familias</option>

  {familias.map((familia) => (
    <option key={familia.id} value={familia.id}>
      {familia.nombre}
    </option>
  ))}
</select>

                  <div className="erp-scroll mt-4 flex gap-2 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                    {[
                      ["todas", "Todas"],
                      ["sin_costo", "Sin costo"],
                      ["uso_interno", "Uso interno"],
                      ["margen_bajo", "Margen bajo"],
                      ["subrecetas", "Subrecetas"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setFiltroEstadoReceta(id as FiltroEstadoReceta)
                        }
                        className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
                          filtroEstadoReceta === id
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 max-h-[640px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {recetasFiltradas.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-slate-500">
                        Aún no hay productos creados.
                      </div>
                    ) : (
                      recetasFiltradas.map((receta) => {
                        const costo = Number(receta.costo_unitario_calculado ?? 0);
                        const venta = Number(receta.precio_venta_actual ?? 0);
                        const margen = venta > 0 ? ((venta - costo) / venta) * 100 : 0;
                        const estado = estadoReceta(receta);

                        return (
                        <div
                          key={receta.id}
                          className={`mb-3 grid gap-4 rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(90px,0.7fr))_auto] lg:items-center ${
                            estado === "Sin costo"
                              ? "bg-amber-50/60"
                              : estado === "Uso interno"
                              ? "bg-slate-50"
                              : estado === "Margen bajo"
                              ? "bg-red-50/50"
                              : "bg-white"
                          }`}
                        >
                          <div>
<button
  type="button"
  onClick={() => {
    setRecetaVistaId(receta.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  className="max-w-full truncate text-left font-semibold text-slate-900 hover:text-emerald-700 hover:underline"
>
  {receta.nombre}
</button>
                           <p className="text-xs text-slate-500">
  {receta.categoria}
</p>
                          </div>

                          <div className="grid gap-1 lg:text-right">
                            <span className="text-[11px] font-bold uppercase text-slate-400">
                              Costo
                            </span>
                            <span className="font-medium text-slate-700">
                              {money(costo)}
                            </span>
                          </div>

                          <div className="grid gap-1 lg:text-right">
                            <span className="text-[11px] font-bold uppercase text-slate-400">
                              Venta
                            </span>
                            <span className="font-medium text-slate-700">
                              {money(venta)}
                            </span>
                          </div>

                          <div className="grid gap-1 lg:text-right">
                            <span className="text-[11px] font-bold uppercase text-slate-400">
                              Margen
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                margen >= 60
                                  ? "bg-emerald-50 text-emerald-700"
                                  : margen >= 30
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {margen.toFixed(1)}%
                            </span>
                          </div>

                          <div className="grid gap-1 lg:text-right">
                            <span className="text-[11px] font-bold uppercase text-slate-400">
                              Estado
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                estado === "Costeada"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : estado === "Sin costo"
                                  ? "bg-amber-50 text-amber-700"
                                  : estado === "Uso interno"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {estado}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <button
                              type="button"
                              onClick={() => cargarRecetaParaEditar(receta.id)}
                              className="min-w-20 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                            >
                              Editar
                            </button>

                              <button
    type="button"
                              onClick={() => eliminarReceta(receta.id)}
                              className="rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
  >
    Eliminar
  </button>
                          </div>
                        </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {mostrarFormularioReceta || recetaEditandoId ? (
              <aside>
                <div className="sticky top-24 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="border-b border-slate-200 pb-3">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Resumen receta
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      Costeo actual
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">Base</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {money(resumen.base)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">Ajustado</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {money(resumen.ajustado)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">Costo unidad</p>
                      <p className="text-lg font-bold text-slate-900">
                        {money(resumen.unidad)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">Margen</p>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {money(resumen.margen)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {resumen.margenPct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-50 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-emerald-700">
                        Precio sugerido
                      </p>
                      <p className="text-lg font-bold text-emerald-800">
                        {money(resumen.sugerido)}
                      </p>
                    </div>
                  </div>

                  {mensaje ? (
                    <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {mensaje}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={guardando}
                    onClick={guardar}
                    className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {guardando
                      ? "Guardando..."
                      : recetaEditandoId
                      ? "Actualizar receta"
                      : "Guardar receta completa"}
                  </button>
                </div>
              </aside>
              ) : null}
            </div>
          ) : null}

          {vistaModulo === "insumos" ? (
            <div className="mx-auto w-full max-w-[1560px] space-y-6 px-4 pb-6 lg:px-6">
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {insumoEditandoId
                        ? "Editar insumo maestro"
                        : "Crear insumo rápido"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Crea o edita insumos de la base maestra sin salir del módulo.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (insumoEditandoId) {
                        limpiarFormularioInsumo();
                      }

                      setMostrarFormularioInsumo((actual) => !actual);
                      setInsumoEditandoId("");
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:w-auto"
                  >
                    {mostrarFormularioInsumo || insumoEditandoId
                      ? "Ocultar formulario"
                      : "Crear insumo"}
                  </button>
                </div>

                <div
                  className={`mt-5 grid min-w-0 gap-4 ${
                    mostrarFormularioInsumo || insumoEditandoId ? "" : "hidden"
                  }`}
                >
                  <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                    <Label title="Familia insumo">
                      <select
                        value={nuevoInsumoFamiliaId}
                        onChange={(e) => {
  if (e.target.value === "__nueva__") {
    crearFamiliaInsumoRapida();
    return;
  }

  setNuevoInsumoFamiliaId(e.target.value);
}}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      >
                        <option value="">Seleccionar familia</option>
                        <option value="__nueva__">+ Crear nueva familia</option>
                        {familiasInsumos.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nombre}
                          </option>
                        ))}
                      </select>
                    </Label>

                    <Label title="Nombre insumo">
                      <input
                        value={nuevoInsumoNombre}
                        onChange={(e) => setNuevoInsumoNombre(e.target.value)}
                        placeholder="Ej: Queso mantecoso"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </Label>
                  </div>

                  <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Label title="Precio del envase o formato">
                      <input
                        value={nuevoPrecioReferencia}
                        onChange={(e) => setNuevoPrecioReferencia(e.target.value)}
                        type="number"
                        placeholder="Ej: 3000"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </Label>

                    <Label title="Contenido del envase">
                      <input
                        value={nuevoCantidadFormato}
                        onChange={(e) =>
                          setNuevoCantidadFormato(e.target.value)
                        }
                        type="number"
                        step="0.01"
                        placeholder="Ej: 180"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </Label>

                    <Label title="Unidad del contenido">
                      <select
                        value={nuevoUnidadFormato}
                        onChange={(e) => {
                          setNuevoUnidadFormato(e.target.value);
                          setNuevoUnidadReferencia(e.target.value);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      >
                        <option value="kg">kg</option>
                        <option value="grs">grs</option>
                        <option value="litros">litros</option>
                        <option value="ml">ml</option>
                        <option value="un">un</option>
                      </select>
                    </Label>
                  </div>

                  <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                    <Label title="Unidad uso receta">
                      <select
                        value={nuevoUnidadUso}
                        onChange={(e) => setNuevoUnidadUso(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      >
                        <option value="grs">grs</option>
                        <option value="ml">ml</option>
                        <option value="un">un</option>
                      </select>
                    </Label>

                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <p className="text-sm font-semibold text-emerald-900">
                        Costo calculado para receta
                      </p>
                      <p className="mt-1 text-xl font-bold text-emerald-800">
                        {money(costoUsoPreview)} / {nuevoUnidadUso}
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Se divide el precio del envase por su contenido total.
                      </p>
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Label title="Stock actual en formatos">
                      <input
                        value={nuevoStockFormatos}
                        onChange={(e) => setNuevoStockFormatos(e.target.value)}
                        type="number"
                        step="0.01"
                        placeholder="Ej: 3"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </Label>

                    <Label
                      title={`Stock mínimo en unidad de inventario (${nuevoUnidadFormato})`}
                    >
                      <input
                        value={nuevoStockMinimo}
                        onChange={(e) => setNuevoStockMinimo(e.target.value)}
                        type="number"
                        step="0.01"
                        placeholder="Ej: 180"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </Label>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">
                        Stock valorizado inicial
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {stockActualPreview.toLocaleString("es-CL")}{" "}
                        {nuevoUnidadFormato}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Equivale a {nuevoStockFormatos || 0} formatos. El mínimo
                        se compara contra {nuevoUnidadFormato}, no contra envases.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={guardandoInsumo}
                      onClick={guardarInsumoRapido}
                      className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {guardandoInsumo
                        ? "Guardando..."
                        : insumoEditandoId
                        ? "Actualizar insumo"
                        : "Crear insumo rápido"}
                    </button>

                    {insumoEditandoId ? (
                      <button
                        type="button"
                        onClick={limpiarFormularioInsumo}
                        className="rounded-xl border px-4 py-3 text-sm"
                      >
                        Cancelar edición
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Carga masiva de insumos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Descarga la base maestra, edita tus insumos y súbelos nuevamente.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={descargarPlantilla}
                    className="rounded-xl border px-4 py-3 text-sm"
                  >
                    Descargar base maestra Excel
                  </button>

                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setArchivoExcel(e.target.files?.[0] ?? null)}
                    className="rounded-xl border px-4 py-3 text-sm"
                  />

                  <button
                    type="button"
                    onClick={importarExcel}
                    disabled={importandoExcel}
                    className="rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {importandoExcel ? "Importando..." : "Importar archivo"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Insumos maestros
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Visualiza, busca, filtra y edita todos los insumos registrados.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-500">Insumos activos</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {insumos.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-sm text-emerald-700">Stock valorizado</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-800">
                      {money(valorStockInsumos)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-700">Bajo mínimo</p>
                    <p className="mt-1 text-2xl font-bold text-red-700">
                      {insumosBajoMinimo.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-sm text-amber-700">Sin costo</p>
                    <p className="mt-1 text-2xl font-bold text-amber-700">
                      {insumosSinCosto.length}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Alertas de insumos
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {alertasInsumos.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-500">
                        No hay alertas de stock o costo por ahora.
                      </p>
                    ) : (
                      alertasInsumos.map((item) => {
                        const bajoMinimo =
                          Number(item.stock_minimo ?? 0) > 0 &&
                          Number(item.stock_actual ?? 0) <=
                            Number(item.stock_minimo ?? 0);
                        const sinCosto =
                          Number(item.costo_unitario_uso ?? 0) <= 0;

                        return (
                          <div
                            key={item.id}
                            className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_auto]"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.nombre}
                              </p>
                              <p className="text-xs text-slate-500">
                                Stock actual: {item.stock_actual ?? 0}{" "}
                                {item.unidad_referencia || ""} · Stock mínimo:{" "}
                                {item.stock_minimo ?? 0}{" "}
                                {item.unidad_referencia || ""}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 md:justify-end">
                              {bajoMinimo ? (
                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                                  Bajo mínimo
                                </span>
                              ) : null}
                              {sinCosto ? (
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                  Sin costo
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Buscar insumo..."
                    value={busquedaInsumo}
                    onChange={(e) => setBusquedaInsumo(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  />

                  <select
                    value={filtroFamilia}
                    onChange={(e) => setFiltroFamilia(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  >
                    <option value="">Todas las familias</option>
                    {familiasInsumos.map((familia) => (
                      <option key={familia.id} value={familia.id}>
                        {familia.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="erp-scroll mt-4 max-h-[520px] overflow-y-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                      <tr>
                        <th className="px-3 py-2 text-left">Nombre</th>
                        <th className="px-3 py-2 text-left">Familia</th>
                        <th className="px-3 py-2 text-left">Precio formato</th>
                        <th className="px-3 py-2 text-right">Stock actual</th>
                        <th className="px-3 py-2 text-right">Stock mínimo</th>
                        <th className="px-3 py-2 text-left">Formato compra</th>
                        <th className="px-3 py-2 text-right">Valor formato</th>
                        <th className="px-3 py-2 text-right">Costo uso</th>
                        <th className="px-3 py-2 text-right">Acción</th>
                      </tr>
                    </thead>

                    <tbody>
                      {insumosFiltrados.map((item) => {
                        const bajoMinimo =
                          Number(item.stock_minimo ?? 0) > 0 &&
                          Number(item.stock_actual ?? 0) <=
                            Number(item.stock_minimo ?? 0);
                        const sinCosto =
                          Number(item.costo_unitario_uso ?? 0) <= 0;

                        return (
                        <tr
                          key={item.id}
                          className={`border-t ${
                            bajoMinimo
                              ? "bg-red-50/60"
                              : sinCosto
                              ? "bg-amber-50/60"
                              : "bg-white"
                          }`}
                        >
                          <td className="px-3 py-2">{item.nombre}</td>
                          <td className="px-3 py-2">{getFamiliaInsumo(item.familia_id)}</td>
                         <td className="px-3 py-2">
  {money(item.precio_referencia || 0)}
</td>
<td className="px-3 py-2 text-right">
  <span
    className={`font-semibold ${
      (item.stock_actual ?? 0) <= (item.stock_minimo ?? 0)
        ? "text-red-600"
        : "text-slate-900"
    }`}
  >
    {item.stock_actual ?? 0} {item.unidad_referencia || ""}
  </span>
</td>

<td className="px-3 py-2 text-right">
  {item.stock_minimo ?? 0} {item.unidad_referencia || ""}
</td>

<td className="px-3 py-2">
  {item.cantidad_formato_compra || 1} {item.unidad_formato_compra || "-"}
</td>

<td className="px-3 py-2 text-right">
  {money(item.costo_compra || 0)}
</td>

<td className="px-3 py-2 text-right">
  {money(item.costo_unitario_uso || 0)} / {item.unidad_uso || "-"}
</td>
                    <td className="px-3 py-2 text-right">
  <div className="flex justify-end gap-2">
    <button
      type="button"
      onClick={() => {
        cargarInsumoParaEditar(item);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="rounded-lg border px-3 py-2 text-sm"
    >
      Editar
    </button>

    <button
      type="button"
      onClick={() => eliminarInsumo(item.id)}
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      Eliminar
    </button>
  </div>
</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {vistaModulo === "produccion" ? (
            <div className="mx-auto w-full max-w-[1560px] px-4 pb-6 lg:px-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Registrar producción
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Registra producción estimada de recetas o subrecetas ya costeadas.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <select
                    value={produccionRecetaId}
                    onChange={(e) => setProduccionRecetaId(e.target.value)}
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                  >
                    <option value="">Seleccionar receta</option>
                   {recetas
                    .filter(
                     (r) =>
                     r.tipo_produccion === "produccion" ||
                     r.tipo_produccion === "mise_en_place"
                     )
                  .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>

                  <input
                    value={cantidadProducida}
                    onChange={(e) => setCantidadProducida(e.target.value)}
                    type="number"
                    placeholder="Cantidad producida"
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                  />

                  <input
                    value={observacionProduccion}
                    onChange={(e) => setObservacionProduccion(e.target.value)}
                    placeholder="Observación"
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={registrarProduccion}
                  className="mt-4 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
                >
                  Registrar producción
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 p-6 text-slate-700">
          Cargando recetas...
        </main>
      }
    >
      <RecetasCostosContent />
    </Suspense>
  );
}
