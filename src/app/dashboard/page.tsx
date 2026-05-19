import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { supabase } from "@/lib/supabase";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

type Role = "admin" | "gerencia" | "supervisor" | "trabajador" | "compras";
type IconName =
  | "alert"
  | "box"
  | "cart"
  | "chart"
  | "check"
  | "clock"
  | "gear"
  | "key"
  | "list"
  | "production"
  | "users";

function DashboardIcon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const common = {
    className: `h-5 w-5 ${className}`,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  const paths: Record<IconName, ReactNode> = {
    alert: (
      <>
        <path d="M12 4 3 20h18L12 4Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </>
    ),
    box: (
      <>
        <path d="M21 8 12 3 3 8l9 5 9-5Z" />
        <path d="M3 8v8l9 5 9-5V8" />
        <path d="M12 13v8" />
      </>
    ),
    cart: (
      <>
        <path d="M5 6h16l-2 8H7L5 3H3" />
        <path d="M8 20h.01" />
        <path d="M17 20h.01" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15l3-4 3 2 4-6" />
      </>
    ),
    check: (
      <>
        <path d="M20 6 9 17l-5-5" />
        <path d="M4 20h16" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.9-1.1L14.3 3h-4.6l-.4 2.9A7 7 0 0 0 7.4 7L5 6 3 9.4l2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.1l-2 1.5L5 18l2.4-1a7 7 0 0 0 1.9 1.1l.4 2.9h4.6l.4-2.9a7 7 0 0 0 1.9-1.1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1.1Z" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="14" r="4" />
        <path d="M12 14h8" />
        <path d="M17 14v3" />
        <path d="M20 14v2" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
    production: (
      <>
        <path d="M4 18V8l8-4 8 4v10" />
        <path d="M8 18v-6h8v6" />
        <path d="M10 9h4" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M16 11a3 3 0 0 0 0-6" />
        <path d="M18 20a5 5 0 0 0-3-4.5" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function moduleIconForHref(href: string): IconName {
  const icons: Record<string, IconName> = {
    "/inventario": "box",
    "/recetas-costos": "chart",
    "/compras": "cart",
    "/produccion": "production",
    "/cierre-turno": "check",
    "/usuarios": "users",
    "/configuracion": "gear",
  };

  return icons[href] ?? "list";
}

function StatCard({
  title,
  value,
  helper,
  icon,
  tone = "slate",
}: {
  title: string;
  value: string;
  helper?: string;
  icon: IconName;
  tone?: "slate" | "emerald" | "amber" | "red";
}) {
  const toneStyles = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-slate-500">{title}</p>
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneStyles[tone]}`}
        >
          <DashboardIcon name={icon} />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function ModuleCard({
  title,
  description,
  href,
  metric,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  metric?: string;
  icon: IconName;
}) {
  return (
    <a
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md xl:p-5"
    >
      <div className="flex min-h-36 flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
              <DashboardIcon name={icon} />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-5 text-slate-500">
                {description}
              </p>
            </div>
          </div>
          {metric ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {metric}
            </span>
          ) : null}
        </div>

        <span className="inline-flex w-fit rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-emerald-700">
          Abrir
        </span>
      </div>
    </a>
  );
}

function ModuleGroupCard({
  title,
  description,
  metric,
  icon,
  links,
}: {
  title: string;
  description: string;
  metric?: string;
  icon: IconName;
  links: Array<{ label: string; href: string; icon: IconName }>;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm xl:p-5">
      <div className="flex min-h-40 flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <DashboardIcon name={icon} />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 max-w-xl text-sm leading-5 text-slate-500">
                {description}
              </p>
            </div>
          </div>
          {metric ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {metric}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {links.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                index === 0
                  ? "bg-emerald-700 text-white hover:bg-emerald-800"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <DashboardIcon name={link.icon} className="h-4 w-4" />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    { data: produccion, error: produccionError },
    { data: cierres, error: cierresError },
    { data: trabajadores, error: trabajadoresError },
    { data: turnos, error: turnosError },
    { data: permisos, error: permisosError },
  ] = await Promise.all([
    supabase.from("productos").select("*").order("created_at", { ascending: true }),
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
  const produccionList = produccion ?? [];
  const cierresList = cierres ?? [];
  const trabajadoresList = trabajadores ?? [];
  const turnosList = turnos ?? [];
  const permisosList = permisos ?? [];


  const productosCriticos = productosList.filter(
    (item) => item.estado === "critical"
  ).length;

  const productosSobreStock = productosList.filter(
    (item) =>
      Number(item.stock_maximo) > 0 &&
      Number(item.stock_actual) > Number(item.stock_maximo)
  ).length;

  const comprasSugeridas = productosList.filter(
    (item) => Number(item.stock_actual) <= Number(item.stock_minimo)
  ).length;

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
    produccionError?.message,
    cierresError?.message,
    trabajadoresError?.message,
    turnosError?.message,
    permisosError?.message,
  ].filter(Boolean);

  const alertas: { text: string; tone: "danger" | "warning" | "neutral" }[] = [];

  productosList
    .filter((item) => item.estado === "critical")
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

  const moduleCardsByRole: Record<
    Role,
    Array<{
      title: string;
      description: string;
      href: string;
      metric?: string;
    }>
  > = {
    admin: [
      {
        title: "Inventario",
        description: "Control de stock, mínimos, máximos y ajustes rápidos.",
        href: "/inventario",
        metric: `${productosList.length} ítems`,
      },
      {
        title: "Compras",
        description: "Compras sugeridas automáticas según faltantes reales.",
        href: "/compras",
        metric: `${comprasSugeridas} sugeridas`,
      },
      {
        title: "Producción",
        description: "Planificación y ejecución diaria de producción.",
        href: "/produccion",
        metric: `${produccionList.length} registros`,
      },
      {
        title: "Cierre de turno",
        description: "Saldo vendible, merma y observaciones del turno.",
        href: "/cierre-turno",
        metric: `${cierresList.length} cierres`,
      },
      {
        title: "Personal",
        description: "Trabajadores, sectores, turnos, asistencia y permisos.",
        href: "/usuarios",
        metric: `${trabajadoresActivos} activos`,
      },
      {
        title: "Recetas y Costeo",
        description: "Costos unitarios, márgenes y precios sugeridos.",
        href: "/recetas-costos",
        metric: "Activo",
      },
      {
        title: "Configuración",
        description: "Usuarios, perfiles y permisos del ERP.",
        href: "/configuracion",
        metric: "Admin",
      },
    ],
    gerencia: [
      {
        title: "Inventario",
        description: "Stock crítico y quiebres potenciales.",
        href: "/inventario",
        metric: `${productosCriticos} críticos`,
      },
      {
        title: "Compras",
        description: "Seguimiento de compras y faltantes.",
        href: "/compras",
        metric: `${comprasSugeridas} sugeridas`,
      },
      {
        title: "Producción",
        description: "Producción diaria y ajustes operativos.",
        href: "/produccion",
        metric: `${produccionPendiente} pendientes`,
      },
      {
        title: "Cierre de turno",
        description: "Revisión de saldo vendible y merma.",
        href: "/cierre-turno",
        metric: `Merma ${totalMermaCierre}`,
      },
      {
        title: "Personal",
        description: "Permisos, turnos y cobertura del equipo.",
        href: "/usuarios",
        metric: `${permisosPendientes} permisos`,
      },
      {
        title: "Recetas y Costeo",
        description: "Márgenes, costos y precios sugeridos.",
        href: "/recetas-costos",
        metric: "Estratégico",
      },
      {
        title: "Configuración",
        description: "Usuarios, perfiles y permisos del ERP.",
        href: "/configuracion",
        metric: "Gerencia",
      },
    ],
    supervisor: [
      {
        title: "Producción",
        description: "Estado del día y seguimiento de ejecución.",
        href: "/produccion",
        metric: `${produccionPendiente} pendientes`,
      },
      {
        title: "Inventario",
        description: "Insumos críticos y sobre stock.",
        href: "/inventario",
        metric: `${productosCriticos} críticos`,
      },
      {
        title: "Compras",
        description: "Faltantes operativos del día.",
        href: "/compras",
        metric: `${comprasSugeridas} sugeridas`,
      },
      {
        title: "Cierre de turno",
        description: "Registro y revisión de saldo.",
        href: "/cierre-turno",
        metric: `${totalSaldoCierre} saldo`,
      },
      {
        title: "Recetas y Costeo",
        description: "Consulta costos y referencias de producción.",
        href: "/recetas-costos",
        metric: "Consulta",
      },
    ],
    trabajador: [
      {
        title: "Mis turnos",
        description: "Consulta tus turnos y sector asignado.",
        href: "/usuarios",
        metric: `${turnosHoy} hoy`,
      },
      {
        title: "Producción proyectada",
        description: "Revisión rápida de la producción del día.",
        href: "/produccion",
        metric: `${produccionList.length} registros`,
      },
      {
        title: "Mis permisos",
        description: "Estado de solicitudes de permiso.",
        href: "/usuarios",
        metric: `${permisosPendientes} pendientes`,
      },
      {
        title: "Asistencia",
        description: "Consulta atrasos, faltas y registros.",
        href: "/usuarios",
        metric: "Mi historial",
      },
    ],
    compras: [
      {
        title: "Inventario",
        description: "Stock, valorización y mínimos de insumos.",
        href: "/inventario",
        metric: `${productosList.length} ítems`,
      },
      {
        title: "Compras",
        description: "Registro de compras y actualización de costos.",
        href: "/compras",
        metric: `${comprasSugeridas} sugeridas`,
      },
      {
        title: "Producción",
        description: "Consulta operativa de producción.",
        href: "/produccion",
        metric: `${produccionList.length} registros`,
      },
    ],
  };

  const visibleModules = moduleCardsByRole[currentRole];
  const moduleByHref = new Map(
    visibleModules.map((module) => [module.href, module])
  );
  const gestionCostosLinks = ["/inventario", "/recetas-costos"]
    .map((href) => moduleByHref.get(href))
    .filter(Boolean) as typeof visibleModules;
  const operacionLinks = ["/produccion", "/cierre-turno"]
    .map((href) => moduleByHref.get(href))
    .filter(Boolean) as typeof visibleModules;
  const groupedHrefs = [
    ...gestionCostosLinks.map((module) => module.href),
    ...operacionLinks.map((module) => module.href),
  ];
  const secondaryModules = visibleModules.filter(
    (module) => !groupedHrefs.includes(module.href) && module.href !== "/reportes"
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1">
          <Topbar
            title="Dashboard General"
            subtitle="Centro de mando operativo"
          />

          <div className="p-6">
            {errores.length > 0 ? (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                Error cargando datos: {errores[0]}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Productos críticos"
                value={String(productosCriticos)}
                helper="Bajo stock mínimo"
                icon="alert"
                tone={productosCriticos > 0 ? "red" : "emerald"}
              />
              <StatCard
                title="Producción pendiente"
                value={String(produccionPendiente)}
                helper="Pendiente o en proceso"
                icon="clock"
                tone={produccionPendiente > 0 ? "amber" : "emerald"}
              />
              <StatCard
                title="Compras sugeridas"
                value={String(comprasSugeridas)}
                helper="Stock actual <= mínimo"
                icon="cart"
                tone={comprasSugeridas > 0 ? "amber" : "emerald"}
              />
              <StatCard
                title="Permisos pendientes"
                value={String(permisosPendientes)}
                helper="Pendiente o aprobación parcial"
                icon="key"
                tone={permisosPendientes > 0 ? "amber" : "emerald"}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Módulos del sistema
                  </h3>
                  <p className="text-sm text-slate-500">
                    Accesos rápidos según el perfil activo
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Rol: {currentRole}
                </span>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {gestionCostosLinks.length > 0 ? (
                  <ModuleGroupCard
                    title="Inventario, recetas y costos"
                    description="Stock valorizado, insumos maestros, recetas, márgenes y costos de producción."
                    metric={`${productosList.length} ítems`}
                    icon="box"
                    links={gestionCostosLinks.map((module) => ({
                      label:
                        module.href === "/recetas-costos"
                          ? "Recetas y costos"
                          : module.title,
                      href: module.href,
                      icon: moduleIconForHref(module.href),
                    }))}
                  />
                ) : null}

                {operacionLinks.length > 0 ? (
                  <ModuleGroupCard
                    title="Producción y cierre de turno"
                    description="Planificación semanal, producción diaria, vendibles, mermas y cierre operativo."
                    metric={`${produccionList.length} registros`}
                    icon="production"
                    links={operacionLinks.map((module) => ({
                      label: module.title,
                      href: module.href,
                      icon: moduleIconForHref(module.href),
                    }))}
                  />
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {secondaryModules.map((module) => (
                  <ModuleCard
                    key={module.title}
                    title={module.title}
                    description={module.description}
                    href={module.href}
                    metric={module.metric}
                    icon={moduleIconForHref(module.href)}
                  />
                ))}
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
                    <p className="text-sm text-slate-500">Permisos pendientes</p>
                    <p className="mt-2 text-lg font-semibold text-amber-600">
                      {permisosPendientes}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Sectores cubiertos</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {new Set((turnosList ?? []).map((item: any) => item.sector_id)).size}
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
                    Compras sugeridas:{" "}
                    <span className="font-semibold">{comprasSugeridas}</span>
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
        </section>
      </div>
    </main>
  );
}
