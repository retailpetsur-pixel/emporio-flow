export type Role = "admin" | "gerencia" | "supervisor" | "trabajador" | "compras";

export type PermissionItem = {
  label: string;
  href: string;
  description: string;
};

export const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  gerencia: "Gerencia",
  supervisor: "Supervisor",
  trabajador: "Trabajador",
  compras: "Compras",
};

export const roleDescriptions: Record<Role, string> = {
  admin: "Acceso completo al sistema, configuración y permisos.",
  gerencia: "Control operativo, reportes y configuración de usuarios.",
  supervisor: "Operación diaria, producción, personal y módulos clave.",
  compras: "Compras, inventario y seguimiento operativo.",
  trabajador: "Acceso operativo básico para producción, personal y biblioteca.",
};

export const allPermissionItems: PermissionItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    description: "Indicadores generales y estado operativo.",
  },
  {
    label: "Inventario",
    href: "/inventario",
    description: "Stock, valorización y control de insumos.",
  },
  {
    label: "Compras",
    href: "/compras",
    description: "Registro de compras y actualización de costos.",
  },
  {
    label: "Producción",
    href: "/produccion",
    description: "Planificación y control diario de producción.",
  },
  {
    label: "Cierre de turno",
    href: "/cierre-turno",
    description: "Cierres operativos del día.",
  },
  {
    label: "Personal",
    href: "/usuarios",
    description: "Trabajadores, turnos, sectores y permisos.",
  },
  {
    label: "Recetas y Costeo",
    href: "/recetas-costos",
    description: "Recetas, insumos maestros, márgenes y costos.",
  },
  {
    label: "Biblioteca",
    href: "/biblioteca",
    description: "Procedimientos, manuales, recetarios y documentos.",
  },
  {
    label: "Reportes",
    href: "/reportes",
    description: "Reportes de gestión y análisis.",
  },
  {
    label: "Configuración",
    href: "/configuracion",
    description: "Usuarios, perfiles y permisos de acceso.",
  },
];

export const itemsByRole: Record<Role, PermissionItem[]> = {
  admin: allPermissionItems,
  gerencia: allPermissionItems,
  supervisor: allPermissionItems.filter((item) =>
    [
      "/dashboard",
      "/inventario",
      "/compras",
      "/produccion",
      "/cierre-turno",
      "/usuarios",
      "/recetas-costos",
      "/biblioteca",
    ].includes(item.href)
  ),
  compras: allPermissionItems.filter((item) =>
    ["/dashboard", "/inventario", "/compras", "/produccion"].includes(item.href)
  ),
  trabajador: allPermissionItems.filter((item) =>
    ["/dashboard", "/produccion", "/usuarios", "/biblioteca"].includes(
      item.href
    )
  ),
};

export const roles: Role[] = [
  "admin",
  "gerencia",
  "supervisor",
  "compras",
  "trabajador",
];

export function isRole(value: string): value is Role {
  return roles.includes(value as Role);
}

export function canAccess(role: Role, href: string) {
  return itemsByRole[role].some((item) => item.href === href);
}

export function normalizePermissionHrefs(hrefs: string[]) {
  const allowed = new Set(allPermissionItems.map((item) => item.href));

  return hrefs.filter((href) => allowed.has(href));
}
