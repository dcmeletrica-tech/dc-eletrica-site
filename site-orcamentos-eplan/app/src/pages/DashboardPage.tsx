import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calculator, Copy, FileDown, Plus, Trash2 } from "lucide-react";
import { useAppData } from "../app/store";
import { calculatePricing } from "../lib/pricing";
import { formatCurrency, formatDate, formatHours } from "../lib/format";
import { STATUS_LABELS, STATUS_ORDER } from "../lib/defaults";
import { Card, EmptyState, SectionHeader, StatusBadge } from "../components/ui";
import { exportProposalPdf } from "../services/exportPdf";
import type { Budget } from "../types/budget";

export default function DashboardPage() {
  const { budgets, settings, duplicate, removeBudget } = useAppData();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const totalValue = budgets.reduce((total, budget) => total + priceOf(budget), 0);
    const approvedHours = budgets
      .filter((budget) => budget.status === "aprovado")
      .reduce((total, budget) => total + calculatePricing(budget).hours.total, 0);
    const byStatus = STATUS_ORDER.map((status) => ({
      status,
      count: budgets.filter((budget) => budget.status === status).length,
    }));
    return { totalValue, approvedHours, byStatus };
  }, [budgets]);

  const recent = budgets.slice(0, 6);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">Painel</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Visão geral dos orçamentos de engenharia salvos neste navegador.
          </p>
        </div>
        <Link to="/orcamentos/novo" className="btn-primary">
          <Plus size={16} /> Novo orçamento
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orçamentos salvos" value={String(budgets.length)} hint="Total no armazenamento local" />
        <StatCard label="Valor orçado" value={formatCurrency(stats.totalValue)} hint="Soma do preço final" />
        <StatCard
          label="Horas aprovadas"
          value={formatHours(stats.approvedHours)}
          hint="Horas técnicas em orçamentos aprovados"
        />
        <StatCard
          label="Aprovados"
          value={String(budgets.filter((budget) => budget.status === "aprovado").length)}
          hint={`de ${budgets.length} orçamento(s)`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="min-w-0">
          <SectionHeader
            title="Orçamentos recentes"
            description="Últimos registros atualizados"
            action={
              <Link to="/orcamentos" className="btn-ghost text-brand-700 dark:text-brand-300">
                Ver todos <ArrowRight size={16} />
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              title="Nenhum orçamento salvo ainda"
              description="Crie o primeiro orçamento a partir da calculadora rápida. Leva menos de um minuto para chegar a uma estimativa."
              action={
                <Link to="/orcamentos/novo" className="btn-primary">
                  <Calculator size={16} /> Começar agora
                </Link>
              }
            />
          ) : (
            <>
              <div className="divide-y divide-slate-100 sm:hidden dark:divide-slate-800/60">
                {recent.map((budget) => (
                  <div key={budget.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{budget.number}</p>
                        <p className="truncate text-sm text-slate-700 dark:text-slate-300">
                          {budget.customer.name || "Sem cliente"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {budget.projectName || "Sem projeto"} • {formatDate(budget.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={budget.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(priceOf(budget))}
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="btn-ghost p-1.5"
                          title="Duplicar"
                          onClick={() => {
                            const copy = duplicate(budget.id);
                            if (copy) navigate(`/orcamentos/${copy.id}`);
                          }}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-1.5"
                          title="Exportar PDF"
                          onClick={() => exportProposalPdf(budget, settings)}
                        >
                          <FileDown size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-1.5 text-red-600"
                          title="Excluir"
                          onClick={() => {
                            if (window.confirm(`Excluir o orçamento ${budget.number}? Esta ação não pode ser desfeita.`)) {
                              removeBudget(budget.id);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="table-head">Código</th>
                    <th className="table-head">Cliente</th>
                    <th className="table-head">Data</th>
                    <th className="table-head text-right">Valor</th>
                    <th className="table-head">Situação</th>
                    <th className="table-head text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((budget) => (
                    <tr key={budget.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                      <td className="table-cell font-semibold text-slate-900 dark:text-slate-100">{budget.number}</td>
                      <td className="table-cell">
                        <p className="font-medium">{budget.customer.name || "Sem cliente"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{budget.projectName || "Sem projeto"}</p>
                      </td>
                      <td className="table-cell whitespace-nowrap">{formatDate(budget.createdAt)}</td>
                      <td className="table-cell whitespace-nowrap text-right font-semibold">
                        {formatCurrency(priceOf(budget))}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={budget.status} />
                      </td>
                      <td className="table-cell">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="btn-ghost p-1.5"
                            title="Duplicar"
                            onClick={() => {
                              const copy = duplicate(budget.id);
                              if (copy) navigate(`/orcamentos/${copy.id}`);
                            }}
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost p-1.5"
                            title="Exportar PDF"
                            onClick={() => exportProposalPdf(budget, settings)}
                          >
                            <FileDown size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost p-1.5 text-red-600"
                            title="Excluir"
                            onClick={() => {
                              if (window.confirm(`Excluir o orçamento ${budget.number}? Esta ação não pode ser desfeita.`)) {
                                removeBudget(budget.id);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </Card>

        <Card className="min-w-0">
          <SectionHeader title="Por situação" description="Distribuição dos orçamentos" />
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {stats.byStatus.map((entry) => {
              const percent = budgets.length > 0 ? (entry.count / budgets.length) * 100 : 0;
              return (
                <div key={entry.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{STATUS_LABELS[entry.status]}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{entry.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        entry.status === "aprovado"
                          ? "bg-emerald-500"
                          : entry.status === "recusado"
                            ? "bg-red-400"
                            : entry.status === "enviado"
                              ? "bg-brand-500"
                              : "bg-slate-400"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {budgets.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sem dados para exibir. Os indicadores aparecem quando houver orçamentos salvos.
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function priceOf(budget: Budget): number {
  return calculatePricing(budget).precoFinal;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="px-4 py-4 sm:px-5">
      <p className="card-title">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </Card>
  );
}
