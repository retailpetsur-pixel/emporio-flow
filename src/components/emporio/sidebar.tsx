"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { isRole, itemsByRole, roleLabels, type Role } from "@/lib/permissions";

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>("trabajador");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setRole("trabajador");
        setLoading(false);
        return;
      }

      const { data: perfil } = await supabase
        .from("perfiles_usuario")
        .select("rol, activo")
        .eq("email", user.email)
        .eq("activo", true)
        .maybeSingle();

      const rol = String(perfil?.rol || "");

      if (isRole(rol)) {
        setRole(rol);
      } else {
        setRole("trabajador");
      }

      setLoading(false);
    }

    loadRole();
  }, []);

  const items = useMemo(() => itemsByRole[role], [role]);

  return (
    <aside className="hidden xl:flex xl:w-72 xl:min-h-screen xl:shrink-0 xl:flex-col xl:sticky xl:top-0 bg-slate-950 text-white border-r border-slate-900">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
          Sistema de Gestión
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight">Emporio Flow</h1>
        <p className="mt-2 text-sm text-slate-400">
          Control operativo y gestión interna
        </p>
      </div>

      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {(loading ? itemsByRole.trabajador : items).map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="block leading-5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Perfil activo</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {loading ? "Cargando..." : roleLabels[role]}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Menú ajustado por permisos
          </p>
        </div>
      </div>
    </aside>
  );
}
