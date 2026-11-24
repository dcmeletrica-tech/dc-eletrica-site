import type { BudgetSettings } from "../types/budget";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../lib/defaults";
import { settingsSchema } from "../lib/validation";

const STORAGE_KEY = "orcaeng.settings.v1";

export interface SettingsRepository {
  load(): BudgetSettings;
  save(settings: BudgetSettings): BudgetSettings;
  reset(): BudgetSettings;
}

export const settingsRepository: SettingsRepository = {
  load() {
    if (typeof localStorage === "undefined") return structuredClone(DEFAULT_SETTINGS);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_SETTINGS);
      const parsed = settingsSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return structuredClone(DEFAULT_SETTINGS);
      return { ...(parsed.data as BudgetSettings), schemaVersion: SCHEMA_VERSION };
    } catch {
      return structuredClone(DEFAULT_SETTINGS);
    }
  },

  save(settings) {
    const next = { ...settings, schemaVersion: SCHEMA_VERSION };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    return next;
  },

  reset() {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    return structuredClone(DEFAULT_SETTINGS);
  },
};

export function applyTheme(theme: "light" | "dark"): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}
