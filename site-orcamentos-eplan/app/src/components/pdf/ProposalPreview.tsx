import { useState } from "react";
import { FileDown, Printer } from "lucide-react";
import type { Budget, BudgetSettings } from "../../types/budget";
import { calculatePricing, itemHours, itemSubtotal } from "../../lib/pricing";
import { formatCurrency, formatDate, formatHours, formatNumber } from "../../lib/format";
import { SERVICE_TYPE_LABELS } from "../../lib/defaults";
import { Modal } from "../ui";
import { exportInternalPdf, exportProposalPdf } from "../../services/exportPdf";
import { BRAND_NAME, BRAND_SIMBOLO } from "../../assets/brand";

export default function ProposalPreview({
  open,
  onClose,
  budget,
  settings,
  issues,
}: {
  open: boolean;
  onClose: () => void;
  budget: Budget;
  settings: BudgetSettings;
  issues: { field: string; message: string }[];
}) {
  const [showHours, setShowHours] = useState(true);
  const [showUnitValues, setShowUnitValues] = useState(true);
  const result = calculatePricing(budget);
  const blocked = issues.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Visualização da proposta"
      wide
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => exportInternalPdf(budget, settings)}
          >
            <Printer size={15} /> Memória interna
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={blocked}
            onClick={() => exportProposalPdf(budget, settings, { showHours, showUnitValues })}
          >
            <FileDown size={15} /> Baixar PDF do cliente
          </button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showHours} onChange={(event) => setShowHours(event.target.checked)} className="h-4 w-4" />
          Mostrar horas
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showUnitValues}
            onChange={(event) => setShowUnitValues(event.target.checked)}
            className="h-4 w-4"
          />
          Mostrar valor unitário
        </label>
      </div>

      {blocked ? (
        <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <p className="font-semibold">Não é possível emitir a proposta ainda:</p>
          <ul className="mt-1 list-inside list-disc">
            {issues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 text-slate-800 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <img
              src={settings.company.logoDataUrl || BRAND_SIMBOLO}
              alt={settings.company.name || BRAND_NAME}
              className="h-12 w-12 rounded-lg object-contain ring-1 ring-slate-200"
            />
            <div>
              <p className="text-lg font-bold text-brand-900">{settings.company.name || BRAND_NAME}</p>
              <p className="text-xs text-slate-500">
                {[settings.company.document, settings.company.phone, settings.company.email].filter(Boolean).join(" • ")}
              </p>
              {settings.company.address ? <p className="text-xs text-slate-500">{settings.company.address}</p> : null}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proposta comercial</p>
            <p className="text-sm font-bold">{budget.number}</p>
            <p className="text-xs text-slate-500">{formatDate(budget.createdAt)}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-xs font-semibold uppercase text-slate-500">Cliente: </span>
            {budget.customer.name || "—"}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-slate-500">Projeto: </span>
            {budget.projectName || "—"}
          </p>
          {budget.projectCode ? (
            <p>
              <span className="text-xs font-semibold uppercase text-slate-500">Código: </span>
              {budget.projectCode}
            </p>
          ) : null}
          <p>
            <span className="text-xs font-semibold uppercase text-slate-500">Serviço: </span>
            {SERVICE_TYPE_LABELS[budget.serviceType]}
          </p>
        </div>

        {budget.scope ? <p className="mt-3 text-sm text-slate-600">{budget.scope}</p> : null}

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="py-1.5 text-left">Atividade</th>
              {showHours ? <th className="py-1.5 text-right">Horas</th> : null}
              {showUnitValues ? <th className="py-1.5 text-right">Valor unit.</th> : null}
              <th className="py-1.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(budget.mode === "detalhado" ? budget.items : []).map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-1.5">{item.description || item.category}</td>
                {showHours ? <td className="py-1.5 text-right">{formatNumber(itemHours(item), 2)}</td> : null}
                {showUnitValues ? <td className="py-1.5 text-right">{formatCurrency(item.hourlyRate)}</td> : null}
                <td className="py-1.5 text-right">{formatCurrency(itemSubtotal(item))}</td>
              </tr>
            ))}
            {budget.mode === "rapido"
              ? [
                  { label: "Macros", hours: result.hours.macros },
                  { label: "Páginas", hours: result.hours.pages },
                  { label: "Modelagem 3D", hours: result.hours.threeD },
                  { label: "Dimensionamento e revisões", hours: result.hours.engineering },
                ]
                  .filter((group) => group.hours > 0)
                  .map((group) => (
                    <tr key={group.label} className="border-b border-slate-100">
                      <td className="py-1.5">{group.label}</td>
                      {showHours ? <td className="py-1.5 text-right">{formatNumber(group.hours, 2)}</td> : null}
                      {showUnitValues ? (
                        <td className="py-1.5 text-right">{formatCurrency(budget.quick.hourlyRate)}</td>
                      ) : null}
                      <td className="py-1.5 text-right">{formatCurrency(group.hours * budget.quick.hourlyRate)}</td>
                    </tr>
                  ))
              : null}
          </tbody>
        </table>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 px-3 py-2">
          <span className="text-sm font-semibold text-brand-900">Horas previstas: {formatHours(result.hours.total)}</span>
          <span className="text-lg font-bold text-brand-900">{formatCurrency(result.precoFinal)}</span>
        </div>

        <div className="mt-3 space-y-1 text-xs text-slate-600">
          <p>
            <strong>Prazo:</strong> {budget.terms.deliveryTerm || "a definir"}
          </p>
          <p>
            <strong>Pagamento:</strong> {budget.terms.paymentTerms || "a definir"}
          </p>
          <p>
            <strong>Validade:</strong> {formatNumber(budget.terms.validityDays)} dias • <strong>Revisões:</strong>{" "}
            {formatNumber(budget.terms.revisionsIncluded)}
          </p>
        </div>
      </div>
    </Modal>
  );
}
