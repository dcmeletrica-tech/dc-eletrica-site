import type { BudgetItem, CalculationMode, DirectCost, PricingParams, QuickEstimate } from "../types/budget";
import type { HoursBreakdown, PricingResult } from "../types/pricing";

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
}

export function safeNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

export function nonNegative(value: unknown): number {
  const parsed = safeNumber(value, 0);
  return parsed < 0 ? 0 : parsed;
}

export function clampPercent(value: unknown): number {
  const parsed = safeNumber(value, 0);
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
}

export function itemHours(item: Pick<BudgetItem, "quantity" | "unit" | "timePerUnit">): number {
  const quantity = nonNegative(item.quantity);
  const time = nonNegative(item.timePerUnit);
  return item.unit === "min" ? (quantity * time) / 60 : quantity * time;
}

export function itemSubtotal(item: BudgetItem): number {
  return itemHours(item) * nonNegative(item.hourlyRate);
}

export function sumDirectCosts(costs: DirectCost[]): number {
  return costs.reduce((total, cost) => total + nonNegative(cost.amount), 0);
}

export function quickHours(quick: QuickEstimate): HoursBreakdown {
  const macros = (nonNegative(quick.macrosQty) * nonNegative(quick.minutesPerMacro)) / 60;
  const pages = (nonNegative(quick.pagesQty) * nonNegative(quick.minutesPerPage)) / 60;
  const threeD = nonNegative(quick.hours3d);
  const engineering = nonNegative(quick.hoursEngineering);
  return {
    macros,
    pages,
    threeD,
    engineering,
    total: macros + pages + threeD + engineering,
  };
}

export function detailedHours(items: BudgetItem[]): HoursBreakdown {
  const breakdown: HoursBreakdown = { macros: 0, pages: 0, threeD: 0, engineering: 0, total: 0 };
  for (const item of items) {
    const hours = itemHours(item);
    breakdown.total += hours;
    switch (item.category) {
      case "Macros 2D EPLAN":
        breakdown.macros += hours;
        break;
      case "Páginas de diagrama elétrico":
      case "Adequação de páginas existentes":
        breakdown.pages += hours;
        break;
      case "Macros e dispositivos 3D":
      case "Layout mecânico e Pro Panel":
        breakdown.threeD += hours;
        break;
      default:
        breakdown.engineering += hours;
    }
  }
  return breakdown;
}

export interface PricingInput {
  mode: CalculationMode;
  quick: QuickEstimate;
  items: BudgetItem[];
  directCosts: DirectCost[];
  pricing: PricingParams;
}

export function calculatePricing(input: PricingInput): PricingResult {
  const { mode, quick, items, directCosts, pricing } = input;

  const hours = mode === "rapido" ? quickHours(quick) : detailedHours(items);
  const baseTecnica =
    mode === "rapido"
      ? hours.total * nonNegative(quick.hourlyRate)
      : items.reduce((total, item) => total + itemSubtotal(item), 0);

  const custosAdicionais = sumDirectCosts(directCosts);
  const subtotalBase = baseTecnica + custosAdicionais;

  const reservaPercent = clampPercent(pricing.reservePercent);
  const reservaValor = subtotalBase * (reservaPercent / 100);
  const baseComReserva = subtotalBase + reservaValor;

  const fracaoTributos = clampPercent(pricing.taxPercent) / 100;
  const fracaoMargem = clampPercent(pricing.marginPercent) / 100;
  const divisor = 1 - fracaoTributos - fracaoMargem;

  const invalidDivisor = divisor <= 0;
  const precoSugerido = invalidDivisor ? 0 : baseComReserva / divisor;

  const descontoPercent = clampPercent(pricing.discountPercent);
  const descontoValor = precoSugerido * (descontoPercent / 100);

  const manualPrice = nonNegative(pricing.manualPrice);
  const precoFinal = pricing.manualPriceEnabled ? manualPrice : precoSugerido - descontoValor;

  const tributosSobreFinal = precoFinal * fracaoTributos;
  const saldoSobreBase = precoFinal - tributosSobreFinal - baseComReserva;
  const margemSobreBase = precoFinal > 0 ? (saldoSobreBase / precoFinal) * 100 : 0;

  return {
    hours,
    baseTecnica,
    custosAdicionais,
    subtotalBase,
    reservaValor,
    baseComReserva,
    precoSugerido,
    descontoValor,
    precoFinal,
    tributosSobreFinal,
    saldoSobreBase,
    margemSobreBase,
    valid: !invalidDivisor,
    error: invalidDivisor
      ? "Tributos + margem devem somar menos de 100% para calcular o preço sugerido."
      : null,
  };
}

export function hoursShare(hours: HoursBreakdown): { key: keyof HoursBreakdown; label: string; value: number; percent: number }[] {
  const total = hours.total;
  const entries: { key: keyof HoursBreakdown; label: string; value: number }[] = [
    { key: "macros", label: "Macros", value: hours.macros },
    { key: "pages", label: "Páginas", value: hours.pages },
    { key: "threeD", label: "Modelagem 3D", value: hours.threeD },
    { key: "engineering", label: "Dimensionamento e revisões", value: hours.engineering },
  ];
  return entries.map((entry) => ({
    ...entry,
    percent: total > 0 ? (entry.value / total) * 100 : 0,
  }));
}
