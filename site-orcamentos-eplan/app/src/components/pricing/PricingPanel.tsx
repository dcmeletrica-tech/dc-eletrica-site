import { Info, Plus, Trash2 } from "lucide-react";
import type { DirectCost, PricingParams } from "../../types/budget";
import type { PricingResult } from "../../types/pricing";
import { formatCurrency, formatNumber, formatPercent } from "../../lib/format";
import { NumberInput, SliderField } from "../ui";

export default function PricingPanel({
  pricing,
  onChange,
  costs,
  onCostsChange,
  result,
}: {
  pricing: PricingParams;
  onChange: (patch: Partial<PricingParams>) => void;
  costs: DirectCost[];
  onCostsChange: (costs: DirectCost[]) => void;
  result: PricingResult;
}) {
  const addCost = () => {
    onCostsChange([
      ...costs,
      { id: `cost-${Date.now().toString(36)}`, description: "", amount: 0 },
    ]);
  };

  return (
    <div className="space-y-5 px-4 py-4 sm:px-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SliderField
          label="Reserva para imprevistos"
          value={pricing.reservePercent}
          onChange={(value) => onChange({ reservePercent: value })}
          min={0}
          max={50}
          step={1}
          suffix="%"
          hint="Reserva não é margem de lucro"
        />
        <SliderField
          label="Tributos estimados"
          value={pricing.taxPercent}
          onChange={(value) => onChange({ taxPercent: value })}
          min={0}
          max={40}
          step={0.5}
          suffix="%"
          hint="Sobre o faturamento"
        />
        <SliderField
          label="Margem desejada"
          value={pricing.marginPercent}
          onChange={(value) => onChange({ marginPercent: value })}
          min={0}
          max={60}
          step={1}
          suffix="%"
          hint="Sobre o preço de venda"
        />
        <SliderField
          label="Desconto comercial"
          value={pricing.discountPercent}
          onChange={(value) => onChange({ discountPercent: value })}
          min={0}
          max={50}
          step={1}
          suffix="%"
          hint="Sobre o preço sugerido"
        />
      </div>

      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <p className="flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-600" />
          <span>
            A reserva de 15% cobre imprevistos e não é margem de lucro. A margem é aplicada sobre o preço de venda, e os
            tributos são estimados sobre o faturamento. A base técnica usa a taxa de venda por hora, não o custo interno.
          </span>
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Custos adicionais diretos</p>
          <button type="button" className="btn-secondary" onClick={addCost}>
            <Plus size={15} /> Adicionar custo
          </button>
        </div>
        {costs.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Transporte, ART, deslocamento, terceiros, impressão e licenças atribuíveis ao serviço.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {costs.map((cost) => (
              <div key={cost.id} className="flex gap-2">
                <input
                  className="input flex-1"
                  value={cost.description}
                  placeholder="Descrição do custo"
                  onChange={(event) =>
                    onCostsChange(costs.map((entry) => (entry.id === cost.id ? { ...entry, description: event.target.value } : entry)))
                  }
                  aria-label="Descrição do custo"
                />
                <NumberInput
                  value={cost.amount}
                  onChange={(value) =>
                    onCostsChange(costs.map((entry) => (entry.id === cost.id ? { ...entry, amount: value } : entry)))
                  }
                  step={10}
                  suffix="R$"
                  className="w-32"
                  ariaLabel="Valor do custo"
                />
                <button
                  type="button"
                  className="btn-ghost p-2 text-red-600"
                  onClick={() => onCostsChange(costs.filter((entry) => entry.id !== cost.id))}
                  aria-label="Remover custo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <input
            type="checkbox"
            checked={pricing.manualPriceEnabled}
            onChange={(event) => onChange({ manualPriceEnabled: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Usar preço manual negociado
        </label>
        {pricing.manualPriceEnabled ? (
          <div className="mt-2 max-w-xs">
            <NumberInput
              value={pricing.manualPrice}
              onChange={(value) => onChange({ manualPrice: value })}
              step={100}
              suffix="R$"
              ariaLabel="Preço manual"
            />
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full">
          <tbody>
            <Row label="Base técnica" value={formatCurrency(result.baseTecnica)} />
            <Row label="Custos adicionais" value={formatCurrency(result.custosAdicionais)} />
            <Row label="Subtotal base" value={formatCurrency(result.subtotalBase)} strong />
            <Row label={`Reserva (${formatPercent(pricing.reservePercent)})`} value={formatCurrency(result.reservaValor)} />
            <Row label="Base com reserva" value={formatCurrency(result.baseComReserva)} strong />
            <Row label="Preço sugerido" value={formatCurrency(result.precoSugerido)} />
            <Row label={`Desconto (${formatPercent(pricing.discountPercent)})`} value={`- ${formatCurrency(result.descontoValor)}`} />
            <Row label="Preço final" value={formatCurrency(result.precoFinal)} highlight />
            <Row label="Tributos sobre o preço final" value={formatCurrency(result.tributosSobreFinal)} />
            <Row label="Saldo sobre base de referência" value={formatCurrency(result.saldoSobreBase)} />
            <Row label="Margem sobre base de referência" value={`${formatNumber(result.margemSobreBase, 2)}%`} />
          </tbody>
        </table>
      </div>

      {result.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
          {result.error}
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <tr className={`border-b border-slate-100 last:border-0 dark:border-slate-800/60 ${highlight ? "bg-brand-50 dark:bg-brand-950/40" : ""}`}>
      <td className={`px-3 py-2 text-sm ${strong ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
        {label}
      </td>
      <td
        className={`px-3 py-2 text-right text-sm tabular-nums ${
          highlight
            ? "text-base font-bold text-brand-900 dark:text-brand-200"
            : strong
              ? "font-semibold text-slate-900 dark:text-slate-100"
              : "text-slate-700 dark:text-slate-300"
        }`}
      >
        {value}
      </td>
    </tr>
  );
}
