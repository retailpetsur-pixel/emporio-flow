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
    <header className="border-b border-slate-200 bg-white px-3 py-3 sm:px-4 md:px-6 md:py-4">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs leading-5 text-slate-500 sm:text-sm">
              {subtitle ?? "Bienvenido"}
            </p>
            <h2 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl md:text-3xl">
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:px-4 sm:py-3"
                >
                  Volver
                </button>

                <Link
                  href="/dashboard"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-white sm:px-4 sm:py-3"
                >
                  Menú
                </Link>
              </>
            ) : null}

            <Link
              href="/configuracion"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-white sm:px-4 sm:py-3"
            >
              Configuración
            </Link>

            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:px-4 sm:py-3"
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
