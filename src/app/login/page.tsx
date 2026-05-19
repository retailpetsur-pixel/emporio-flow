import PasswordInput from "@/components/emporio/password-input";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const loginError = params?.error === "1";

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-600">
            Emporio Flow
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Accede con tu cuenta para ver tus módulos y permisos.
          </p>
        </div>

        {loginError ? (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Correo o contraseña incorrectos. Revisa los datos e inténtalo otra
            vez.
          </div>
        ) : null}

        <form action="/auth/sign-in" method="post" className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Correo
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400"
              placeholder="tu@correo.cl"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <PasswordInput />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
