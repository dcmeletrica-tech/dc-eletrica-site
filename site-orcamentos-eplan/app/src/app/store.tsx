import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Budget, BudgetSettings } from "../types/budget";
import { budgetRepository, duplicateBudget } from "../services/budgetRepository";
import { applyTheme, settingsRepository } from "../services/settingsRepository";
import { nextBudgetNumber } from "../lib/defaults";

interface AppData {
  budgets: Budget[];
  settings: BudgetSettings;
  saveBudget(budget: Budget): Budget;
  removeBudget(id: string): void;
  duplicate(id: string): Budget | null;
  saveSettings(settings: BudgetSettings): void;
  replaceAll(budgets: Budget[], settings?: BudgetSettings): void;
  clearAll(): void;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>(() => budgetRepository.list());
  const [settings, setSettings] = useState<BudgetSettings>(() => settingsRepository.load());

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const saveBudget = useCallback((budget: Budget) => {
    const saved = budgetRepository.save(budget);
    setBudgets(budgetRepository.list());
    return saved;
  }, []);

  const removeBudget = useCallback((id: string) => {
    budgetRepository.remove(id);
    setBudgets(budgetRepository.list());
  }, []);

  const duplicate = useCallback(
    (id: string) => {
      const source = budgetRepository.get(id);
      if (!source) return null;
      const list = budgetRepository.list();
      const copy = duplicateBudget(source, list, nextBudgetNumber(list, settings.numberPrefix));
      const saved = budgetRepository.save(copy);
      setBudgets(budgetRepository.list());
      return saved;
    },
    [settings.numberPrefix],
  );

  const saveSettings = useCallback((next: BudgetSettings) => {
    const saved = settingsRepository.save(next);
    setSettings(saved);
  }, []);

  const replaceAll = useCallback((nextBudgets: Budget[], nextSettings?: BudgetSettings) => {
    budgetRepository.replaceAll(nextBudgets);
    setBudgets(budgetRepository.list());
    if (nextSettings) {
      const saved = settingsRepository.save(nextSettings);
      setSettings(saved);
    }
  }, []);

  const clearAll = useCallback(() => {
    budgetRepository.replaceAll([]);
    setBudgets([]);
    const reset = settingsRepository.reset();
    setSettings(reset);
  }, []);

  const value = useMemo<AppData>(
    () => ({ budgets, settings, saveBudget, removeBudget, duplicate, saveSettings, replaceAll, clearAll }),
    [budgets, settings, saveBudget, removeBudget, duplicate, saveSettings, replaceAll, clearAll],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData deve ser usado dentro de AppDataProvider");
  return context;
}
