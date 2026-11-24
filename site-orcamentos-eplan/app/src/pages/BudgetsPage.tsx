import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Download, FileDown, Plus, Search, Trash2, Upload } from "lucide-react";
import { useAppData } from "../app/store";
import { calculatePricing } from "../lib/pricing";
import { formatCurrency, formatDate, formatHours } from "../lib/format";
import { SERVICE_TYPE_LABELS, STATUS_LABELS, STATUS_ORDER } from "../lib/defaults";
import { Card, EmptyState, SectionHeader, StatusBadge, Toast } from "../components/ui";
import { exportBackup, exportBudgetJson, parseBackup } from "../services/dataBackup";
import { exportProposalPdf } from "../services/exportPdf";
import type { BudgetStatus } from "../types/budget";

type SortKey = "updated" | "created" | "value" | "number";

export default function BudgetsPage() {
  const { budgets, settings, duplicate, removeBudget, replaceAll } = useAppData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BudgetStatus | "todos">("todos");
  const [sort, setSort] = useState<SortKey>("updated");
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = budgets.filter((budget) => {
      const matchesStatus = status === "todos" || budget.status === status;
      if (!matchesStatus) return false;
      if (!term) return true;
      return [budget.number, budget.customer.name, budget.customer.company, budget.projectName, budget.projectCode]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
    return list.sort((a, b) => {
      switch (sort) {
        case "created":
          return b.createdAt.localeCompare(a.createdAt);
        case "value":
          return calculatePricing(b).precoFinal - calculatePricing(a).precoFinal;
        case "number":
          return a.number.localeCompare(b.number);
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
  }, [budgets, query, status, sort]);

  const handleImport = async (file: File) => {
    const text = await file.text();
    const parsed = parseBackup(text);
    if (!parsed.ok || !parsed.data) {
      setToast(parsed.error ?? "Falha ao importar");
      return;
    }
    const confirmed = window.confirm(
      `Importar ${parsed.data.budgets.length} orçamento(s) e substituir os dados atuais? Faça um backup antes se precisar.`,
    );
    if (!confirmed) return;
    replaceAll(parsed.data.budgets, parsed.data.settings);
    setToast("Backup importado");
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">Histórico</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Meus orçamentos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {budgets.length} orçamento(s) salvos neste navegador.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => exportBackup(settings, budgets)}>
            <Download size={15} /> Backup JSON
          </button>
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Importar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
              event.target.value = "";
            }}
          />
          <Link to="/orcamentos/novo" className="btn-primary">
            <Plus size={16} /> Novo
          </Link>
        </div>
      </header>

      <Card>
        <SectionHeader
          title="Filtros"
          description="Busque por código, cliente ou projeto"
          action={
            <div className="flex flex-wrap gap-2">
              <select className="input w-auto" value={status} onChange={(event) => setStatus(event.target.value as BudgetStatus | "todos")} aria-label="Filtrar por situação">
                <option value="todos">Todas as situações</option>
                {STATUS_ORDER.map((entry) => (
                  <option key={entry} value={entry}>
                    {STATUS_LABELS[entry]}
                  </option>
                ))}
              </select>
              <select className="input w-auto" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="Ordenar">
                <option value="updated">Atualização</option>
                <option value="created">Data de criação</option>
                <option value="value">Valor</option>
                <option value="number">Código</option>
              </select>
            </div>
          }
        />
        <div className="px-4 py-3 sm:px-5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por código, cliente, empresa ou projeto"
              aria-label="Buscar orçamentos"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={budgets.length === 0 ? "Nenhum orçamento salvo" : "Nenhum resultado para o filtro"}
            description={
              budgets.length === 0
                ? "Crie o primeiro orçamento com a calculadora rápida ou importe um backup JSON."
                : "Ajuste a busca ou o filtro de situação para ver outros registros."
            }
            action={
              budgets.length === 0 ? (
                <Link to="/orcamentos/novo" className="btn-primary">
                  <Plus size={16} /> Criar orçamento
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100 sm:hidden dark:divide-slate-800/60">
              {filtered.map((budget) => {
                const result = calculatePricing(budget);
                return (
                  <div key={budget.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/orcamentos/${budget.id}`}
                          className="text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
                        >
                          {budget.number}
                        </Link>
                        <p className="truncate text-sm text-slate-700 dark:text-slate-300">
                          {budget.customer.name || "Sem cliente"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {budget.projectName || "Sem projeto"} • {SERVICE_TYPE_LABELS[budget.serviceType]}
                        </p>
                      </div>
                      <StatusBadge status={budget.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(result.precoFinal)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatHours(result.hours.total)} • {formatDate(budget.updatedAt)}
                        </p>
                      </div>
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
                          className="btn-ghost p-1.5"
                          title="Exportar JSON"
                          onClick={() => exportBudgetJson(budget)}
                        >
                          <Download size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-1.5 text-red-600"
                          title="Excluir"
                          onClick={() => {
                            if (window.confirm(`Excluir o orçamento ${budget.number}?`)) removeBudget(budget.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full">
              <thead>
                <tr className="border-y border-slate-200 dark:border-slate-800">
                  <th className="table-head">Código</th>
                  <th className="table-head">Cliente / projeto</th>
                  <th className="table-head">Serviço</th>
                  <th className="table-head">Horas</th>
                  <th className="table-head text-right">Valor</th>
                  <th className="table-head">Situação</th>
                  <th className="table-head">Atualizado</th>
                  <th className="table-head text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((budget) => {
                  const result = calculatePricing(budget);
                  return (
                    <tr key={budget.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                      <td className="table-cell whitespace-nowrap font-semibold text-slate-900 dark:text-slate-100">
                        <Link to={`/orcamentos/${budget.id}`} className="hover:underline">
                          {budget.number}
                        </Link>
                      </td>
                      <td className="table-cell">
                        <p className="font-medium">{budget.customer.name || "Sem cliente"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {budget.projectName || "Sem projeto"}
                          {budget.projectCode ? ` • ${budget.projectCode}` : ""}
                        </p>
                      </td>
                      <td className="table-cell whitespace-nowrap text-xs">{SERVICE_TYPE_LABELS[budget.serviceType]}</td>
                      <td className="table-cell whitespace-nowrap">{formatHours(result.hours.total)}</td>
                      <td className="table-cell whitespace-nowrap text-right font-semibold">{formatCurrency(result.precoFinal)}</td>
                      <td className="table-cell">
                        <StatusBadge status={budget.status} />
                      </td>
                      <td className="table-cell whitespace-nowrap text-xs">{formatDate(budget.updatedAt)}</td>
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
                            className="btn-ghost p-1.5"
                            title="Exportar JSON"
                            onClick={() => exportBudgetJson(budget)}
                          >
                            <Download size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost p-1.5 text-red-600"
                            title="Excluir"
                            onClick={() => {
                              if (window.confirm(`Excluir o orçamento ${budget.number}?`)) removeBudget(budget.id);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>

      {toast ? <Toast message={toast} tone={toast.includes("Falha") || toast.includes("inválido") ? "error" : "success"} /> : null}
    </div>
  );
}
