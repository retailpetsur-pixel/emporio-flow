"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  allPermissionItems,
  isRole,
  itemsByRole,
  roleLabels,
  type PermissionItem,
  type Role,
} from "@/lib/permissions";

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>("trabajador");
  const [customItems, setCustomItems] = useState<PermissionItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem("emporio-sidebar-collapsed") === "true"
  );

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

        const { data: permisos } = await supabase
          .from("permisos_roles")
          .select("modulos")
          .eq("rol", rol)
          .maybeSingle();

        const modulos = Array.isArray(permisos?.modulos)
          ? permisos.modulos.map(String)
          : null;

        if (modulos) {
          setCustomItems(
            allPermissionItems.filter((item) => modulos.includes(item.href))
          );
        }
      } else {
        setRole("trabajador");
      }

      setLoading(false);
    }

    loadRole();
  }, []);

  const items = useMemo(
    () => customItems ?? itemsByRole[role],
    [customItems, role]
  );

  return (
    <aside
      className={`hidden xl:sticky xl:top-0 xl:flex xl:min-h-screen xl:shrink-0 xl:flex-col border-r border-slate-900 bg-slate-950 text-white transition-all duration-200 ${
        collapsed ? "xl:w-24" : "xl:w-72"
      }`}
    >
      <div className="border-b border-slate-800 px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {collapsed ? (
              <h1 className="rounded-xl bg-slate-900 px-3 py-2 text-center text-lg font-bold text-emerald-300">
                EF
              </h1>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
                  Sistema de Gestión
                </p>
                <h1 className="mt-3 text-3xl font-bold leading-tight">
                  Emporio Flow
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Control operativo y gestión interna
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              window.localStorage.setItem(
                "emporio-sidebar-collapsed",
                String(next)
              );
            }}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            {collapsed ? ">>" : "<<"}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5">
        <div className="space-y-2">
          {(loading ? itemsByRole.trabajador : items).map((item) => {
            const isActive = pathname === item.href;
            const shortLabel = item.label
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 3);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span
                  className={`block leading-5 ${
                    collapsed ? "w-full text-center text-xs font-bold" : ""
                  }`}
                >
                  {collapsed ? shortLabel : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          {collapsed ? (
            <p className="text-center text-xs font-bold text-slate-300">
              {loading ? "..." : roleLabels[role].slice(0, 3)}
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-400">Perfil activo</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {loading ? "Cargando..." : roleLabels[role]}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Menú ajustado por permisos
              </p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
