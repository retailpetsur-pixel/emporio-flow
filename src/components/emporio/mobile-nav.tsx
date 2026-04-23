"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type Role = "admin" | "gerencia" | "supervisor" | "trabajador" | "compras";

type NavItem = {
  label: string;
  href: string;
};

const itemsByRole: Record<Role, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Inventario", href: "/inventario" },
    { label: "Compras", href: "/compras" },
    { label: "Producción", href: "/produccion" },
    { label: "Cierre de turno", href: "/cierre-turno" },
    { label: "Personal", href: "/usuarios" },
    { label: "Recetas y Costeo", href: "/recetas-costos" },
    { label: "Reportes", href: "/reportes" },
  ],
  gerencia: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Inventario", href: "/inventario" },
    { label: "Compras", href: "/compras" },
    { label: "Producción", href: "/produccion" },
    { label: "Cierre de turno", href: "/cierre-turno" },
    { label: "Personal", href: "/usuarios" },
    { label: "Recetas y Costeo", href: "/recetas-costos" },
    { label: "Reportes", href: "/reportes" },
  ],
  supervisor: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Inventario", href: "/inventario" },
    { label: "Compras", href: "/compras" },
    { label: "Producción", href: "/produccion" },
    { label: "Cierre de turno", href: "/cierre-turno" },
    { label: "Personal", href: "/usuarios" },
    { label: "Recetas y Costeo", href: "/recetas-costos" },
  ],
  compras: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Inventario", href: "/inventario" },
    { label: "Compras", href: "/compras" },
    { label: "Producción", href: "/produccion" },
  ],
  trabajador: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Producción", href: "/produccion" },
    { label: "Personal", href: "/usuarios" },
  ],
};

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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

      const rol = perfil?.rol as Role | undefined;

      if (
        rol &&
        ["admin", "gerencia", "supervisor", "trabajador", "compras"].includes(
          rol
        )
      ) {
        setRole(rol);
      } else {
        setRole("trabajador");
      }

      setLoading(false);
    }

    loadRole();
  }, []);

  const items = useMemo(
    () => (loading ? itemsByRole.trabajador : itemsByRole[role]),
    [loading, role]
  );

  return (
    <div className="w-full md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
      >
        {open ? "Cerrar menú" : "Menú"}
      </button>

      {open && (
        <div className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Perfil activo:{" "}
            <span className="font-semibold text-slate-900">
              {loading ? "Cargando..." : role}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}