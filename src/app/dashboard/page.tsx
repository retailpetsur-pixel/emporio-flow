import DashboardCardGrid, {
  type DashboardCardItem,
} from "@/components/emporio/dashboard-card-grid";
import { supabase } from "@/lib/supabase";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

type Role = "admin" | "gerencia" | "supervisor" | "trabajador" | "compras";

function AlertItem({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: "danger" | "warning" | "neutral";
}) {
  const styles = {
    danger: "bg-red-50 border-red-100 text-red-700",
    warning: "bg-amber-50 border-amber-100 text-amber-700",
    neutral: "bg-slate-50 border-slate-200 text-slate-700",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>
      {text}
    </div>
  );
}

function ActionRow({
  title,
  description,
  href,
  action,
  tone = "neutral",
}: {
  title: string;
  description: string;
  href: string;
  action: string;
  tone?: "danger" | "warning" | "neutral";
}) {
  const styles = {
    danger: "border-red-100 bg-red-50 text-red-800",
    warning: "border-amber-100 bg-amber-50 text-amber-800",
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <a
      href={href}
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 transition hover:border-slate-300 hover:bg-white md:flex-row md:items-center md:justify-between ${styles[tone]}`}
    >
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block text-sm opacity-80">{description}</span>
      </span>
      <span className="text-sm font-bold">{action}</span>
    </a>
  );
}

function MiniBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, 6) : 6;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-slate-900"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const hoy = new Date().toISOString().slice(0, 10);
  const authClient = await createServerClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

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
  const [
    { data: productos, error: productosError },
    { data: insumosCosteo, error: insumosCosteoError },
    { data: produccion, error: produccionError },
    { data: cierres, error: cierresError },
    { data: trabajadores, error: trabajadoresError },
    { data: turnos, error: turnosError },
    { data: permisos, error: permisosError },
  ] = await Promise.all([
    supabase.from("productos").select("*").order("created_at", { ascending: true }),
    supabase
      .from("insumos_costeo")
      .select("id,nombre,stock_actual,stock_minimo")
      .eq("activo", true)
      .order("nombre", { ascending: true }),
    supabase
      .from("produccion")
      .select("*")
      .eq("fecha", hoy)
      .order("created_at", { ascending: true }),
    supabase
      .from("cierre_turno")
      .select("*")
      .eq("fecha", hoy)
      .order("created_at", { ascending: true }),
    supabase.from("trabajadores").select("*").order("created_at", { ascending: true }),
    supabase
      .from("turnos_personal")
      .select("*, trabajadores(nombre_completo), sectores(nombre)")
      .eq("fecha", hoy)
      .order("hora_inicio", { ascending: true }),
    supabase
      .from("solicitudes_permiso")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const productosList = productos ?? [];
  const insumosCosteoList = insumosCosteo ?? [];
  const produccionList = produccion ?? [];
  const cierresList = cierres ?? [];
  const trabajadoresList = trabajadores ?? [];
  const turnosList = turnos ?? [];
  const permisosList = permisos ?? [];

  const insumosCompraSugerida = insumosCosteoList.filter(
    (item) =>
      Number(item.stock_minimo ?? 0) > 0 &&
      Number(item.stock_actual ?? 0) <= Number(item.stock_minimo ?? 0)
  );

  const productosSobreStock = productosList.filter(
    (item) =>
      Number(item.stock_maximo) > 0 &&
      Number(item.stock_actual) > Number(item.stock_maximo)
  ).length;

  const comprasSugeridas = insumosCompraSugerida.length;

  const produccionPendiente = produccionList.filter(
    (item) => item.estado === "Pendiente" || item.estado === "En proceso"
  ).length;

  const totalSaldoCierre = cierresList.reduce(
    (sum, item) => sum + Number(item.saldo_vendible),
    0
  );

  const totalMermaCierre = cierresList.reduce(
    (sum, item) => sum + Number(item.merma),
    0
  );

  const permisosPendientes = permisosList.filter(
    (item) => item.estado === "pendiente" || item.estado === "aprobacion_parcial"
  ).length;

  const trabajadoresActivos = trabajadoresList.filter(
    (item) => item.estado === "activo"
  ).length;

  const turnosHoy = turnosList.length;

  const produccionPorCategoria = produccionList.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.categoria] = (acc[item.categoria] ?? 0) + Number(item.real);
      return acc;
    },
    {}
  );

  const maxCategoria = Math.max(0, ...Object.values(produccionPorCategoria));

  const topProduccion = [...produccionList]
    .sort((a, b) => Number(b.real) - Number(a.real))
    .slice(0, 5);

  const topMerma = [...cierresList]
    .sort((a, b) => Number(b.merma) - Number(a.merma))
    .slice(0, 5);

  const errores = [
    productosError?.message,
    insumosCosteoError?.message,
    produccionError?.message,
    cierresError?.message,
    trabajadoresError?.message,
    turnosError?.message,
    permisosError?.message,
  ].filter(Boolean);

  const alertas: { text: string; tone: "danger" | "warning" | "neutral" }[] = [];

  insumosCompraSugerida
    .slice(0, 2)
    .forEach((item) => {
      alertas.push({
        text: `${item.nombre} está bajo stock mínimo.`,
        tone: "danger",
      });
    });

  productosList
    .filter(
      (item) =>
        Number(item.stock_maximo) > 0 &&
        Number(item.stock_actual) > Number(item.stock_maximo)
    )
    .slice(0, 1)
    .forEach((item) => {
      alertas.push({
        text: `${item.nombre} presenta sobre stock.`,
        tone: "warning",
      });
    });

  produccionList
    .filter((item) => item.estado === "Pendiente" || item.estado === "En proceso")
    .slice(0, 2)
    .forEach((item) => {
      alertas.push({
        text: `${item.producto} sigue en ${item.estado.toLowerCase()}.`,
        tone: "neutral",
      });
    });

  if (permisosPendientes > 0) {
    alertas.push({
      text: `Hay ${permisosPendientes} solicitud(es) de permiso pendiente(s) de revisión.`,
      tone: "warning",
    });
  }

  if (alertas.length === 0) {
    alertas.push({
      text: "No hay alertas activas por ahora.",
      tone: "neutral",
    });
  }

  const accionesOperativas: Array<{
    title: string;
    description: string;
    href: string;
    action: string;
    tone?: "danger" | "warning" | "neutral";
  }> = [];

  if (comprasSugeridas > 0) {
    accionesOperativas.push({
      title: "Revisar reposición",
      description: `${comprasSugeridas} insumo(s) requieren atención de compra.`,
      href: "/compras",
      action: "Abrir compras",
      tone: "danger",
    });
  }

  if (produccionPendiente > 0) {
    accionesOperativas.push({
      title: "Destrabar producción",
      description: `${produccionPendiente} registro(s) siguen sin cierre operativo.`,
      href: "/produccion",
      action: "Ver producción",
      tone: "warning",
    });
  }

  if (permisosPendientes > 0) {
    accionesOperativas.push({
      title: "Revisar solicitudes del equipo",
      description: `${permisosPendientes} solicitud(es) necesitan revisión.`,
      href: "/usuarios",
      action: "Ver personal",
      tone: "warning",
    });
  }

  if (accionesOperativas.length === 0) {
    accionesOperativas.push({
      title: "Operación sin bloqueos críticos",
      description: "No hay acciones urgentes detectadas para el perfil activo.",
      href: "/produccion",
      action: "Ver operación",
      tone: "neutral",
    });
  }

  const dashboardModules: DashboardCardItem[] = [
    {
      id: "recetas-costos",
      title: "Recetas y costos",
      description: "Costos unitarios, márgenes, precios sugeridos y subrecetas.",
      href: "/recetas-costos",
      metric: "Costeo",
      action: "Abrir recetas",
      icon: "📈",
      tone: "sky",
    },
    {
      id: "inventario",
      title: "Inventario",
      description: "Stock valorizado, mínimos, conteo físico y alertas.",
      href: "/inventario",
      metric: `${insumosCosteoList.length}`,
      action: "Abrir inventario",
      icon: "📦",
      tone: "emerald",
    },
    {
      id: "produccion",
      title: "Producción",
      description: "Planificación semanal, producción diaria, vendibles y mermas.",
      href: "/produccion",
      metric: `${produccionList.length}`,
      action: "Abrir producción",
      icon: "🏭",
      tone: "cyan",
    },
    {
      id: "personal",
      title: "Personal",
      description: "Trabajadores, turnos, asistencia y solicitudes de permiso.",
      href: "/usuarios",
      metric: `${trabajadoresActivos}`,
      action: "Ver personal",
      icon: "👥",
      tone: "violet",
    },
    {
      id: "configuracion",
      title: "Configuración",
      description: "Usuarios, perfiles, permisos y parámetros del sistema.",
      href: "/configuracion",
      metric: currentRole,
      action: "Configurar",
      icon: "⚙️",
      tone: "slate",
    },
    {
      id: "compras",
      title: "Compras",
      description: "Reposición sugerida, entradas reales y costo promedio.",
      href: "/compras",
      metric: `${comprasSugeridas}`,
      action: "Abrir compras",
      icon: "🧾",
      tone: "amber",
    },
    {
      id: "biblioteca",
      title: "Biblioteca",
      description: "Documentos, referencias internas y material operativo.",
      href: "/biblioteca",
      metric: "Base",
      action: "Abrir biblioteca",
      icon: "📚",
      tone: "rose",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto w-full max-w-[1480px] px-5 py-8 md:px-8 xl:py-12">
        <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-600">
              Sistema de gestión
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
              Emporio Flow
            </h1>
            <p className="mt-3 max-w-xl text-lg leading-7 text-slate-600">
              Control operativo, costos, inventario y producción diaria.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Perfil activo: {currentRole}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 md:justify-end">
            <a
              href="/configuracion"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Configuración
            </a>
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Salir
              </button>
            </form>
          </div>
        </header>

            {errores.length > 0 ? (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                Error cargando datos: {errores[0]}
              </div>
            ) : null}

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Prioridades de hoy
                  </h3>
                  <p className="text-sm text-slate-500">
                    Acciones recomendadas según datos operativos actuales.
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-500">{hoy}</p>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                {accionesOperativas.slice(0, 3).map((accion) => (
                  <ActionRow key={accion.title} {...accion} />
                ))}
              </div>
            </section>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Módulos del sistema
                  </h3>
                  <p className="text-sm text-slate-500">
                    Arrastra las cards para ordenar tu pantalla.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <DashboardCardGrid cards={dashboardModules} />
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Producción de hoy
                    </h3>
                    <p className="text-sm text-slate-500">
                      Vista resumida de producción registrada
                    </p>
                  </div>
                  <a
                    href="/produccion"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ver módulo
                  </a>
                </div>

                <div className="mt-4 space-y-3">
                  {produccionList.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No hay producción cargada para hoy.
                    </div>
                  ) : (
                    topProduccion.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{item.producto}</p>
                          <p className="text-xs text-slate-500">{item.categoria}</p>
                        </div>
                        <span className="font-semibold text-slate-900">
                          {item.real}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Alertas activas
                </h3>

                <div className="mt-4 space-y-3">
                  {alertas.map((alerta, index) => (
                    <AlertItem
                      key={`${alerta.text}-${index}`}
                      text={alerta.text}
                      tone={alerta.tone}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Producción por familia
                    </h3>
                    <p className="text-sm text-slate-500">
                      Cantidad real agrupada por categoría
                    </p>
                  </div>
                  <a
                    href="/produccion"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ver detalle
                  </a>
                </div>

                <div className="mt-5 space-y-4">
                  {Object.keys(produccionPorCategoria).length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No hay datos para graficar hoy.
                    </div>
                  ) : (
                    Object.entries(produccionPorCategoria).map(([label, value]) => (
                      <MiniBar
                        key={label}
                        label={label}
                        value={value}
                        max={maxCategoria}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Mermas del cierre
                    </h3>
                    <p className="text-sm text-slate-500">
                      Productos con mayor merma registrada hoy
                    </p>
                  </div>
                  <a
                    href="/cierre-turno"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ver cierre
                  </a>
                </div>

                <div className="mt-5 space-y-3">
                  {topMerma.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No hay mermas registradas hoy.
                    </div>
                  ) : (
                    topMerma.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <span className="text-slate-700">{item.producto}</span>
                        <span className="font-semibold text-slate-900">
                          {item.merma}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Resumen de personal
                </h3>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Trabajadores activos</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {trabajadoresActivos}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Turnos del día</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {turnosHoy}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Sectores cubiertos</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {new Set(turnosList.map((item) => item.sector_id)).size}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Resumen operativo del día
                </h3>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Producción registrada:{" "}
                    <span className="font-semibold">{produccionList.length}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Cierres registrados:{" "}
                    <span className="font-semibold">{cierresList.length}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Merma del día:{" "}
                    <span className="font-semibold">{totalMermaCierre}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Saldo de cierre:{" "}
                    <span className="font-semibold">{totalSaldoCierre}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Sobre stock:{" "}
                    <span className="font-semibold">{productosSobreStock}</span>
                  </div>
                </div>
              </div>
            </div>
      </div>
    </main>
  );
}
