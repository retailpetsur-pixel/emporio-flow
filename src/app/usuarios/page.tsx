import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Role = "admin" | "gerencia" | "supervisor" | "trabajador" | "compras";

type Trabajador = {
  id: string;
  nombre_completo: string;
  cargo: string;
  tipo_contrato: string | null;
  jornada: string | null;
  fecha_ingreso: string | null;
  telefono: string | null;
  correo: string | null;
  estado: string;
  observaciones: string | null;
};

type Sector = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  prioridad_operativa: number;
};

type Turno = {
  id: string;
  fecha: string;
  turno: string | null;
  hora_inicio: string;
  hora_termino: string;
  estado: string;
  observacion: string | null;
  trabajador_id: string;
  sector_id: string | null;
  trabajadores: { nombre_completo: string } | null;
  sectores: { nombre: string } | null;
};

type Permiso = {
  id: string;
  tipo_permiso: string;
  fecha: string;
  jornada_o_tramo: string | null;
  motivo: string | null;
  estado: string;
  observacion_jefatura: string | null;
  trabajador_id: string;
  trabajadores: { nombre_completo: string } | null;
};

async function crearSolicitudPermiso(formData: FormData) {
  "use server";

  const supabase = await createServerClient();

  const trabajador_id = String(formData.get("trabajador_id") || "");
  const tipo_permiso = String(formData.get("tipo_permiso") || "").trim();
  const fecha = String(formData.get("fecha") || "").trim();
  const jornada_o_tramo = String(formData.get("jornada_o_tramo") || "").trim();
  const motivo = String(formData.get("motivo") || "").trim();

  if (!trabajador_id || !tipo_permiso || !fecha) {
    throw new Error("Trabajador, tipo de permiso y fecha son obligatorios.");
  }

  const { error } = await supabase.from("solicitudes_permiso").insert([
    {
      trabajador_id,
      tipo_permiso,
      fecha,
      jornada_o_tramo: jornada_o_tramo || null,
      motivo: motivo || null,
      estado: "pendiente",
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
}

async function resolverPermiso(formData: FormData) {
  "use server";

  const supabase = await createServerClient();

  const permisoId = String(formData.get("permiso_id") || "");
  const nuevoEstado = String(formData.get("estado") || "");
  const observacion = String(formData.get("observacion_jefatura") || "").trim();

  if (!permisoId || !nuevoEstado) {
    throw new Error("Faltan datos para resolver el permiso.");
  }

  if (!["aprobado", "rechazado"].includes(nuevoEstado)) {
    throw new Error("Estado no válido.");
  }

  const { error } = await supabase
    .from("solicitudes_permiso")
    .update({
      estado: nuevoEstado,
      observacion_jefatura: observacion || null,
    })
    .eq("id", permisoId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
}

function StatCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function StatusBadge({
  value,
  tone = "neutral",
}: {
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const styles = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    danger: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}
    >
      {value}
    </span>
  );
}

export default async function UsuariosPage() {
  const hoy = new Date().toISOString().slice(0, 10);

  const authClient = await createServerClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const supabase = authClient;

  const { data: perfilUsuario } = await supabase
    .from("perfiles_usuario")
    .select("*")
    .eq("email", session.user.email)
    .eq("activo", true)
    .maybeSingle();

  const currentRole: Role =
    perfilUsuario?.rol &&
    ["admin", "gerencia", "supervisor", "trabajador", "compras"].includes(
      perfilUsuario.rol
    )
      ? (perfilUsuario.rol as Role)
      : "trabajador";

  const isFullAccess =
    currentRole === "admin" ||
    currentRole === "gerencia" ||
    currentRole === "supervisor";

  if (isFullAccess) {
    const [
      { data: trabajadores, error: trabajadoresError },
      { data: sectores, error: sectoresError },
      { data: turnos, error: turnosError },
      { data: permisos, error: permisosError },
    ] = await Promise.all([
      supabase
        .from("trabajadores")
        .select("*")
        .order("nombre_completo", { ascending: true }),
      supabase
        .from("sectores")
        .select("*")
        .order("prioridad_operativa", { ascending: true }),
      supabase
        .from("turnos_personal")
        .select("*, trabajadores(nombre_completo), sectores(nombre)")
        .eq("fecha", hoy)
        .order("hora_inicio", { ascending: true }),
      supabase
        .from("solicitudes_permiso")
        .select("*, trabajadores(nombre_completo)")
        .order("created_at", { ascending: false }),
    ]);

    const trabajadoresList: Trabajador[] = trabajadores ?? [];
    const sectoresList: Sector[] = sectores ?? [];
    const turnosList: Turno[] = turnos ?? [];
    const permisosList: Permiso[] = permisos ?? [];

    const activos = trabajadoresList.filter((t) => t.estado === "activo").length;
    const permisosPendientes = permisosList.filter(
      (p) => p.estado === "pendiente" || p.estado === "aprobacion_parcial"
    ).length;
    const sectoresActivos = sectoresList.filter((s) => s.activo).length;
    const turnosHoy = turnosList.length;

    const errores = [
      trabajadoresError?.message,
      sectoresError?.message,
      turnosError?.message,
      permisosError?.message,
    ].filter(Boolean);

    return (
      <main className="min-h-screen bg-slate-100">
        <div className="flex min-h-screen">
          <Sidebar />

          <section className="flex-1">
            <Topbar
              title="Personal"
              subtitle="Trabajadores, sectores, turnos y permisos"
            />

            <div className="p-6">
              {errores.length > 0 ? (
                <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Error cargando datos: {errores[0]}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Trabajadores activos" value={String(activos)} />
                <StatCard title="Turnos de hoy" value={String(turnosHoy)} />
                <StatCard title="Sectores activos" value={String(sectoresActivos)} />
                <StatCard
                  title="Permisos pendientes"
                  value={String(permisosPendientes)}
                />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        Trabajadores
                      </h3>
                      <p className="text-sm text-slate-500">
                        Ficha resumida del personal
                      </p>
                    </div>
                    <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      + Nuevo trabajador
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {trabajadoresList.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        No hay trabajadores registrados.
                      </div>
                    ) : (
                      trabajadoresList.map((trabajador) => (
                        <div
                          key={trabajador.id}
                          className="rounded-xl bg-slate-50 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {trabajador.nombre_completo}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {trabajador.cargo} ·{" "}
                                {trabajador.jornada ?? "Sin jornada"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {trabajador.correo ?? "Sin correo"} ·{" "}
                                {trabajador.telefono ?? "Sin teléfono"}
                              </p>
                            </div>

                            <StatusBadge
                              value={trabajador.estado}
                              tone={
                                trabajador.estado === "activo"
                                  ? "success"
                                  : "neutral"
                              }
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        Sectores
                      </h3>
                      <p className="text-sm text-slate-500">
                        Áreas operativas configuradas
                      </p>
                    </div>
                    <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      + Nuevo sector
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {sectoresList.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        No hay sectores registrados.
                      </div>
                    ) : (
                      sectoresList.map((sector) => (
                        <div
                          key={sector.id}
                          className="rounded-xl bg-slate-50 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {sector.nombre}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {sector.descripcion ?? "Sin descripción"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Prioridad: {sector.prioridad_operativa}
                              </p>
                            </div>

                            <StatusBadge
                              value={sector.activo ? "activo" : "inactivo"}
                              tone={sector.activo ? "success" : "neutral"}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        Turnos de hoy
                      </h3>
                      <p className="text-sm text-slate-500">
                        Asignación manual por trabajador y sector
                      </p>
                    </div>
                    <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      + Nuevo turno
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {turnosList.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        No hay turnos cargados para hoy.
                      </div>
                    ) : (
                      turnosList.map((turno) => (
                        <div
                          key={turno.id}
                          className="rounded-xl bg-slate-50 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {turno.trabajadores?.nombre_completo ??
                                  "Sin trabajador"}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {turno.sectores?.nombre ?? "Sin sector"} ·{" "}
                                {turno.turno ?? "Sin turno"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {turno.hora_inicio} - {turno.hora_termino}
                              </p>
                            </div>

                            <StatusBadge
                              value={turno.estado}
                              tone={
                                turno.estado === "programado"
                                  ? "neutral"
                                  : turno.estado === "confirmado"
                                  ? "success"
                                  : "warning"
                              }
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        Gestión de permisos
                      </h3>
                      <p className="text-sm text-slate-500">
                        Aprobar o rechazar solicitudes pendientes
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {permisosList.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        No hay permisos registrados.
                      </div>
                    ) : (
                      permisosList.slice(0, 10).map((permiso) => (
                        <div
                          key={permiso.id}
                          className="rounded-xl bg-slate-50 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {permiso.trabajadores?.nombre_completo ??
                                  "Sin trabajador"}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {permiso.tipo_permiso} · {permiso.fecha}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {permiso.jornada_o_tramo ?? "Sin tramo"} ·{" "}
                                {permiso.motivo ?? "Sin motivo"}
                              </p>
                              {permiso.observacion_jefatura ? (
                                <p className="mt-2 text-xs text-slate-600">
                                  Observación jefatura:{" "}
                                  {permiso.observacion_jefatura}
                                </p>
                              ) : null}
                            </div>

                            <StatusBadge
                              value={permiso.estado}
                              tone={
                                permiso.estado === "aprobado"
                                  ? "success"
                                  : permiso.estado === "rechazado"
                                  ? "danger"
                                  : "warning"
                              }
                            />
                          </div>

                          <div className="mt-4 grid gap-3">
                            <form action={resolverPermiso} className="grid gap-3">
                              <input
                                type="hidden"
                                name="permiso_id"
                                value={permiso.id}
                              />
                              <textarea
                                name="observacion_jefatura"
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                                placeholder="Observación de jefatura"
                                defaultValue={permiso.observacion_jefatura ?? ""}
                              />
<div className="flex flex-wrap gap-2">
  <button
    type="submit"
    name="estado"
    value="aprobado"
    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
  >
    ✅ Aprobar
  </button>

  <button
    type="submit"
    name="estado"
    value="rechazado"
    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
  >
    ❌ Rechazar
  </button>

  <button
    type="button"
    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
  >
    👁 Ver detalle
  </button>
</div>
                            </form>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { data: miFicha, error: miFichaError } = await supabase
    .from("trabajadores")
    .select("*")
    .eq("correo", session.user.email)
    .maybeSingle();

  const trabajador = miFicha as Trabajador | null;

  const [{ data: misTurnos, error: misTurnosError }, { data: misPermisos, error: misPermisosError }] =
    trabajador?.id
      ? await Promise.all([
          supabase
            .from("turnos_personal")
            .select("*, trabajadores(nombre_completo), sectores(nombre)")
            .eq("trabajador_id", trabajador.id)
            .order("fecha", { ascending: false }),
          supabase
            .from("solicitudes_permiso")
            .select("*, trabajadores(nombre_completo)")
            .eq("trabajador_id", trabajador.id)
            .order("created_at", { ascending: false }),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

  const misTurnosList: Turno[] = (misTurnos ?? []) as Turno[];
  const misPermisosList: Permiso[] = (misPermisos ?? []) as Permiso[];

  const erroresTrabajador = [
    miFichaError?.message,
    misTurnosError?.message,
    misPermisosError?.message,
  ].filter(Boolean);

  const turnosHoyTrabajador = misTurnosList.filter((t) => t.fecha === hoy).length;
  const permisosPendientesTrabajador = misPermisosList.filter(
    (p) => p.estado === "pendiente" || p.estado === "aprobacion_parcial"
  ).length;
  const permisosAprobadosTrabajador = misPermisosList.filter(
    (p) => p.estado === "aprobado"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1">
          <Topbar
            title="Mi espacio"
            subtitle="Mis turnos, permisos y datos personales"
          />

          <div className="p-6">
            {erroresTrabajador.length > 0 ? (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                Error cargando datos: {erroresTrabajador[0]}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Turnos de hoy"
                value={String(turnosHoyTrabajador)}
              />
              <StatCard
                title="Permisos pendientes"
                value={String(permisosPendientesTrabajador)}
              />
              <StatCard
                title="Permisos aprobados"
                value={String(permisosAprobadosTrabajador)}
              />
              <StatCard
                title="Estado"
                value={trabajador?.estado ?? "sin ficha"}
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Mi ficha
                </h3>

                <div className="mt-4 space-y-3">
                  {trabajador ? (
                    <>
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Nombre:{" "}
                        <span className="font-semibold">
                          {trabajador.nombre_completo}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Cargo:{" "}
                        <span className="font-semibold">{trabajador.cargo}</span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Jornada:{" "}
                        <span className="font-semibold">
                          {trabajador.jornada ?? "-"}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Correo:{" "}
                        <span className="font-semibold">
                          {trabajador.correo ?? "-"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No existe una ficha de trabajador asociada a este correo.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Mis turnos
                  </h3>
                </div>

                <div className="mt-4 space-y-3">
                  {misTurnosList.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No tienes turnos registrados.
                    </div>
                  ) : (
                    misTurnosList.slice(0, 8).map((turno) => (
                      <div
                        key={turno.id}
                        className="rounded-xl bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {turno.fecha}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {turno.sectores?.nombre ?? "Sin sector"} ·{" "}
                              {turno.turno ?? "Sin turno"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {turno.hora_inicio} - {turno.hora_termino}
                            </p>
                          </div>

                          <StatusBadge
                            value={turno.estado}
                            tone={
                              turno.estado === "confirmado"
                                ? "success"
                                : turno.estado === "programado"
                                ? "neutral"
                                : "warning"
                            }
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Mis permisos
                  </h3>
                </div>

                <div className="mt-4 space-y-3">
                  {misPermisosList.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No tienes permisos registrados.
                    </div>
                  ) : (
                    misPermisosList.map((permiso) => (
                      <div
                        key={permiso.id}
                        className="rounded-xl bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {permiso.tipo_permiso}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {permiso.fecha} · {permiso.jornada_o_tramo ?? "Sin tramo"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {permiso.motivo ?? "Sin motivo"}
                            </p>
                            {permiso.observacion_jefatura ? (
                              <p className="mt-2 text-xs text-slate-600">
                                Observación jefatura: {permiso.observacion_jefatura}
                              </p>
                            ) : null}
                          </div>

                          <StatusBadge
                            value={permiso.estado}
                            tone={
                              permiso.estado === "aprobado"
                                ? "success"
                                : permiso.estado === "rechazado"
                                ? "danger"
                                : "warning"
                            }
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Solicitar permiso
                </h3>

                <form action={crearSolicitudPermiso} className="mt-4 space-y-4">
                  <input
                    type="hidden"
                    name="trabajador_id"
                    value={trabajador?.id ?? ""}
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Tipo de permiso
                    </label>
                    <select
                      name="tipo_permiso"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="">Seleccionar</option>
                      <option value="Permiso personal">Permiso personal</option>
                      <option value="Permiso médico">Permiso médico</option>
                      <option value="Cambio de turno">Cambio de turno</option>
                      <option value="Trámite">Trámite</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Fecha
                    </label>
                    <input
                      name="fecha"
                      type="date"
                      required
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Jornada o tramo
                    </label>
                    <input
                      name="jornada_o_tramo"
                      type="text"
                      placeholder="Ej: Mañana, Tarde, 08:00 a 12:00"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Motivo
                    </label>
                    <textarea
                      name="motivo"
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                      placeholder="Describe brevemente el motivo"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Enviar solicitud
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}