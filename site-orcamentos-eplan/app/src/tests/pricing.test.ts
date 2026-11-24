import { describe, expect, it } from "vitest";
import { calculatePricing, detailedHours, itemHours, quickHours, round2 } from "../lib/pricing";
import { DEFAULT_PRICING, DEFAULT_QUICK } from "../lib/defaults";
import type { BudgetItem, PricingParams } from "../types/budget";

const baseInput = {
  mode: "rapido" as const,
  quick: DEFAULT_QUICK,
  items: [] as BudgetItem[],
  directCosts: [],
  pricing: DEFAULT_PRICING,
};

describe("round2", () => {
  it("arredonda para duas casas", () => {
    expect(round2(2466.6666666)).toBe(2466.67);
    expect(round2(0.005)).toBe(0.01);
    expect(round2(-1.005)).toBe(-1.01);
    expect(round2(Number.NaN)).toBe(0);
  });
});

describe("quickHours", () => {
  it("converte macros e páginas em horas", () => {
    const hours = quickHours(DEFAULT_QUICK);
    expect(hours.macros).toBeCloseTo(1.5, 6);
    expect(hours.pages).toBeCloseTo(5.833333, 6);
    expect(hours.threeD).toBe(2);
    expect(hours.engineering).toBe(3);
    expect(hours.total).toBeCloseTo(12.333333, 6);
  });

  it("ignora valores negativos", () => {
    const hours = quickHours({ ...DEFAULT_QUICK, macrosQty: -5, pagesQty: -1, hours3d: -2 });
    expect(hours.macros).toBe(0);
    expect(hours.pages).toBe(0);
    expect(hours.threeD).toBe(0);
    expect(hours.total).toBe(3);
  });
});

describe("itemHours", () => {
  it("interpreta minutos e horas", () => {
    expect(itemHours({ quantity: 2, unit: "min", timePerUnit: 30 })).toBe(1);
    expect(itemHours({ quantity: 3, unit: "h", timePerUnit: 1.5 })).toBe(4.5);
  });
});

describe("detailedHours", () => {
  it("agrupa por categoria", () => {
    const items: BudgetItem[] = [
      { id: "1", category: "Macros 2D EPLAN", description: "", quantity: 2, unit: "min", timePerUnit: 30, hourlyRate: 200, notes: "" },
      { id: "2", category: "Páginas de diagrama elétrico", description: "", quantity: 6, unit: "min", timePerUnit: 10, hourlyRate: 200, notes: "" },
      { id: "3", category: "Layout mecânico e Pro Panel", description: "", quantity: 2, unit: "h", timePerUnit: 1, hourlyRate: 200, notes: "" },
      { id: "4", category: "Revisão cliente", description: "", quantity: 1, unit: "h", timePerUnit: 1, hourlyRate: 200, notes: "" },
    ];
    const hours = detailedHours(items);
    expect(hours.macros).toBe(1);
    expect(hours.pages).toBe(1);
    expect(hours.threeD).toBe(2);
    expect(hours.engineering).toBe(1);
    expect(hours.total).toBe(5);
  });
});

describe("calculatePricing — modo rápido", () => {
  it("aplica reserva de 15% sobre a base técnica", () => {
    const result = calculatePricing(baseInput);
    expect(round2(result.baseTecnica)).toBe(2466.67);
    expect(round2(result.reservaValor)).toBe(370);
    expect(round2(result.baseComReserva)).toBe(2836.67);
    expect(round2(result.precoSugerido)).toBe(2836.67);
    expect(round2(result.precoFinal)).toBe(2836.67);
    expect(result.valid).toBe(true);
  });

  it("aplica tributos e margem sobre o preço de venda", () => {
    const pricing: PricingParams = { ...DEFAULT_PRICING, taxPercent: 10, marginPercent: 20 };
    const result = calculatePricing({ ...baseInput, pricing });
    expect(round2(result.precoSugerido)).toBe(4052.38);
    expect(round2(result.tributosSobreFinal)).toBe(405.24);
  });

  it("aplica desconto sobre o preço sugerido", () => {
    const pricing: PricingParams = { ...DEFAULT_PRICING, discountPercent: 10 };
    const result = calculatePricing({ ...baseInput, pricing });
    expect(round2(result.descontoValor)).toBe(283.67);
    expect(round2(result.precoFinal)).toBe(2553);
  });

  it("soma custos adicionais diretos antes da reserva", () => {
    const result = calculatePricing({
      ...baseInput,
      directCosts: [{ id: "c1", description: "ART", amount: 300 }],
    });
    expect(round2(result.subtotalBase)).toBe(2766.67);
    expect(round2(result.reservaValor)).toBe(415);
    expect(round2(result.precoFinal)).toBe(3181.67);
  });

  it("bloqueia divisor inválido quando tributos + margem chegam a 100%", () => {
    const pricing: PricingParams = { ...DEFAULT_PRICING, taxPercent: 60, marginPercent: 40 };
    const result = calculatePricing({ ...baseInput, pricing });
    expect(result.valid).toBe(false);
    expect(result.precoSugerido).toBe(0);
    expect(result.error).toContain("100%");
  });

  it("respeita preço manual negociado", () => {
    const pricing: PricingParams = { ...DEFAULT_PRICING, manualPriceEnabled: true, manualPrice: 5000 };
    const result = calculatePricing({ ...baseInput, pricing });
    expect(result.precoFinal).toBe(5000);
    expect(round2(result.precoSugerido)).toBe(2836.67);
  });
});

describe("calculatePricing — modo detalhado", () => {
  it("usa a soma das linhas e ignora a estimativa rápida", () => {
    const items: BudgetItem[] = [
      { id: "1", category: "Macros 2D EPLAN", description: "", quantity: 4, unit: "min", timePerUnit: 30, hourlyRate: 250, notes: "" },
      { id: "2", category: "Revisão cliente", description: "", quantity: 2, unit: "h", timePerUnit: 1, hourlyRate: 150, notes: "" },
    ];
    const result = calculatePricing({ ...baseInput, mode: "detalhado", items });
    expect(result.hours.total).toBe(4);
    expect(round2(result.baseTecnica)).toBe(800);
    expect(round2(result.precoFinal)).toBe(920);
  });

  it("não conta horas em dobro entre modos", () => {
    const items: BudgetItem[] = [
      { id: "1", category: "Macros 2D EPLAN", description: "", quantity: 2, unit: "h", timePerUnit: 1, hourlyRate: 200, notes: "" },
    ];
    const rapido = calculatePricing({ ...baseInput, mode: "rapido", items });
    const detalhado = calculatePricing({ ...baseInput, mode: "detalhado", items });
    expect(rapido.hours.total).toBeCloseTo(12.333333, 5);
    expect(detalhado.hours.total).toBe(2);
  });
});
