import type { Budget } from "../types/budget";
import { createId } from "../lib/defaults";
import { migrateBudget } from "../lib/validation";

export interface BudgetRepository {
  list(): Budget[];
  get(id: string): Budget | null;
  save(budget: Budget): Budget;
  remove(id: string): void;
  replaceAll(budgets: Budget[]): void;
}

const STORAGE_KEY = "orcaeng.budgets.v1";

function readRaw(): unknown[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(budgets: Budget[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
}

function sortByUpdated(budgets: Budget[]): Budget[] {
  return [...budgets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const budgetRepository: BudgetRepository = {
  list() {
    const budgets = readRaw()
      .map(migrateBudget)
      .filter((budget): budget is Budget => budget !== null);
    return sortByUpdated(budgets);
  },

  get(id) {
    return this.list().find((budget) => budget.id === id) ?? null;
  },

  save(budget) {
    const budgets = this.list();
    const index = budgets.findIndex((item) => item.id === budget.id);
    const updated: Budget = { ...budget, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      budgets[index] = updated;
    } else {
      budgets.unshift(updated);
    }
    writeRaw(budgets);
    return updated;
  },

  remove(id) {
    writeRaw(this.list().filter((budget) => budget.id !== id));
  },

  replaceAll(budgets) {
    writeRaw(sortByUpdated(budgets));
  },
};

export function duplicateBudget(source: Budget, _existing: Budget[], nextNumber: string): Budget {
  const now = new Date().toISOString();
  return {
    ...structuredClone(source),
    id: createId("orc"),
    number: nextNumber,
    status: "rascunho",
    createdAt: now,
    updatedAt: now,
    items: source.items.map((item) => ({ ...item, id: createId("item") })),
    directCosts: source.directCosts.map((cost) => ({ ...cost, id: createId("cost") })),
    scenarios: source.scenarios.map((scenario) => ({ ...scenario, id: createId("cen") })),
    selectedScenarioId: null,
    snapshot: { ...source.snapshot, capturedAt: now },
    schemaVersion: source.schemaVersion,
  };
}

export function ensureUniqueIds(budgets: Budget[]): Budget[] {
  const seen = new Set<string>();
  return budgets.map((budget) => {
    const id = seen.has(budget.id) ? createId("orc") : budget.id;
    seen.add(id);
    return { ...budget, id };
  });
}
