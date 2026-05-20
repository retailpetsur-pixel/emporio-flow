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

export type PurchasePriceInput = {
  cantidadFormatos: number;
  precioTotal: number;
  precioUnitarioFormato: number;
};

export function resolvePurchasePrice(input: PurchasePriceInput) {
  if (input.cantidadFormatos <= 0) {
    return {
      precioTotal: 0,
      precioFormato: 0,
      modoPrecio: "sin_precio" as const,
    };
  }

  if (input.precioTotal > 0) {
    return {
      precioTotal: input.precioTotal,
      precioFormato: input.precioTotal / input.cantidadFormatos,
      modoPrecio: "total" as const,
    };
  }

  if (input.precioUnitarioFormato > 0) {
    return {
      precioTotal: input.precioUnitarioFormato * input.cantidadFormatos,
      precioFormato: input.precioUnitarioFormato,
      modoPrecio: "unitario" as const,
    };
  }

  return {
    precioTotal: 0,
    precioFormato: 0,
    modoPrecio: "sin_precio" as const,
  };
}

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
