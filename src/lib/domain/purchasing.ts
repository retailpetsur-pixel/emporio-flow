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
  incluyeIva?: boolean;
  tasaIva?: number;
};

export function resolvePurchasePrice(input: PurchasePriceInput) {
  const tasaIva = input.tasaIva ?? 0.19;
  const divisorIva = input.incluyeIva ? 1 + tasaIva : 1;

  if (input.cantidadFormatos <= 0) {
    return {
      precioTotal: 0,
      precioFormato: 0,
      precioTotalIngresado: 0,
      precioFormatoIngresado: 0,
      modoPrecio: "sin_precio" as const,
      modoIva: input.incluyeIva ? ("iva_incluido" as const) : ("neto" as const),
    };
  }

  if (input.precioTotal > 0) {
    const precioTotal = input.precioTotal / divisorIva;

    return {
      precioTotal,
      precioFormato: precioTotal / input.cantidadFormatos,
      precioTotalIngresado: input.precioTotal,
      precioFormatoIngresado: input.precioTotal / input.cantidadFormatos,
      modoPrecio: "total" as const,
      modoIva: input.incluyeIva ? ("iva_incluido" as const) : ("neto" as const),
    };
  }

  if (input.precioUnitarioFormato > 0) {
    const precioFormato = input.precioUnitarioFormato / divisorIva;
    const precioTotal = precioFormato * input.cantidadFormatos;

    return {
      precioTotal,
      precioFormato,
      precioTotalIngresado: input.precioUnitarioFormato * input.cantidadFormatos,
      precioFormatoIngresado: input.precioUnitarioFormato,
      modoPrecio: "unitario" as const,
      modoIva: input.incluyeIva ? ("iva_incluido" as const) : ("neto" as const),
    };
  }

  return {
    precioTotal: 0,
    precioFormato: 0,
    precioTotalIngresado: 0,
    precioFormatoIngresado: 0,
    modoPrecio: "sin_precio" as const,
    modoIva: input.incluyeIva ? ("iva_incluido" as const) : ("neto" as const),
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
