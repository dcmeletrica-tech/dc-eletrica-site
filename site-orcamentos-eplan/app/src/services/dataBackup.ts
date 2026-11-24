import type { BackupFile, Budget, BudgetSettings } from "../types/budget";
import { SCHEMA_VERSION } from "../lib/defaults";
import { backupSchema } from "../lib/validation";
import { sanitizeFileName } from "../lib/format";

export function buildBackup(settings: BudgetSettings, budgets: Budget[]): BackupFile {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    budgets,
  };
}

export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFileName(fileName)}.json`;
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}

export function exportBackup(settings: BudgetSettings, budgets: Budget[]): void {
  const backup = buildBackup(settings, budgets);
  downloadJson(backup, `backup-orcaeng-${new Date().toISOString().slice(0, 10)}`);
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  data?: BackupFile;
}

export function parseBackup(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "O arquivo não é um JSON válido." };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Arquivo de backup inválido${first ? `: ${first.path.join(".")} — ${first.message}` : "."}`,
    };
  }
  return { ok: true, data: parsed.data as BackupFile };
}

export function exportBudgetJson(budget: Budget): void {
  downloadJson(budget, `orcamento-${budget.number}`);
}
