import { convertQuantity } from "./units";

export type PurchaseCostInput = {
  stockActual: number;
  costoAnterior: number;
  cantidadFormatos: number;
  cantidadPorFormato: number;
  unidadFormato: string;
  unidadStock: string;
  unidadUso: string;
  precioTotal: number;
};

export function calculatePurchaseCost(input: PurchaseCostInput) {
  const cantidadTotalCompra = input.cantidadFormatos * input.cantidadPorFormato;
  const cantidadCompraEnStock = convertQuantity(
    cantidadTotalCompra,
    input.unidadFormato,
    input.unidadStock
  );
  const cantidadCompraEnUso = convertQuantity(
    cantidadTotalCompra,
    input.unidadFormato,
    input.unidadUso
  );
  const stockAnteriorEnUso = convertQuantity(
    input.stockActual,
    input.unidadStock,
    input.unidadUso
  );
  const valorAnterior = stockAnteriorEnUso * input.costoAnterior;
  const nuevoStock = input.stockActual + cantidadCompraEnStock;
  const nuevoCostoPromedio =
    stockAnteriorEnUso + cantidadCompraEnUso > 0
      ? (valorAnterior + input.precioTotal) /
        (stockAnteriorEnUso + cantidadCompraEnUso)
      : input.precioTotal / cantidadCompraEnUso;

  return {
    cantidadTotalCompra,
    cantidadCompraEnStock,
    cantidadCompraEnUso,
    stockAnteriorEnUso,
    nuevoStock,
    nuevoCostoPromedio,
  };
}
