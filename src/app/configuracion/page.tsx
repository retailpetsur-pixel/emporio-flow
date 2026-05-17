import Sidebar from "@/components/emporio/sidebar";
import Topbar from "@/components/emporio/topbar";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { supabase as publicSupabase } from "@/lib/supabase";
import {
  allPermissionItems,
  canAccess,
  isRole,
  itemsByRole,
  normalizePermissionHrefs,
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
  tienePerfil: boolean;
};

type PermisoRol = {
  rol: Role;
  modulos: string[];
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

async function buscarUsuarioAuthPorEmail(
  supabaseAdmin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string
) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    return { userId: null, error: error.message };
  }

  const usuario = data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );

  return { userId: usuario?.id ?? null, error: null };
}

async function guardarClaveAuth(email: string, clave: string, nombre: string) {
  const supabaseAdmin = createAdminClient();

  if (!supabaseAdmin) {
    volverConfiguracion(
      "error",
      "Falta configurar SUPABASE_SERVICE_ROLE_KEY para crear o cambiar claves desde el ERP."
    );
  }

  const { userId, error: buscarError } = await buscarUsuarioAuthPorEmail(
    supabaseAdmin,
    email
  );

  if (buscarError) {
    volverConfiguracion("error", `No pude revisar usuarios Auth: ${buscarError}`);
  }

  if (userId) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: clave,
      user_metadata: { nombre },
    });

    if (error) {
      volverConfiguracion("error", `No pude actualizar la clave: ${error.message}`);
    }

    return;
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: clave,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (error && !esUsuarioYaRegistrado(error.message)) {
    volverConfiguracion("error", `No pude crear el acceso: ${error.message}`);
  }
}

async function guardarPerfilSeguro({
  email,
  nombre,
  rol,
  activo,
}: {
  email: string;
  nombre: string;
  rol: Role;
  activo: boolean;
}) {
  const supabaseAdmin = createAdminClient();
  const supabase = supabaseAdmin ?? (await createServerClient());

  const { error } = await supabase
    .from("perfiles_usuario")
    .upsert({ email, nombre, rol, activo }, { onConflict: "email" });

  if (error) {
    volverConfiguracion("error", `No pude guardar el perfil: ${error.message}`);
  }
}

async function cambiarEstadoPerfilSeguro(email: string, activo: boolean) {
  const supabaseAdmin = createAdminClient();
  const supabase = supabaseAdmin ?? (await createServerClient());

  const { error } = await supabase
    .from("perfiles_usuario")
    .update({ activo })
    .eq("email", email);

  if (error) {
    volverConfiguracion("error", `No pude cambiar el estado: ${error.message}`);
  }
}

async function eliminarUsuarioSeguro(email: string) {
  const supabaseAdmin = createAdminClient();
  const supabase = supabaseAdmin ?? (await createServerClient());

  const { error: perfilError } = await supabase
    .from("perfiles_usuario")
    .delete()
    .eq("email", email);

  if (perfilError) {
    volverConfiguracion("error", `No pude eliminar el perfil: ${perfilError.message}`);
  }

  if (!supabaseAdmin) {
    return;
  }

  const { userId, error: buscarError } = await buscarUsuarioAuthPorEmail(
    supabaseAdmin,
    email
  );

  if (buscarError) {
    volverConfiguracion("error", `No pude revisar usuarios Auth: ${buscarError}`);
  }

  if (userId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      volverConfiguracion("error", `No pude eliminar el acceso: ${error.message}`);
    }
  }
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
    await guardarClaveAuth(email, clave, nombre);
  }

  await guardarPerfilSeguro({ email, nombre, rol, activo });

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

  await cambiarEstadoPerfilSeguro(email, activo);

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

  await guardarPerfilSeguro({ email, nombre, rol, activo });

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

async function cambiarClaveUsuario(formData: FormData) {
  "use server";

  const { role } = await obtenerRolActual();

  if (role !== "admin" && role !== "gerencia") {
    volverConfiguracion("error", "No tienes permisos para cambiar claves.");
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const nombre = String(formData.get("nombre") || "").trim() || email;
  const clave = String(formData.get("clave") || "").trim();

  if (!email) {
    volverConfiguracion("error", "Correo no válido.");
  }

  if (clave.length < 6) {
    volverConfiguracion("error", "La nueva clave debe tener al menos 6 caracteres.");
  }

  await guardarClaveAuth(email, clave, nombre);

  volverConfiguracion("ok", "Clave actualizada correctamente.");
}

async function eliminarUsuario(formData: FormData) {
  "use server";

  const { email: emailActual, role } = await obtenerRolActual();

  if (role !== "admin" && role !== "gerencia") {
    volverConfiguracion("error", "No tienes permisos para eliminar usuarios.");
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email) {
    volverConfiguracion("error", "Correo no válido.");
  }

  if (email === emailActual.toLowerCase()) {
    volverConfiguracion("error", "No puedes eliminar tu propio acceso.");
  }

  await eliminarUsuarioSeguro(email);

  revalidatePath("/configuracion");
  volverConfiguracion("ok", "Usuario eliminado correctamente.");
}

async function guardarPermisosRol(formData: FormData) {
  "use server";

  const { role } = await obtenerRolActual();

  if (role !== "admin" && role !== "gerencia") {
    volverConfiguracion("error", "No tienes permisos para modificar permisos.");
  }

  const rol = String(formData.get("rol") || "");

  if (!isRole(rol)) {
    volverConfiguracion("error", "Perfil no válido.");
  }

  const modulos = normalizePermissionHrefs(
    formData.getAll("modulos").map((value) => String(value))
  );

  if (rol === "admin") {
    const todos = allPermissionItems.map((item) => item.href);
    if (modulos.length !== todos.length) {
      volverConfiguracion("error", "Administrador debe mantener acceso completo.");
    }
  }

  const supabaseAdmin = createAdminClient();
  const supabase = supabaseAdmin ?? (await createServerClient());

  const { error } = await supabase
    .from("permisos_roles")
    .upsert({ rol, modulos }, { onConflict: "rol" });

  if (error) {
    volverConfiguracion(
      "error",
      `No pude guardar permisos. Revisa si existe la tabla permisos_roles: ${error.message}`
    );
  }

  revalidatePath("/configuracion");
  volverConfiguracion("ok", `Permisos de ${roleLabels[rol]} guardados.`);
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
  const supabaseAdmin = puedeConfigurar ? createAdminClient() : null;
  const consultaPerfiles = supabaseAdmin ?? supabase;
  const { data: perfilesProtegidos, error: errorProtegido } =
    await consultaPerfiles
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
      tienePerfil: true,
    }));

  const { data: usuariosAuth } = supabaseAdmin
    ? await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
    : { data: null };

  const emailsConPerfil = new Set(
    perfilesList.map((perfil) => perfil.email.toLowerCase())
  );

  const usuariosSinPerfil: PerfilUsuario[] = (usuariosAuth?.users ?? [])
    .filter((usuario) => usuario.email)
    .filter((usuario) => !emailsConPerfil.has(usuario.email!.toLowerCase()))
    .map((usuario) => {
      const nombre =
        typeof usuario.user_metadata?.nombre === "string"
          ? usuario.user_metadata.nombre
          : usuario.email!;

      return {
        email: usuario.email!,
        nombre,
        rol: "trabajador" as Role,
        activo: false,
        tienePerfil: false,
      };
    });

  const usuariosConfigurables = [...perfilesList, ...usuariosSinPerfil].sort(
    (a, b) => a.email.localeCompare(b.email)
  );

  const { data: permisosGuardados } = await consultaPerfiles
    .from("permisos_roles")
    .select("rol, modulos");

  const permisosPorRol = new Map<Role, string[]>();

  for (const rol of roles) {
    permisosPorRol.set(
      rol,
      itemsByRole[rol].map((item) => item.href)
    );
  }

  ((permisosGuardados ?? []) as PermisoRol[])
    .filter((permiso) => isRole(String(permiso.rol)))
    .forEach((permiso) => {
      permisosPorRol.set(permiso.rol, normalizePermissionHrefs(permiso.modulos));
    });

  const activos = usuariosConfigurables.filter((perfil) => perfil.activo).length;
  const administradores = usuariosConfigurables.filter(
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
                label="Accesos Auth"
                value={String(usuariosAuth?.users.length ?? perfilesList.length)}
                helper="Usuarios creados en Supabase Auth."
              />
            </div>

            <section className="grid gap-5 2xl:grid-cols-[380px_minmax(0,1fr)]">
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
                    Desde aquí puedes cambiar perfil, estado y clave. Los
                    usuarios sin perfil aparecen bloqueados hasta que guardes
                    sus permisos.
                  </p>
                </div>

                <div className="grid gap-3 p-5">
                  {usuariosConfigurables.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                      Aún no hay perfiles configurados.
                    </div>
                  ) : (
                    usuariosConfigurables.map((perfil) => (
                      <div
                        key={perfil.email}
                        className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(220px,1.1fr)_180px_120px_minmax(220px,0.8fr)] lg:items-start"
                      >
                        <form
                          id={`perfil-${perfil.email}`}
                          action={actualizarPerfilUsuario}
                          className="grid gap-2"
                        >
                          <input type="hidden" name="email" value={perfil.email} />
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Usuario
                          </label>
                          <input
                            name="nombre"
                            defaultValue={perfil.nombre}
                            disabled={!puedeConfigurar}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-emerald-400 disabled:bg-slate-100"
                          />
                          <p className="break-all text-xs text-slate-500">
                            {perfil.email}
                          </p>
                          {!perfil.tienePerfil ? (
                            <p className="text-xs font-semibold text-amber-600">
                              Sin perfil ERP
                            </p>
                          ) : null}
                        </form>

                        <div className="grid gap-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Perfil
                          </label>
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
                        </div>

                        <div className="grid gap-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Estado
                          </label>
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

                        <div className="grid gap-2">
                          <button
                            type="submit"
                            form={`perfil-${perfil.email}`}
                            disabled={!puedeConfigurar}
                            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Guardar cambios
                          </button>

                          <form action={cambiarClaveUsuario} className="grid gap-2">
                            <input type="hidden" name="email" value={perfil.email} />
                            <input
                              type="hidden"
                              name="nombre"
                              value={perfil.nombre}
                            />
                            <input
                              name="clave"
                              type="password"
                              minLength={6}
                              placeholder="Nueva clave"
                              disabled={!puedeConfigurar}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 disabled:bg-slate-100"
                            />
                            <button
                              type="submit"
                              disabled={!puedeConfigurar}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              Cambiar clave
                            </button>
                          </form>

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
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
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                {perfil.activo ? "Bloquear" : "Activar"}
                              </button>
                            </form>

                            <form action={eliminarUsuario}>
                              <input
                                type="hidden"
                                name="email"
                                value={perfil.email}
                              />
                              <button
                                type="submit"
                                disabled={!puedeConfigurar}
                                className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                Eliminar
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
                    Activa o desactiva los módulos disponibles para cada
                    perfil. Administrador mantiene acceso completo.
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  {allPermissionItems.length} módulos del sistema
                </p>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-5">
                {roles.map((rol) => (
                  <form
                    key={rol}
                    action={guardarPermisosRol}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <input type="hidden" name="rol" value={rol} />
                    <h3 className="font-bold text-slate-950">
                      {roleLabels[rol]}
                    </h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                      {roleDescriptions[rol]}
                    </p>
                    <div className="mt-4 grid gap-2">
                      {allPermissionItems.map((item) => {
                        const allowed =
                          permisosPorRol.get(rol)?.includes(item.href) ??
                          canAccess(rol, item.href);

                        return (
                          <label
                            key={item.href}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                              allowed
                                ? "border-emerald-100 bg-white text-slate-800"
                                : "border-slate-200 bg-slate-100 text-slate-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              name="modulos"
                              value={item.href}
                              defaultChecked={allowed || rol === "admin"}
                              disabled={rol === "admin" || !puedeConfigurar}
                              className="h-4 w-4"
                            />
                            {rol === "admin" ? (
                              <input
                                type="hidden"
                                name="modulos"
                                value={item.href}
                              />
                            ) : null}
                            <span className="font-semibold">
                              {allowed ? "Si" : "No"}
                            </span>{" "}
                            {item.label}
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="submit"
                      disabled={!puedeConfigurar}
                      className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Guardar permisos
                    </button>
                  </form>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
