import MobileNav from "@/components/emporio/mobile-nav";

type TopbarProps = {
  title: string;
  subtitle?: string;
};

export default function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{subtitle ?? "Bienvenido"}</p>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              Administración
            </div>

            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Salir
              </button>
            </form>
          </div>
        </div>

        <div className="flex items-center justify-between md:hidden">
          <MobileNav />

          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              Admin
            </div>

            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}