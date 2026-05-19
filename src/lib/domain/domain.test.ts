import { describe, expect, it } from "vitest";
import { purchasePriority, stockValue, suggestedFormats } from "./inventory";
import { calculatePurchaseCost } from "./purchasing";
import { nextDaySuggestedProduction } from "./production";
import { convertQuantity, normalizeUnit } from "./units";

describe("unit conversion", () => {
  it("normalizes common Spanish unit labels", () => {
    expect(normalizeUnit(" gramos ")).toBe("grs");
    expect(normalizeUnit("LTS")).toBe("litros");
    expect(normalizeUnit("unidad")).toBe("un");
  });

  it("converts compatible stock units", () => {
    expect(convertQuantity(2, "kg", "grs")).toBe(2000);
    expect(convertQuantity(500, "ml", "litros")).toBe(0.5);
  });
});

describe("inventory calculations", () => {
  it("calculates purchase priority from stock thresholds", () => {
    expect(purchasePriority(0, 10)).toBe("Alta");
    expect(purchasePriority(10, 10)).toBe("Media");
    expect(purchasePriority(15, 10)).toBe("Baja");
  });

  it("suggests purchase formats only for real shortages", () => {
    expect(
      suggestedFormats({
        stock_actual: 3,
        stock_minimo: 10,
        cantidad_formato_compra: 2,
      })
    ).toBe(4);
    expect(
      suggestedFormats({
        stock_actual: 12,
        stock_minimo: 10,
        cantidad_formato_compra: 2,
      })
    ).toBe(0);
  });

  it("values stock in recipe usage units", () => {
    expect(
      stockValue({
        stock_actual: 2,
        unidad_referencia: "kg",
        unidad_formato_compra: "kg",
        unidad_uso: "grs",
        costo_unitario_uso: 5,
      })
    ).toBe(10000);
  });
});

describe("purchase costing", () => {
  it("calculates weighted average cost and stock after purchase", () => {
    const result = calculatePurchaseCost({
      stockActual: 1,
      costoAnterior: 10,
      cantidadFormatos: 1,
      cantidadPorFormato: 1,
      unidadFormato: "kg",
      unidadStock: "kg",
      unidadUso: "grs",
      precioTotal: 6000,
    });

    expect(result.nuevoStock).toBe(2);
    expect(result.nuevoCostoPromedio).toBe(8);
  });
});

describe("production planning", () => {
  it("never suggests negative production", () => {
    expect(nextDaySuggestedProduction(10, 3)).toBe(7);
    expect(nextDaySuggestedProduction(5, 8)).toBe(0);
  });
});
