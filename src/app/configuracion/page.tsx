import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { supabase as publicSupabase } from "@/lib/supabase";
import {
  allPermissionItems,
  canAccess,
  isRole,
  roleDescriptions,
  roleLabels,
  roles,
  type Role,
} from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type PerfilUsuario = {
  email: string;
  nombre: string;
  rol: Role;
  activo: boolean;
};

type ConfiguracionPageProps = {
  searchParams?: Promise<{
    estado?: string;
    mensaje?: string;
  }>;
};

function volverConfiguracion(estado: "ok" | "error", mensaje: string): never {
  redirect(
    `/configuracion?estado=${estado}&mensaje=${encodeURIComponent(mensaje)}`
  );
}

function esUsuarioYaRegistrado(message: string) {
  const normalizado = message.toLowerCase();

  return (
    normalizado.includes("already") ||
    normalizado.includes("registered") ||
    normalizado.includes("duplicate")
  );
}

async function obtenerRolActual() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const { data: perfilProtegido } = await supabase
    .from("perfiles_usuario")
    .select("rol, activo")
    .eq("email", user.email)
    .eq("activo", true)
    .maybeSingle();

  const { data: perfilPublico } = perfilProtegido
    ? { data: null }
    : await publicSupabase
        .from("perfiles_usuario")
        .select("rol, activo")
        .eq("email", user.email)
        .eq("activo", true)
        .maybeSingle();

  const perfil = perfilProtegido ?? perfilPublico;
  const rol = String(perfil?.rol || "");

  return {
    email: user.email,
    role: isRole(rol) ? rol : ("trabajador" as Role),
  };
}

async function guardarPerfil(formData: FormData) {
  "use server";

  const { role } = await obtenerRolActual();

  if (role !== "admin" && role !== "gerencia") {
    volverConfiguracion("error", "No tienes permisos para modificar perfiles.");
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const nombre = String(formData.get("nombre") || "").trim();
  const rol = String(formData.get("rol") || "");
  const activo = formData.get("activo") === "on";
  const clave = String(formData.get("clave") || "").trim();

  if (!email || !nombre || !isRole(rol)) {
    volverConfiguracion("error", "Nombre, correo o perfil no válido.");
  }

  if (clave && clave.length < 6) {
    volverConfiguracion("error", "La clave debe tener al menos 6 caracteres.");
  }

  if (clave) {
    const supabaseAdmin = createAdminClient();

    if (!supabaseAdmin) {
      volverConfiguracion(
        "error",
        "Falta configurar SUPABASE_SERVICE_ROLE_KEY para crear usuarios con clave desde el ERP."
      );
    }

    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: clave,
      email_confirm: true,
      user_metadata: { nombre },
    });

    if (authError && !esUsuarioYaRegistrado(authError.message)) {
      volverConfiguracion(
        "error",
        `No pude crear el acceso: ${authError.message}`
      );
    }
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("perfiles_usuario")
    .upsert({ email, nombre, rol, activo }, { onConflict: "email" });

  if (error) {
    volverConfiguracion("error", `No pude guardar el perfil: ${error.message}`);
  }

  revalidatePath("/configuracion");
  volverConfiguracion(
    "ok",
    clave
      ? "Usuario y perfil guardados correctamente."
      : "Perfil guardado correctamente."
  );
}

async function cambiarEstadoPerfil(formData: FormData) {
  "use server";

  const { email: emailActual, role } = await obtenerRolActual();

  if (role !== "admin" && role !== "gerencia") {
    volverConfiguracion("error", "No tienes permisos para modificar perfiles.");
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const activo = formData.get("activo") === "true";

  if (!email) {
    volverConfiguracion("error", "Correo no válido.");
  }

  if (email === emailActual.toLowerCase() && !activo) {
    volverConfiguracion("error", "No puedes desactivar tu propio acceso.");
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("perfiles_usuario")
    .update({ activo })
    .eq("email", email);

  if (error) {
    volverConfiguracion("error", `No pude cambiar el estado: ${error.message}`);
  }

  revalidatePath("/configuracion");
  volverConfiguracion("ok", activo ? "Usuario activado." : "Usuario bloqueado.");
}

async function actualizarPerfilUsuario(formData: FormData) {
  "use server";

  const { email: emailActual, role } = await obtenerRolActual();

  if (role !== "admin" && role !== "gerencia") {
    volverConfiguracion("error", "No tienes permisos para modificar perfiles.");
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const nombre = String(formData.get("nombre") || "").trim();
  const rol = String(formData.get("rol") || "");
  const activo = formData.get("activo") === "on";

  if (!email || !nombre || !isRole(rol)) {
    volverConfiguracion("error", "Nombre, correo o perfil no válido.");
  }

  if (email === emailActual.toLowerCase() && !activo) {
    volverConfiguracion("error", "No puedes desactivar tu propio acceso.");
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("perfiles_usuario")
    .update({ nombre, rol, activo })
    .eq("email", email);

  if (error) {
    volverConfiguracion(
      "error",
      `No pude actualizar el perfil: ${error.message}`
    );
  }

  revalidatePath("/configuracion");
  volverConfiguracion("ok", "Perfil actualizado correctamente.");
}

async function enviarCambioClave(formData: FormData) {
  "use server";

  const { role } = await obtenerRolActual();

  if (role !== "admin" && role !== "gerencia") {
    volverConfiguracion(
      "error",
      "No tienes permisos para enviar cambios de clave."
    );
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email) {
    volverConfiguracion("error", "Correo no válido.");
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    volverConfiguracion(
      "error",
      `No pude enviar el cambio de clave: ${error.message}`
    );
  }

  volverConfiguracion("ok", "Correo de cambio de clave enviado.");
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function StatusBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        activo
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-red-100 bg-red-50 text-red-700"
      }`}
    >
      {activo ? "Activo" : "Bloqueado"}
    </span>
  );
}

export default async function ConfiguracionPage({
  searchParams,
}: ConfiguracionPageProps) {
  const params = await searchParams;
  const mensaje = params?.mensaje;
  const estado = params?.estado === "ok" ? "ok" : "error";
  const { role: currentRole } = await obtenerRolActual();
  const puedeConfigurar = currentRole === "admin" || currentRole === "gerencia";

  const supabase = await createServerClient();
  const { data: perfilesProtegidos, error: errorProtegido } = await supabase
    .from("perfiles_usuario")
    .select("email, nombre, rol, activo")
    .order("email", { ascending: true });

  const { data: perfilesPublicos, error: errorPublico } =
    perfilesProtegidos && perfilesProtegidos.length > 0
      ? { data: null, error: null }
      : await publicSupabase
          .from("perfiles_usuario")
          .select("email, nombre, rol, activo")
          .order("email", { ascending: true });

  const perfiles = perfilesProtegidos?.length
    ? perfilesProtegidos
    : perfilesPublicos;
  const error = errorProtegido ?? errorPublico;

  const perfilesList: PerfilUsuario[] = (perfiles ?? [])
    .filter((perfil) => isRole(String(perfil.rol)))
    .map((perfil) => ({
      email: String(perfil.email),
      nombre: String(perfil.nombre || perfil.email),
      rol: perfil.rol as Role,
      activo: Boolean(perfil.activo),
    }));

  const activos = perfilesList.filter((perfil) => perfil.activo).length;
  const administradores = perfilesList.filter(
    (perfil) => perfil.rol === "admin" || perfil.rol === "gerencia"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1">
          <Topbar
            title="Configuración"
            subtitle="Usuarios, perfiles y permisos"
          />

          <div className="mx-auto grid w-full max-w-7xl gap-5 p-4 md:p-6">
            {!puedeConfigurar ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                Tu perfil actual es {roleLabels[currentRole]}. Puedes ver esta
                pantalla, pero solo Administrador o Gerencia pueden modificar
                usuarios y permisos.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
                No pude cargar perfiles_usuario: {error.message}
              </div>
            ) : null}

            {mensaje ? (
              <div
                className={`rounded-2xl border p-5 text-sm ${
                  estado === "ok"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-red-100 bg-red-50 text-red-700"
                }`}
              >
                {mensaje}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Perfiles creados"
                value={String(perfilesList.length)}
                helper="Correos con perfil dentro de Emporio Flow."
              />
              <StatCard
                label="Usuarios activos"
                value={String(activos)}
                helper="Pueden ver los módulos asignados."
              />
              <StatCard
                label="Administración"
                value={String(administradores)}
                helper="Perfiles con acceso a configuración."
              />
            </div>

            <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
                    Nuevo acceso
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    Crear o actualizar perfil
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Ingresa el correo del usuario y define qué tipo de acceso
                    tendrá. Si agregas una clave inicial, también se crea su
                    acceso real para iniciar sesión.
                  </p>
                </div>

                <form action={guardarPerfil} className="mt-5 grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Nombre
                    </label>
                    <input
                      name="nombre"
                      type="text"
                      required
                      disabled={!puedeConfigurar}
                      placeholder="Nombre del usuario"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Correo del usuario
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      disabled={!puedeConfigurar}
                      placeholder="persona@emporio.cl"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Perfil
                    </label>
                    <select
                      name="rol"
                      required
                      disabled={!puedeConfigurar}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 disabled:bg-slate-100"
                    >
                      {roles.map((rol) => (
                        <option key={rol} value={rol}>
                          {roleLabels[rol]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Clave inicial
                    </label>
                    <input
                      name="clave"
                      type="password"
                      minLength={6}
                      disabled={!puedeConfigurar}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 disabled:bg-slate-100"
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Úsala solo al crear el acceso por primera vez. Después el
                      usuario puede cambiarla desde el correo de cambio de
                      clave.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    <input
                      name="activo"
                      type="checkbox"
                      defaultChecked
                      disabled={!puedeConfigurar}
                      className="h-4 w-4"
                    />
                    Usuario activo
                  </label>

                  <button
                    type="submit"
                    disabled={!puedeConfigurar}
                    className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Guardar usuario
                  </button>
                </form>

                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                  El perfil define permisos dentro del ERP. La clave se guarda
                  en Supabase Auth; no se almacena en las tablas del sistema.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-2xl font-bold text-slate-950">
                    Usuarios configurados
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Desde aquí puedes cambiar el perfil o bloquear accesos.
                  </p>
                </div>

                <div className="erp-scroll">
                  <table className="min-w-[920px] w-full border-collapse text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Usuario</th>
                        <th className="px-5 py-4">Perfil</th>
                        <th className="px-5 py-4">Estado</th>
                        <th className="px-5 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {perfilesList.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-8 text-sm text-slate-500"
                          >
                            Aún no hay perfiles configurados.
                          </td>
                        </tr>
                      ) : (
                        perfilesList.map((perfil) => (
                          <tr key={perfil.email}>
                            <td className="px-5 py-4">
                              <form
                                id={`perfil-${perfil.email}`}
                                action={actualizarPerfilUsuario}
                                className="grid gap-2"
                              >
                                <input
                                  type="hidden"
                                  name="email"
                                  value={perfil.email}
                                />
                                <input
                                  name="nombre"
                                  defaultValue={perfil.nombre}
                                  disabled={!puedeConfigurar}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-emerald-400 disabled:bg-slate-100"
                                />
                                <p className="text-xs text-slate-500">
                                  {perfil.email}
                                </p>
                              </form>
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                              <select
                                name="rol"
                                form={`perfil-${perfil.email}`}
                                defaultValue={perfil.rol}
                                disabled={!puedeConfigurar}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 disabled:bg-slate-100"
                              >
                                {roles.map((rol) => (
                                  <option key={rol} value={rol}>
                                    {roleLabels[rol]}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-5 py-4">
                              <div className="grid gap-2">
                                <StatusBadge activo={perfil.activo} />
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                  <input
                                    name="activo"
                                    form={`perfil-${perfil.email}`}
                                    type="checkbox"
                                    defaultChecked={perfil.activo}
                                    disabled={!puedeConfigurar}
                                  />
                                  Activo
                                </label>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="grid gap-2">
                                <button
                                  type="submit"
                                  form={`perfil-${perfil.email}`}
                                  disabled={!puedeConfigurar}
                                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  Guardar
                                </button>

                                <form action={enviarCambioClave}>
                                  <input
                                    type="hidden"
                                    name="email"
                                    value={perfil.email}
                                  />
                                  <button
                                    type="submit"
                                    disabled={!puedeConfigurar}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    Enviar cambio clave
                                  </button>
                                </form>

                                <form action={cambiarEstadoPerfil}>
                                  <input
                                    type="hidden"
                                    name="email"
                                    value={perfil.email}
                                  />
                                  <input
                                    type="hidden"
                                    name="activo"
                                    value={String(!perfil.activo)}
                                  />
                                  <button
                                    type="submit"
                                    disabled={!puedeConfigurar}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    {perfil.activo ? "Bloquear" : "Activar"}
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
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    Mapa de permisos
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Resumen visual de qué módulos ve cada perfil en el menú.
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  {allPermissionItems.length} módulos del sistema
                </p>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-5">
                {roles.map((rol) => (
                  <div
                    key={rol}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <h3 className="font-bold text-slate-950">
                      {roleLabels[rol]}
                    </h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                      {roleDescriptions[rol]}
                    </p>
                    <div className="mt-4 grid gap-2">
                      {allPermissionItems.map((item) => {
                        const allowed = canAccess(rol, item.href);

                        return (
                          <div
                            key={item.href}
                            className={`rounded-xl border px-3 py-2 text-sm ${
                              allowed
                                ? "border-emerald-100 bg-white text-slate-800"
                                : "border-slate-200 bg-slate-100 text-slate-400"
                            }`}
                          >
                            <span className="font-semibold">
                              {allowed ? "Si" : "No"}
                            </span>{" "}
                            {item.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
