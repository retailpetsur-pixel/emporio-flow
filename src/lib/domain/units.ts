export function normalizeUnit(unit: string) {
  const value = unit.trim().toLowerCase();

  if (["gr", "grs", "g", "gramo", "gramos"].includes(value)) return "grs";
  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(value)) return "kg";
  if (["ml", "mililitro", "mililitros"].includes(value)) return "ml";
  if (["lt", "lts", "litro", "litros"].includes(value)) return "litros";
  if (["un", "unidad", "unidades", "u"].includes(value)) return "un";

  return value;
}

export function unitFactor(fromUnit: string, toUnit: string) {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) return 1;
  if (from === "kg" && to === "grs") return 1000;
  if (from === "grs" && to === "kg") return 1 / 1000;
  if (from === "litros" && to === "ml") return 1000;
  if (from === "ml" && to === "litros") return 1 / 1000;

  return 1;
}

export function convertQuantity(quantity: number, fromUnit: string, toUnit: string) {
  return quantity * unitFactor(fromUnit, toUnit);
}
