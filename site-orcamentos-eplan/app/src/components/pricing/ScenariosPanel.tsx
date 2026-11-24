import { Check, Sparkles } from "lucide-react";
import type { Budget, Scenario } from "../../types/budget";
import { calculatePricing } from "../../lib/pricing";
import { formatCurrency, formatPercent } from "../../lib/format";

export function buildDefaultScenarios(budget: Budget): Scenario[] {
  const base = budget.pricing;
  return [
    {
      id: "cen-economico",
      name: "Econômico",
      description: "Desconto maior para fechamento rápido, sem alterar horas ou escopo.",
      pricing: { ...base, discountPercent: Math.min(100, base.discountPercent + 10), manualPriceEnabled: false },
    },
    {
      id: "cen-padrao",
      name: "Padrão",
      description: "Resultado recomendado com os parâmetros atuais do orçamento.",
      pricing: { ...base },
    },
    {
      id: "cen-premium",
      name: "Premium",
      description: "Maior reserva para urgência ou complexidade, sem alterar horas ou escopo.",
      pricing: { ...base, reservePercent: Math.min(100, base.reservePercent + 10), discountPercent: 0 },
    },
  ];
}

export default function ScenariosPanel({
  budget,
  onApply,
}: {
  budget: Budget;
  onApply: (scenario: Scenario) => void;
}) {  const scenarios = budget.scenarios.length > 0 ? budget.scenarios : buildDefaultScenarios(budget);

  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-brand-600" />
        Os cenários alteram apenas parâmetros comerciais. Horas, especificação técnica e escopo permanecem iguais.
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        {scenarios.map((scenario) => {
          const result = calculatePricing({ ...budget, pricing: scenario.pricing });
          const selected = budget.selectedScenarioId === scenario.id;
          return (
            <div
              key={scenario.id}
              className={`flex flex-col rounded-xl border p-4 ${
                selected
                  ? "border-brand-600 bg-brand-50/60 dark:border-brand-500 dark:bg-brand-950/40"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{scenario.name}</h3>
                {selected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-brand-600">
                    <Check size={11} /> Selecionado
                  </span>
                ) : null}
              </div>
              <p className="mt-1 flex-1 text-xs text-slate-500 dark:text-slate-400">{scenario.description}</p>
              <p className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(result.precoFinal)}</p>
              <dl className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex justify-between">
                  <dt>Reserva</dt>
                  <dd>{formatPercent(scenario.pricing.reservePercent)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Desconto</dt>
                  <dd>{formatPercent(scenario.pricing.discountPercent)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Margem</dt>
                  <dd>{formatPercent(scenario.pricing.marginPercent)}</dd>
                </div>
              </dl>
              <button type="button" className="btn-secondary mt-3" onClick={() => onApply(scenario)}>
                Usar como preço oficial
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
