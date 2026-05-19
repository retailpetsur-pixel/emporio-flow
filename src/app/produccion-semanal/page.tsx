"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { createClient } from "@/lib/supabase-browser";

const supabase = createClient();

type Receta = {
  id: string;
  nombre: string;
  categoria: string;
  tipo_produccion: string | null;
};

type Control = {
  id: string;
  fecha: string;
  receta_id: string;
  elaborado: number;
  merma: number;
};

function inicioSemana(fecha: Date) {
  const d = new Date(fecha);
  const day = d.getDay() || 7;

  if (day !== 1) {
    d.setHours(-24 * (day - 1));
  }

  return d;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nombreDia(date: Date) {
  return date.toLocaleDateString("es-CL", {
    weekday: "short",
  });
}

export default function ProduccionSemanalPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [controles, setControles] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);

  const semana = useMemo(() => {
    const inicio = inicioSemana(new Date());

    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);

      return {
        fecha: formatDate(d),
        label: nombreDia(d),
      };
    });
  }, []);

  async function cargar() {
    setLoading(true);

    const fechaInicio = semana[0].fecha;
    const fechaFin = semana[5].fecha;

    const [recetasRes, controlesRes] = await Promise.all([
      supabase
        .from("recetas")
        .select("id,nombre,categoria,tipo_produccion")
        .eq("activo", true)
        .in("tipo_produccion", [
          "produccion",
          "mise_en_place",
        ])
        .order("categoria")
        .order("nombre"),

      supabase
        .from("produccion_control_diario")
        .select("*")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin),
    ]);

    setRecetas((recetasRes.data ?? []) as Receta[]);
    setControles((controlesRes.data ?? []) as Control[]);

    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    cargar();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function getControl(
    recetaId: string,
    fecha: string
  ) {
    return controles.find(
      (c) =>
        c.receta_id === recetaId &&
        c.fecha === fecha
    );
  }

  async function guardarValor(
    recetaId: string,
    fecha: string,
    campo: "elaborado" | "merma",
    valor: number
  ) {
    const actual = getControl(recetaId, fecha);

    const payload = {
      receta_id: recetaId,
      fecha,
      elaborado:
        campo === "elaborado"
          ? valor
          : Number(actual?.elaborado ?? 0),

      merma:
        campo === "merma"
          ? valor
          : Number(actual?.merma ?? 0),
    };

    const { error } = await supabase
      .from("produccion_control_diario")
      .upsert(payload, {
        onConflict: "fecha,receta_id",
      });

    if (error) {
      alert(error.message);
      return;
    }

    setControles((prev) => {
      const otros = prev.filter(
        (x) =>
          !(
            x.receta_id === recetaId &&
            x.fecha === fecha
          )
      );

      return [
        ...otros,
        {
          id: actual?.id ?? crypto.randomUUID(),
          ...payload,
        },
      ];
    });
  }

  function sugeridoDia(recetaId: string, diaIndex: number) {
    if (diaIndex === 0) return null;

    const diaAnterior = semana[diaIndex - 1];
    const controlAnterior = getControl(recetaId, diaAnterior.fecha);

    if (!controlAnterior) return null;

    const elaborado = Number(controlAnterior.elaborado ?? 0);
    const merma = Number(controlAnterior.merma ?? 0);

    return Math.max(elaborado - merma, 0);
  }

  const grouped = recetas.reduce<
    Record<string, Receta[]>
  >((acc, receta) => {
    const categoria =
      receta.categoria || "Sin categoría";

    if (!acc[categoria]) {
      acc[categoria] = [];
    }

    acc[categoria].push(receta);

    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1 overflow-x-hidden">
          <Topbar
            title="Producción semanal"
            subtitle="Control operativo tipo cuaderno"
          />

          <div className="p-4 md:p-6">
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Cuaderno diario editable
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Completa elaborado y merma. El sugerido del día siguiente usa: elaborado - merma.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[1400px] border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-100">
                  <tr>
                    <th className="border-b bg-white px-4 py-4 text-left text-slate-900">
                      Producto
                    </th>

                    {semana.map((dia) => (
                      <th
                        key={dia.fecha}
                        className="border-b border-l bg-white px-4 py-4 text-center"
                      >
                        <div className="font-semibold capitalize text-slate-900">
                          {dia.label}
                        </div>

                        <div className="text-xs text-slate-500">
                          {dia.fecha.slice(5)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

<tbody>
  {Object.entries(grouped).map(
    ([categoria, lista]) => (
      <>
        <tr key={categoria}>
          <td
            colSpan={semana.length + 1}
            className="bg-slate-900 px-5 py-4 text-lg font-bold text-white"
          >
            {categoria}
          </td>
        </tr>

        <tr>
          <td
            colSpan={semana.length + 1}
            className="bg-slate-100 p-4"
          >
            <div className="space-y-5">
              {lista.map((receta) => (
                <div
                  key={receta.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {receta.nombre}
                      </h3>

                      <p className="text-xs text-slate-500">
                        {receta.tipo_produccion ===
                        "mise_en_place"
                          ? "Mise en place"
                          : "Producción"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {semana.map((dia) => {
                      const control =
                        getControl(
                          receta.id,
                          dia.fecha
                        );
                      const sugerido = sugeridoDia(receta.id, semana.indexOf(dia));

                      return (
                        <div
                          key={dia.fecha}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="mb-3 text-center">
                            <div className="text-sm font-bold capitalize text-slate-900">
                              {dia.label}
                            </div>

                            <div className="text-xs text-slate-500">
                              {dia.fecha.slice(5)}
                            </div>
                            <div className="mt-2 rounded-xl bg-slate-900 px-3 py-2 text-white">
                              <p className="text-[10px] font-bold uppercase text-slate-300">
                                Sugerido
                              </p>
                              <p className="text-xl font-bold">
                                {sugerido === null ? "-" : sugerido}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-center text-xs font-semibold text-emerald-700">
                                ELAB
                              </label>

                              <input
                                type="number"
                                defaultValue={
                                  control?.elaborado ??
                                  ""
                                }
                                onBlur={(e) =>
                                  guardarValor(
                                    receta.id,
                                    dia.fecha,
                                    "elaborado",
                                    Number(
                                      e.target.value ||
                                        0
                                    )
                                  )
                                }
                                className="w-full rounded-xl border border-emerald-200 bg-white px-2 py-2 text-center text-base font-bold text-slate-900 shadow-sm"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-center text-xs font-semibold text-red-700">
                                MERMA
                              </label>

                              <input
                                type="number"
                                defaultValue={
                                  control?.merma ??
                                  ""
                                }
                                onBlur={(e) =>
                                  guardarValor(
                                    receta.id,
                                    dia.fecha,
                                    "merma",
                                    Number(
                                      e.target.value ||
                                        0
                                    )
                                  )
                                }
                                className="w-full rounded-xl border border-red-200 bg-white px-2 py-2 text-center text-base font-bold text-slate-900 shadow-sm"
                              />
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      </>
    )
  )}
</tbody>
              </table>
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-slate-500">
                Cargando producción...
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
