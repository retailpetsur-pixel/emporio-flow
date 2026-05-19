"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import MobileNav from "@/components/emporio/mobile-nav";

type TopbarProps = {
  title: string;
  subtitle?: string;
};

export default function Topbar({ title, subtitle }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const esDashboard = pathname === "/dashboard";

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">{subtitle ?? "Bienvenido"}</p>
            <h2 className="text-2xl font-bold leading-tight text-slate-900 md:text-3xl">
              {title}
            </h2>
          </div>

          <div className="hidden items-center gap-3 xl:flex">
            {!esDashboard ? (
              <>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Volver
                </button>

                <Link
                  href="/dashboard"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm"
                >
                  Menú
                </Link>
              </>
            ) : null}

            <Link
              href="/configuracion"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm"
            >
              Configuración
            </Link>

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

        <div className="grid gap-3 xl:hidden">
          <MobileNav />

          <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-4">
            {!esDashboard ? (
              <>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Volver
                </button>

                <Link
                  href="/dashboard"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  Menú
                </Link>
              </>
            ) : null}

            <Link
              href="/configuracion"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Configuración
            </Link>

            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
