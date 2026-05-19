import { convertQuantity } from "./units";

export type InventoryPriority = "Alta" | "Media" | "Baja";

export type StockInput = {
  stock_actual: number | null;
  stock_minimo: number | null;
  cantidad_formato_compra: number | null;
};

export type StockValueInput = {
  stock_actual: number | null;
  unidad_referencia: string | null;
  unidad_formato_compra: string | null;
  unidad_uso: string | null;
  costo_unitario_uso: number | null;
};

export function purchasePriority(stockActual: number, stockMinimo: number): InventoryPriority {
  if (stockActual <= 0) return "Alta";
  if (stockActual < stockMinimo) return "Alta";
  if (stockActual === stockMinimo) return "Media";
  return "Baja";
}

export function suggestedFormats(item: StockInput) {
  const stockActual = Number(item.stock_actual ?? 0);
  const stockMinimo = Number(item.stock_minimo ?? 0);
  const contenidoFormato = Number(item.cantidad_formato_compra ?? 1);
  const faltante = Math.max(stockMinimo - stockActual, 0);

  if (faltante <= 0 || contenidoFormato <= 0) return 0;

  return Math.ceil(faltante / contenidoFormato);
}

export function stockValue(item: StockValueInput) {
  const stock = Number(item.stock_actual ?? 0);
  const unidadStock =
    item.unidad_referencia ?? item.unidad_formato_compra ?? item.unidad_uso ?? "";
  const unidadUso = item.unidad_uso ?? unidadStock;
  const stockEnUso = convertQuantity(stock, unidadStock, unidadUso);

  return stockEnUso * Number(item.costo_unitario_uso ?? 0);
}
