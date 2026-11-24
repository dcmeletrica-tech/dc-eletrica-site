import { z } from "zod";
import type { Budget } from "../types/budget";
import { SCHEMA_VERSION } from "./defaults";

const nonNegativeNumber = z.number().finite().min(0, "Não pode ser negativo");
const percent = z.number().finite().min(0, "Mínimo 0%").max(100, "Máximo 100%");

export const customerSchema = z.object({
  name: z.string(),
  company: z.string(),
  contact: z.string(),
  phone: z.string(),
  email: z.string(),
});

export const quickSchema = z.object({
  macrosQty: nonNegativeNumber,
  minutesPerMacro: nonNegativeNumber,
  pagesQty: nonNegativeNumber,
  minutesPerPage: nonNegativeNumber,
  hours3d: nonNegativeNumber,
  hoursEngineering: nonNegativeNumber,
  hourlyRate: nonNegativeNumber,
});

export const itemSchema = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  quantity: nonNegativeNumber,
  unit: z.enum(["min", "h"]),
  timePerUnit: nonNegativeNumber,
  hourlyRate: nonNegativeNumber,
  notes: z.string(),
});

export const directCostSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: nonNegativeNumber,
});

export const pricingSchema = z.object({
  reservePercent: percent,
  taxPercent: percent,
  marginPercent: percent,
  discountPercent: percent,
  manualPriceEnabled: z.boolean(),
  manualPrice: nonNegativeNumber,
});

export const termsSchema = z.object({
  paymentTerms: z.string(),
  deliveryTerm: z.string(),
  validityDays: nonNegativeNumber,
  revisionsIncluded: nonNegativeNumber,
  inclusions: z.string(),
  exclusions: z.string(),
  assumptions: z.string(),
  notes: z.string(),
});

export const scenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  pricing: pricingSchema,
});

export const budgetSchema = z.object({
  id: z.string(),
  number: z.string(),
  schemaVersion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(["rascunho", "enviado", "aprovado", "recusado"]),
  serviceType: z.enum(["adequacao", "painel-novo", "qgbt", "acionamentos", "automacao", "outro"]),
  customer: customerSchema,
  projectName: z.string(),
  projectCode: z.string(),
  scope: z.string(),
  mode: z.enum(["rapido", "detalhado"]),
  quick: quickSchema,
  items: z.array(itemSchema),
  directCosts: z.array(directCostSchema),
  pricing: pricingSchema,
  terms: termsSchema,
  scenarios: z.array(scenarioSchema),
  selectedScenarioId: z.string().nullable(),
  snapshot: z.object({
    hourlyRate: nonNegativeNumber,
    reservePercent: percent,
    taxPercent: percent,
    marginPercent: percent,
    discountPercent: percent,
    validityDays: nonNegativeNumber,
    capturedAt: z.string(),
  }),
});

export const settingsSchema = z.object({
  schemaVersion: z.number(),
  company: z.object({
    name: z.string(),
    document: z.string(),
    phone: z.string(),
    email: z.string(),
    address: z.string(),
    logoDataUrl: z.string(),
  }),
  defaults: z.object({
    hourlyRate: nonNegativeNumber,
    reservePercent: percent,
    taxPercent: percent,
    marginPercent: percent,
    discountPercent: percent,
    validityDays: nonNegativeNumber,
    paymentTerms: z.string(),
    deliveryTerm: z.string(),
    notes: z.string(),
    footer: z.string(),
  }),
  numberPrefix: z.string().min(1, "Informe um prefixo"),
  categories: z.array(z.string()),
  theme: z.enum(["light", "dark"]),
});

export const backupSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  settings: settingsSchema,
  budgets: z.array(budgetSchema),
});

export interface BudgetValidationIssue {
  field: string;
  message: string;
}

export function validateBudgetForDraft(budget: Budget): BudgetValidationIssue[] {
  const issues: BudgetValidationIssue[] = [];
  if (!budget.customer.name.trim()) issues.push({ field: "customer.name", message: "Informe o nome do cliente." });
  if (!budget.projectName.trim()) issues.push({ field: "projectName", message: "Informe o nome do projeto." });
  if (budget.pricing.taxPercent + budget.pricing.marginPercent >= 100) {
    issues.push({ field: "pricing", message: "Tributos + margem devem somar menos de 100%." });
  }
  return issues;
}

export function validateBudgetForProposal(budget: Budget, finalPrice: number): BudgetValidationIssue[] {
  const issues = validateBudgetForDraft(budget);
  if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
    issues.push({ field: "pricing", message: "O preço final precisa ser maior que zero." });
  }
  if (!budget.terms.paymentTerms.trim()) {
    issues.push({ field: "terms.paymentTerms", message: "Informe as condições de pagamento." });
  }
  if (!budget.terms.deliveryTerm.trim()) {
    issues.push({ field: "terms.deliveryTerm", message: "Informe o prazo de execução." });
  }
  if (budget.terms.validityDays <= 0) {
    issues.push({ field: "terms.validityDays", message: "Informe a validade da proposta em dias." });
  }
  return issues;
}

export function migrateBudget(raw: unknown): Budget | null {
  const parsed = budgetSchema.safeParse(raw);
  if (!parsed.success) return null;
  const budget = parsed.data as Budget;
  if (budget.schemaVersion < SCHEMA_VERSION) {
    return { ...budget, schemaVersion: SCHEMA_VERSION };
  }
  return budget;
}
