type FractionDigits = number | "auto";

export function formatNumberCL(value: number, fractionDigits: FractionDigits = "auto") {
  const decimals =
    fractionDigits === "auto" ? (Number.isInteger(value) ? 0 : 2) : fractionDigits;

  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0);
}

export function formatCurrencyCLP(
  value: number,
  fractionDigits: FractionDigits = "auto"
) {
  const decimals =
    fractionDigits === "auto" ? (Number.isInteger(value) ? 0 : 2) : fractionDigits;

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0);
}

export function parseDecimal(value: FormDataEntryValue | string | number | null | undefined) {
  const parsed = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
