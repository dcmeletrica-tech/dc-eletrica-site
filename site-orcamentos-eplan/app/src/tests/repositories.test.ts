import { beforeEach, describe, expect, it } from "vitest";
import { budgetRepository, duplicateBudget } from "../services/budgetRepository";
import { settingsRepository } from "../services/settingsRepository";
import { buildBackup, parseBackup } from "../services/dataBackup";
import { createBudget, DEFAULT_SETTINGS, nextBudgetNumber } from "../lib/defaults";
import { migrateBudget } from "../lib/validation";

beforeEach(() => {
  localStorage.clear();
});

describe("budgetRepository", () => {
  it("salva, lista e remove orçamentos", () => {
    const budget = createBudget(DEFAULT_SETTINGS, []);
    budgetRepository.save(budget);
    expect(budgetRepository.list()).toHaveLength(1);
    expect(budgetRepository.get(budget.id)?.number).toBe(budget.number);

    budgetRepository.remove(budget.id);
    expect(budgetRepository.list()).toHaveLength(0);
  });

  it("atualiza o registro existente em vez de duplicar", () => {
    const budget = createBudget(DEFAULT_SETTINGS, []);
    budgetRepository.save(budget);
    budgetRepository.save({ ...budget, customer: { ...budget.customer, name: "Alphatek" } });
    const list = budgetRepository.list();
    expect(list).toHaveLength(1);
    expect(list[0].customer.name).toBe("Alphatek");
  });

  it("ignora registros corrompidos no armazenamento", () => {
    localStorage.setItem("orcaeng.budgets.v1", JSON.stringify([{ id: "x" }, "lixo"]));
    expect(budgetRepository.list()).toHaveLength(0);
  });

  it("duplica sem repetir o identificador", () => {
    const budget = createBudget(DEFAULT_SETTINGS, []);
    const copy = duplicateBudget(budget, [budget], "ORC-2026-002");
    expect(copy.id).not.toBe(budget.id);
    expect(copy.number).toBe("ORC-2026-002");
    expect(copy.status).toBe("rascunho");
  });
});

describe("nextBudgetNumber", () => {
  it("incrementa a sequência do ano corrente", () => {
    const year = new Date().getFullYear();
    const budget = createBudget(DEFAULT_SETTINGS, []);
    budget.number = `ORC-${year}-007`;
    expect(nextBudgetNumber([budget], "ORC")).toBe(`ORC-${year}-008`);
  });
});

describe("settingsRepository", () => {
  it("retorna padrões quando não há nada salvo", () => {
    expect(settingsRepository.load().numberPrefix).toBe("ORC");
  });

  it("persiste e recarrega as configurações", () => {
    settingsRepository.save({ ...DEFAULT_SETTINGS, numberPrefix: "PROP" });
    expect(settingsRepository.load().numberPrefix).toBe("PROP");
  });

  it("descarta configurações inválidas", () => {
    localStorage.setItem("orcaeng.settings.v1", JSON.stringify({ numberPrefix: "" }));
    expect(settingsRepository.load().numberPrefix).toBe("ORC");
  });
});

describe("backup", () => {
  it("exporta e reimporta os dados", () => {
    const budget = createBudget(DEFAULT_SETTINGS, []);
    const backup = buildBackup(DEFAULT_SETTINGS, [budget]);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    expect(parsed.data?.budgets).toHaveLength(1);
    expect(parsed.data?.settings.numberPrefix).toBe("ORC");
  });

  it("rejeita JSON inválido e estrutura desconhecida", () => {
    expect(parseBackup("não é json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ schemaVersion: 1 })).ok).toBe(false);
  });

  it("migra orçamento com versão anterior de schema", () => {
    const budget = createBudget(DEFAULT_SETTINGS, []);
    const migrated = migrateBudget({ ...budget, schemaVersion: 0 });
    expect(migrated?.schemaVersion).toBe(1);
  });
});
