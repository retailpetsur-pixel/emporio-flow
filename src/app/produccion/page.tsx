"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { createClient } from "@/lib/supabase-browser";

type Receta = {
  id: string;
  nombre: string;
  categoria: string;
  tipo_produccion: string | null;
  costo_unitario_calculado: number | null;
};

type ProduccionReceta = {
  id: string;
  receta_id: string;
  fecha: string;
  cantidad_producida: number;
  costo_unitario_estimado: number;
  costo_total_estimado: number;
  observacion: string | null;
  created_at: string;
};

type PlanSemanal = {
  id: string;
  semana_inicio: string;
  receta_id: string | null;
  producto_nombre: string | null;
  objetivo_semanal: number;
  stock_objetivo_diario: number;
  observacion: string | null;
};

type CierreOperativo = {
  id: string;
  fecha: string;
  receta_id: string;
  stock_cierre: number;
  observacion: string | null;
};

function money(v: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function fechaLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toDate(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inicioSemana(fecha: string) {
  const d = toDate(fecha);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return formatDate(d);
}

function finSemana(fechaInicio: string) {
  const d = toDate(fechaInicio);
  d.setDate(d.getDate() + 6);
  return formatDate(d);
}

const nombresDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls =
    estado === "OK"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : estado === "Reponer"
      ? "border-amber-100 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {estado}
    </span>
  );
}

export default function ProduccionPage() {
  const supabase = createClient();

  const hoy = fechaLocal();
  const [semanaInicio, setSemanaInicio] = useState(inicioSemana(hoy));
  const semanaFin = finSemana(semanaInicio);

  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [produccion, setProduccion] = useState<ProduccionReceta[]>([]);
  const [planes, setPlanes] = useState<PlanSemanal[]>([]);
  const [cierres, setCierres] = useState<CierreOperativo[]>([]);

  const [planRecetaId, setPlanRecetaId] = useState("");
  const [planProductoManual, setPlanProductoManual] = useState("");
  const [objetivoSemanal, setObjetivoSemanal] = useState("");
  const [stockObjetivoDiario, setStockObjetivoDiario] = useState("");
  const [observacionPlan, setObservacionPlan] = useState("");

  const [cierreFecha, setCierreFecha] = useState(hoy);
  const [cierreRecetaId, setCierreRecetaId] = useState("");
  const [stockCierre, setStockCierre] = useState("");
  const [observacionCierre, setObservacionCierre] = useState("");

  const diasSemana = useMemo(
    () =>
      nombresDias.map((label, index) => {
        const fecha = toDate(semanaInicio);
        fecha.setDate(fecha.getDate() + index);

        return {
          fecha: formatDate(fecha),
          label,
        };
      }),
    [semanaInicio]
  );

  async function cargar() {
    const [recetasRes, produccionRes, planesRes, cierresRes] = await Promise.all([
      supabase
        .from("recetas")
        .select("id,nombre,categoria,tipo_produccion,costo_unitario_calculado")
        .eq("activo", true)
        .order("nombre"),

      supabase
        .from("produccion_recetas")
        .select(
          "id,receta_id,fecha,cantidad_producida,costo_unitario_estimado,costo_total_estimado,observacion,created_at"
        )
        .gte("fecha", semanaInicio)
        .lte("fecha", semanaFin)
        .order("created_at", { ascending: false }),

      supabase
        .from("plan_produccion_semanal")
        .select("id,semana_inicio,receta_id,producto_nombre,objetivo_semanal,stock_objetivo_diario,observacion")
        .eq("semana_inicio", semanaInicio),

      supabase
        .from("stock_operativo_cierre")
        .select("id,fecha,receta_id,stock_cierre,observacion")
        .gte("fecha", semanaInicio)
        .lte("fecha", semanaFin),
    ]);

    setRecetas((recetasRes.data ?? []) as Receta[]);
    setProduccion((produccionRes.data ?? []) as ProduccionReceta[]);
    setPlanes((planesRes.data ?? []) as PlanSemanal[]);
    setCierres((cierresRes.data ?? []) as CierreOperativo[]);
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    cargar();
  }, [semanaInicio]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const recetasPlanificables = useMemo(
    () =>
      recetas.filter(
        (r) =>
          r.tipo_produccion === "produccion" ||
          r.tipo_produccion === "mise_en_place"
      ),
    [recetas]
  );

  function getReceta(id: string) {
    return recetas.find((r) => r.id === id);
  }

  function cierreDia(recetaId: string | null, fecha: string) {
    if (!recetaId) return undefined;

    return cierres.find((c) => c.receta_id === recetaId && c.fecha === fecha);
  }

  function nombrePlan(plan: PlanSemanal) {
    const receta = plan.receta_id ? getReceta(plan.receta_id) : null;
    return receta?.nombre ?? plan.producto_nombre ?? "Producto sin nombre";
  }

  function categoriaPlan(plan: PlanSemanal) {
    const receta = plan.receta_id ? getReceta(plan.receta_id) : null;
    return receta?.categoria ?? "Sin receta";
  }

  function sugeridoDia(plan: PlanSemanal, diaIndex: number) {
    const programado = Number(plan.objetivo_semanal || 0);

    if (diaIndex === 0) return programado;

    const diaAnterior = diasSemana[diaIndex - 1];
    const cierreAnterior = cierreDia(plan.receta_id, diaAnterior.fecha);

    if (!cierreAnterior) return null;

    const vendibles = Number(cierreAnterior.stock_cierre || 0);

    return Math.max(programado - vendibles, 0);
  }

  async function guardarPlan() {
    const productoManual = planProductoManual.trim();
    const recetaSeleccionada = planRecetaId ? getReceta(planRecetaId) : null;

    if ((!planRecetaId && !productoManual) || Number(objetivoSemanal || 0) <= 0) {
      alert("Selecciona una receta o escribe un producto, y agrega objetivo semanal.");
      return;
    }

    const payload = {
        semana_inicio: semanaInicio,
        receta_id: planRecetaId || null,
        producto_nombre: recetaSeleccionada?.nombre ?? productoManual,
        objetivo_semanal: Number(objetivoSemanal || 0),
        stock_objetivo_diario: Number(stockObjetivoDiario || 0),
        observacion: observacionPlan || null,
      };

    const { error } = planRecetaId
      ? await supabase.from("plan_produccion_semanal").upsert(payload, {
          onConflict: "semana_inicio,receta_id",
        })
      : await supabase.from("plan_produccion_semanal").insert([payload]);

    if (error) {
      alert(error.message);
      return;
    }

    setPlanRecetaId("");
    setPlanProductoManual("");
    setObjetivoSemanal("");
    setStockObjetivoDiario("");
    setObservacionPlan("");
    await cargar();
  }

  async function guardarCierre() {
    if (!cierreRecetaId || Number(stockCierre || 0) < 0) {
      alert("Selecciona producto y stock de cierre.");
      return;
    }

    const { error } = await supabase.from("stock_operativo_cierre").upsert(
      {
        fecha: cierreFecha,
        receta_id: cierreRecetaId,
        stock_cierre: Number(stockCierre || 0),
        observacion: observacionCierre || null,
      },
      { onConflict: "fecha,receta_id" }
    );

    if (error) {
      alert(error.message);
      return;
    }

    setCierreRecetaId("");
    setStockCierre("");
    setObservacionCierre("");
    await cargar();
  }

  async function eliminarPlan(id: string) {
    if (!confirm("¿Eliminar esta planificación semanal?")) return;

    const { error } = await supabase
      .from("plan_produccion_semanal")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await cargar();
  }

  const totalObjetivoSemana = planes.reduce(
    (sum, p) => sum + Number(p.objetivo_semanal || 0),
    0
  );

  const totalProducidoSemana = produccion.reduce(
    (sum, p) => sum + Number(p.cantidad_producida || 0),
    0
  );

  const costoSemana = produccion.reduce(
    (sum, p) => sum + Number(p.costo_total_estimado || 0),
    0
  );

  const planesPorCategoria = planes.reduce<Record<string, PlanSemanal[]>>(
    (acc, plan) => {
      const receta = plan.receta_id ? getReceta(plan.receta_id) : null;
      const categoria = receta?.categoria || categoriaPlan(plan);

      if (!acc[categoria]) acc[categoria] = [];
      acc[categoria].push(plan);

      return acc;
    },
    {}
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1 overflow-x-hidden">
          <Topbar
            title="Producción"
            subtitle="Plan semanal, reposición diaria y producción real"
          />

          <div className="space-y-6 p-4 md:p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Semana de planificación
              </label>

              <input
                type="date"
                value={semanaInicio}
                onChange={(e) => setSemanaInicio(inicioSemana(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm md:w-64"
              />

              <p className="mt-2 text-sm text-slate-500">
                Semana: {semanaInicio} al {semanaFin}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Objetivo semanal" value={String(totalObjetivoSemana)} />
              <StatCard title="Producido semana" value={String(totalProducidoSemana)} />
              <StatCard title="Diferencia" value={String(totalObjetivoSemana - totalProducidoSemana)} />
              <StatCard title="Costo producido" value={money(costoSemana)} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Cuaderno semanal de producción
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Lunes parte con lo planificado. Los días siguientes se sugieren según los vendibles informados al cierre anterior.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Fórmula base: programado - vendibles cierre anterior
                </div>
              </div>

              {planes.length === 0 ? (
                <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                  No hay planificación semanal cargada para construir el cuaderno.
                </div>
              ) : (
                <div className="mt-5 overflow-auto rounded-xl border border-slate-300">
                  <table className="min-w-[1120px] w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-700 text-white">
                      <tr>
                        <th className="border border-slate-900 px-3 py-3 text-left">
                          Producto
                        </th>
                        <th className="border border-slate-900 px-3 py-3 text-right">
                          Planificación semana
                        </th>
                        {diasSemana.map((dia) => (
                          <th
                            key={dia.fecha}
                            className="border border-slate-900 px-3 py-3 text-center"
                          >
                            {dia.label}
                            <p className="mt-1 text-xs font-normal text-slate-200">
                              {dia.fecha.slice(5)}
                            </p>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {Object.entries(planesPorCategoria).map(
                        ([categoria, lista]) => (
                          <>
                            <tr key={`cat-${categoria}`}>
                              <td
                                colSpan={diasSemana.length + 2}
                                className="border border-slate-900 bg-slate-600 px-3 py-2 text-base font-bold text-white"
                              >
                                {categoria}
                              </td>
                            </tr>

                            {lista.map((plan) => {
                              return (
                                <tr key={plan.id} className="bg-white">
                                  <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">
                                    <a
                                      href={
                                        plan.receta_id
                                          ? `/recetas-costos?id=${plan.receta_id}`
                                          : `/recetas-costos?crear=${encodeURIComponent(
                                              nombrePlan(plan)
                                            )}`
                                      }
                                      className="text-slate-950 underline-offset-4 hover:text-emerald-700 hover:underline"
                                    >
                                      {nombrePlan(plan)}
                                    </a>
                                  </td>
                                  <td className="border border-slate-300 px-3 py-2 text-right font-bold text-slate-900">
                                    {plan.objetivo_semanal}
                                  </td>
                                  {diasSemana.map((dia, index) => {
                                    const sugerido = sugeridoDia(plan, index);
                                    const cierreAnterior =
                                      index > 0
                                        ? cierreDia(
                                            plan.receta_id,
                                            diasSemana[index - 1].fecha
                                          )
                                        : null;

                                    return (
                                      <td
                                        key={dia.fecha}
                                        className="border border-slate-300 px-3 py-2 text-right"
                                      >
                                        {sugerido === null ? (
                                          <span className="text-slate-400">-</span>
                                        ) : (
                                          <span className="font-bold text-slate-900">
                                            {sugerido}
                                          </span>
                                        )}
                                        {index > 0 && cierreAnterior ? (
                                          <p className="mt-1 text-xs text-slate-500">
                                            Vendible ant.:{" "}
                                            {cierreAnterior.stock_cierre}
                                          </p>
                                        ) : null}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Crear / ajustar planificación semanal
              </h3>

              <p className="text-sm text-slate-500">
                Define metas semanales solo para productos de producción anticipada o mise en place.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <select
                  value={planRecetaId}
                  onChange={(e) => {
                    setPlanRecetaId(e.target.value);
                    if (e.target.value) setPlanProductoManual("");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="">Seleccionar producto</option>
                  {recetasPlanificables.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>

                <input
                  value={planProductoManual}
                  onChange={(e) => {
                    setPlanProductoManual(e.target.value);
                    if (e.target.value.trim()) setPlanRecetaId("");
                  }}
                  placeholder="O escribir producto nuevo"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />

                <input
                  value={objetivoSemanal}
                  onChange={(e) => setObjetivoSemanal(e.target.value)}
                  type="number"
                  placeholder="Objetivo semanal"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />

                <input
                  value={stockObjetivoDiario}
                  onChange={(e) => setStockObjetivoDiario(e.target.value)}
                  type="number"
                  placeholder="Stock objetivo diario"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />

                <input
                  value={observacionPlan}
                  onChange={(e) => setObservacionPlan(e.target.value)}
                  placeholder="Observación"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
                />
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Si escribes un producto que aún no tiene receta, quedará en el
                cuaderno y su nombre abrirá Recetas y costos para crearla.
              </p>

              <button
                type="button"
                onClick={guardarPlan}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
              >
                Guardar planificación
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Cierre operativo diario
              </h3>

              <p className="text-sm text-slate-500">
                Ingresa cuántas unidades quedan al cierre. El sistema sugerirá cuánto reponer.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <input
                  type="date"
                  value={cierreFecha}
                  onChange={(e) => setCierreFecha(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />

                <select
                  value={cierreRecetaId}
                  onChange={(e) => setCierreRecetaId(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="">Seleccionar producto</option>
                  {recetasPlanificables.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>

                <input
                  value={stockCierre}
                  onChange={(e) => setStockCierre(e.target.value)}
                  type="number"
                  placeholder="Stock cierre"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />

                <input
                  value={observacionCierre}
                  onChange={(e) => setObservacionCierre(e.target.value)}
                  placeholder="Observación"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={guardarCierre}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
              >
                Guardar cierre
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Reposición sugerida
              </h3>

              <p className="text-sm text-slate-500">
                Se calcula comparando stock objetivo diario contra stock de cierre.
              </p>

              {planes.length === 0 ? (
                <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                  No hay planificación semanal cargada.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="px-4 py-2">Producto</th>
                        <th className="px-4 py-2">Tipo</th>
                        <th className="px-4 py-2 text-right">Objetivo semanal</th>
                        <th className="px-4 py-2 text-right">Stock objetivo</th>
                        <th className="px-4 py-2 text-right">Stock cierre</th>
                        <th className="px-4 py-2 text-right">Reponer</th>
                        <th className="px-4 py-2">Estado</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>

                    <tbody>
                      {planes.map((plan) => {
                        const receta = plan.receta_id ? getReceta(plan.receta_id) : null;
                        const cierre = cierreDia(plan.receta_id, cierreFecha);
                        const stockC = Number(cierre?.stock_cierre ?? 0);
                        const objetivo = Number(plan.stock_objetivo_diario ?? 0);
                        const reponer = Math.max(objetivo - stockC, 0);
                        const estado = reponer > 0 ? "Reponer" : "OK";

                        return (
                          <tr key={plan.id} className="bg-slate-50 text-slate-700">
                            <td className="rounded-l-2xl px-4 py-4 font-medium text-slate-900">
                              <a
                                href={
                                  plan.receta_id
                                    ? `/recetas-costos?id=${plan.receta_id}`
                                    : `/recetas-costos?crear=${encodeURIComponent(
                                        nombrePlan(plan)
                                      )}`
                                }
                                className="underline-offset-4 hover:text-emerald-700 hover:underline"
                              >
                                {nombrePlan(plan)}
                              </a>
                            </td>
                            <td className="px-4 py-4">
                              {!receta
                                ? "Por crear"
                                : receta.tipo_produccion === "mise_en_place"
                                ? "Mise en place"
                                : "Producción"}
                            </td>
                            <td className="px-4 py-4 text-right font-semibold">
                              {plan.objetivo_semanal}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {plan.stock_objetivo_diario}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {cierre ? stockC : "-"}
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-slate-900">
                              {cierre ? reponer : "-"}
                            </td>
                            <td className="px-4 py-4">
                              <EstadoBadge estado={cierre ? estado : "Sin cierre"} />
                            </td>
                            <td className="rounded-r-2xl px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => eliminarPlan(plan.id)}
                                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Producción real de la semana
              </h3>

              {produccion.length === 0 ? (
                <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                  No hay producción registrada en esta semana.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="px-4 py-2">Fecha</th>
                        <th className="px-4 py-2">Producto</th>
                        <th className="px-4 py-2">Categoría</th>
                        <th className="px-4 py-2 text-right">Cantidad</th>
                        <th className="px-4 py-2 text-right">Costo unitario</th>
                        <th className="px-4 py-2 text-right">Costo total</th>
                        <th className="px-4 py-2">Observación</th>
                      </tr>
                    </thead>

                    <tbody>
                      {produccion.map((item) => {
                        const receta = getReceta(item.receta_id);

                        return (
                          <tr key={item.id} className="bg-slate-50 text-slate-700">
                            <td className="rounded-l-2xl px-4 py-4">
                              {item.fecha}
                            </td>
                            <td className="px-4 py-4 font-medium text-slate-900">
                              {receta?.nombre ?? "Receta sin nombre"}
                            </td>
                            <td className="px-4 py-4">
                              {receta?.categoria ?? "-"}
                            </td>
                            <td className="px-4 py-4 text-right font-semibold">
                              {item.cantidad_producida}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {money(Number(item.costo_unitario_estimado || 0))}
                            </td>
                            <td className="px-4 py-4 text-right font-semibold">
                              {money(Number(item.costo_total_estimado || 0))}
                            </td>
                            <td className="rounded-r-2xl px-4 py-4">
                              {item.observacion ?? "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
