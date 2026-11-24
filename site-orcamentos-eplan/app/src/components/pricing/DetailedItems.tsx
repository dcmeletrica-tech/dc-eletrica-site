import { Copy, Plus, Trash2, Wand2 } from "lucide-react";
import type { BudgetItem, CalculationMode, QuickEstimate } from "../../types/budget";
import { itemHours, itemSubtotal } from "../../lib/pricing";
import { formatCurrency, formatNumber } from "../../lib/format";
import { NumberInput } from "../ui";

export default function DetailedItems({
  items,
  onChange,
  categories,
  defaultRate,
  mode,
  quick,
  onConvert,
}: {
  items: BudgetItem[];
  onChange: (items: BudgetItem[]) => void;
  categories: string[];
  defaultRate: number;
  mode: CalculationMode;
  quick: QuickEstimate;
  onConvert: () => void;
}) {
  const active = mode === "detalhado";
  const totalHours = items.reduce((total, item) => total + itemHours(item), 0);
  const totalValue = items.reduce((total, item) => total + itemSubtotal(item), 0);

  const update = (id: string, patch: Partial<BudgetItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const add = () => {
    onChange([
      ...items,
      {
        id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        category: categories[0] ?? "Outros",
        description: "",
        quantity: 1,
        unit: "h",
        timePerUnit: 1,
        hourlyRate: defaultRate,
        notes: "",
      },
    ]);
  };

  const duplicate = (item: BudgetItem) => {
    const index = items.findIndex((entry) => entry.id === item.id);
    const copy = { ...item, id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` };
    const next = [...items];
    next.splice(index + 1, 0, copy);
    onChange(next);
  };

  const remove = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const quickItemCount =
    (quick.macrosQty > 0 ? 1 : 0) + (quick.pagesQty > 0 ? 1 : 0) + (quick.hours3d > 0 ? 1 : 0) + (quick.hoursEngineering > 0 ? 1 : 0);

  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      {!active ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          O modo rápido está ativo: estas linhas ficam guardadas, mas não entram no cálculo.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={add}>
            <Plus size={15} /> Adicionar atividade
          </button>
          <button type="button" className="btn-secondary" onClick={onConvert} disabled={quickItemCount === 0}>
            <Wand2 size={15} /> Converter estimativa rápida em itens
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {items.length} linha(s) • {formatNumber(totalHours, 2)} h • {formatCurrency(totalValue)}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nenhuma atividade detalhada. Adicione linhas ou converta a estimativa rápida.
        </p>
      ) : (
        <>
          <div className={`space-y-3 md:hidden ${active ? "" : "opacity-60"}`}>
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <select
                    className="input text-xs"
                    value={item.category}
                    onChange={(event) => update(item.id, { category: event.target.value })}
                    aria-label="Categoria"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" className="btn-ghost p-1.5" title="Duplicar linha" onClick={() => duplicate(item)}>
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost p-1.5 text-red-600"
                      title="Remover linha"
                      onClick={() => remove(item.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <input
                  className="input mt-2"
                  value={item.description}
                  placeholder="Descrição da atividade"
                  onChange={(event) => update(item.id, { description: event.target.value })}
                  aria-label="Descrição"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <p className="label">Qtd</p>
                    <NumberInput value={item.quantity} onChange={(value) => update(item.id, { quantity: value })} step={1} ariaLabel="Quantidade" />
                  </div>
                  <div>
                    <p className="label">Unidade</p>
                    <select
                      className="input"
                      value={item.unit}
                      onChange={(event) => update(item.id, { unit: event.target.value as BudgetItem["unit"] })}
                      aria-label="Unidade de tempo"
                    >
                      <option value="min">min</option>
                      <option value="h">h</option>
                    </select>
                  </div>
                  <div>
                    <p className="label">Tempo</p>
                    <NumberInput
                      value={item.timePerUnit}
                      onChange={(value) => update(item.id, { timePerUnit: value })}
                      step={0.25}
                      ariaLabel="Tempo por unidade"
                    />
                  </div>
                  <div>
                    <p className="label">R$/h</p>
                    <NumberInput
                      value={item.hourlyRate}
                      onChange={(value) => update(item.id, { hourlyRate: value })}
                      step={5}
                      ariaLabel="Valor por hora"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-950">
                  <span className="text-slate-500 dark:text-slate-400">{formatNumber(itemHours(item), 2)} h</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(itemSubtotal(item))}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={`hidden md:block ${active ? "" : "opacity-60"}`}>
            <div className="overflow-x-auto">
              <table className="min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="table-head">Categoria</th>
                <th className="table-head">Descrição</th>
                <th className="table-head w-20">Qtd</th>
                <th className="table-head w-24">Unidade</th>
                <th className="table-head w-24">Tempo</th>
                <th className="table-head w-20 text-right">Horas</th>
                <th className="table-head w-24">R$/h</th>
                <th className="table-head w-24 text-right">Subtotal</th>
                <th className="table-head w-20 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 align-top dark:border-slate-800/60">
                  <td className="table-cell">
                    <select
                      className="input"
                      value={item.category}
                      onChange={(event) => update(item.id, { category: event.target.value })}
                      aria-label="Categoria"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell">
                    <input
                      className="input"
                      value={item.description}
                      placeholder="Descrição da atividade"
                      onChange={(event) => update(item.id, { description: event.target.value })}
                      aria-label="Descrição"
                    />
                    <input
                      className="input mt-1 text-xs"
                      value={item.notes}
                      placeholder="Observações"
                      onChange={(event) => update(item.id, { notes: event.target.value })}
                      aria-label="Observações"
                    />
                  </td>
                  <td className="table-cell">
                    <NumberInput value={item.quantity} onChange={(value) => update(item.id, { quantity: value })} step={1} ariaLabel="Quantidade" />
                  </td>
                  <td className="table-cell">
                    <select
                      className="input"
                      value={item.unit}
                      onChange={(event) => update(item.id, { unit: event.target.value as BudgetItem["unit"] })}
                      aria-label="Unidade de tempo"
                    >
                      <option value="min">min</option>
                      <option value="h">h</option>
                    </select>
                  </td>
                  <td className="table-cell">
                    <NumberInput
                      value={item.timePerUnit}
                      onChange={(value) => update(item.id, { timePerUnit: value })}
                      step={0.25}
                      ariaLabel="Tempo por unidade"
                    />
                  </td>
                  <td className="table-cell text-right font-semibold">{formatNumber(itemHours(item), 2)}</td>
                  <td className="table-cell">
                    <NumberInput
                      value={item.hourlyRate}
                      onChange={(value) => update(item.id, { hourlyRate: value })}
                      step={5}
                      ariaLabel="Valor por hora"
                    />
                  </td>
                  <td className="table-cell text-right font-semibold">{formatCurrency(itemSubtotal(item))}</td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn-ghost p-1.5" title="Duplicar linha" onClick={() => duplicate(item)}>
                        <Copy size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost p-1.5 text-red-600"
                        title="Remover linha"
                        onClick={() => remove(item.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
