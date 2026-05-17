"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { isRole, itemsByRole, roleLabels, type Role } from "@/lib/permissions";

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

  const items = useMemo(
    () => (loading ? itemsByRole.trabajador : itemsByRole[role]),
    [loading, role]
  );

  return (
    <div className="relative w-full xl:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm"
      >
        {open ? "Cerrar menú" : "Menú"}
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-3 max-h-[70vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Perfil activo:{" "}
            <span className="font-semibold text-slate-900">
              {loading ? "Cargando..." : roleLabels[role]}
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
