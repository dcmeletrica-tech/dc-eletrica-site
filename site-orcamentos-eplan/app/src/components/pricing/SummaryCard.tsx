import { AlertTriangle, Clock, Wallet } from "lucide-react";
import type { PricingResult } from "../../types/pricing";
import { formatCurrency, formatHours, formatPercent } from "../../lib/format";
import type { BudgetValidationIssue } from "../../lib/validation";

export default function SummaryCard({
  result,
  issues,
  compact,
}: {
  result: PricingResult;
  issues: BudgetValidationIssue[];
  compact?: boolean;
}) {
  return (
    <div className={`card overflow-hidden ${compact ? "" : "sticky top-4"}`}>
      <div className="bg-brand-900 px-4 py-3 text-white dark:bg-brand-800">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-200">Resumo do orçamento</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{formatCurrency(result.precoFinal)}</p>
        <p className="mt-0.5 text-xs text-brand-200">Preço final</p>
      </div>
      <dl className="divide-y divide-slate-100 px-4 text-sm dark:divide-slate-800">
        <div className="flex items-center justify-between py-2.5">
          <dt className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Clock size={14} /> Horas totais
          </dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">{formatHours(result.hours.total)}</dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-slate-600 dark:text-slate-300">Custo técnico</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(result.baseTecnica)}</dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-slate-600 dark:text-slate-300">Custos adicionais</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(result.custosAdicionais)}</dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-slate-600 dark:text-slate-300">Reserva</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(result.reservaValor)}</dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-slate-600 dark:text-slate-300">Tributos estimados</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(result.tributosSobreFinal)}</dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-slate-600 dark:text-slate-300">Preço sugerido</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(result.precoSugerido)}</dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Wallet size={14} /> Margem s/ base
          </dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">{formatPercent(result.margemSobreBase)}</dd>
        </div>
      </dl>
      {issues.length > 0 ? (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/60">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle size={13} /> Pendências para emissão
          </p>
          <ul className="mt-1 list-inside list-disc text-xs text-amber-800 dark:text-amber-200">
            {issues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
