export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-slate-950 text-white p-6 hidden md:flex md:flex-col">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
              Sistema de Gestión
            </p>
            <h1 className="text-3xl font-bold mt-3">Emporio Flow</h1>
            <p className="text-sm text-slate-400 mt-2">
              Control operativo y gestión interna
            </p>
          </div>

          <nav className="mt-10 space-y-2">
            <button className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-left font-medium text-black">
              Dashboard
            </button>
            <button className="w-full rounded-xl px-4 py-3 text-left text-slate-300 hover:bg-slate-800 transition">
              Producción
            </button>
            <button className="w-full rounded-xl px-4 py-3 text-left text-slate-300 hover:bg-slate-800 transition">
              Cierre de turno
            </button>
            <button className="w-full rounded-xl px-4 py-3 text-left text-slate-300 hover:bg-slate-800 transition">
              Inventario
            </button>
            <button className="w-full rounded-xl px-4 py-3 text-left text-slate-300 hover:bg-slate-800 transition">
              Compras
            </button>
            <button className="w-full rounded-xl px-4 py-3 text-left text-slate-300 hover:bg-slate-800 transition">
              Recetas y costos
            </button>
            <button className="w-full rounded-xl px-4 py-3 text-left text-slate-300 hover:bg-slate-800 transition">
              Reportes
            </button>
          </nav>

          <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Estado del sistema</p>
            <p className="mt-2 text-lg font-semibold text-white">MVP en construcción</p>
          </div>
        </aside>

        <section className="flex-1">
          <header className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Bienvenido</p>
                <h2 className="text-2xl font-bold">Dashboard General</h2>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                Administración
              </div>
            </div>
          </header>

          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <p className="text-sm text-slate-500">Productos críticos</p>
                <p className="mt-3 text-3xl font-bold">7</p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <p className="text-sm text-slate-500">Producción pendiente</p>
                <p className="mt-3 text-3xl font-bold">18</p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <p className="text-sm text-slate-500">Compras sugeridas</p>
                <p className="mt-3 text-3xl font-bold">12</p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <p className="text-sm text-slate-500">Alertas activas</p>
                <p className="mt-3 text-3xl font-bold">4</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 xl:col-span-2">
                <h3 className="text-lg font-semibold">Producción de hoy</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span>Empanada Pino</span>
                    <span className="font-semibold">42 unidades</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span>Empanada Mechada</span>
                    <span className="font-semibold">30 unidades</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span>Muffin</span>
                    <span className="font-semibold">12 unidades</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span>Bizcocho Base</span>
                    <span className="font-semibold">3 unidades</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold">Alertas</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                    Mozzarella bajo mínimo
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                    Cebolla en sobre stock
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    Pedido de harina pendiente
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