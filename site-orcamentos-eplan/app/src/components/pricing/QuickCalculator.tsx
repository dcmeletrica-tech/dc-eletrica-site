import { RotateCcw } from "lucide-react";
import type { CalculationMode, QuickEstimate } from "../../types/budget";
import type { HoursBreakdown } from "../../types/pricing";
import { hoursShare } from "../../lib/pricing";
import { formatHours, formatNumber } from "../../lib/format";
import { NumberInput, SliderField } from "../ui";

const FIELDS: {
  key: keyof QuickEstimate;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
  hint: string;
}[] = [
  { key: "macrosQty", label: "Quantidade de macros novas", min: 0, max: 30, step: 1, suffix: "un", hint: "0 a 30" },
  { key: "minutesPerMacro", label: "Tempo médio por macro", min: 5, max: 120, step: 5, suffix: "min", hint: "5 a 120" },
  { key: "pagesQty", label: "Páginas para desenvolver", min: 0, max: 150, step: 1, suffix: "pág", hint: "0 a 150" },
  { key: "minutesPerPage", label: "Tempo médio por página", min: 1, max: 90, step: 1, suffix: "min", hint: "1 a 90" },
  { key: "hours3d", label: "Horas de modelagem 3D", min: 0, max: 40, step: 0.25, suffix: "h", hint: "0 a 40" },
  { key: "hoursEngineering", label: "Dimensionamentos e revisões", min: 0, max: 60, step: 0.25, suffix: "h", hint: "0 a 60" },
  { key: "hourlyRate", label: "Valor da hora técnica", min: 50, max: 500, step: 5, suffix: "R$/h", hint: "50 a 500" },
];

export default function QuickCalculator({
  quick,
  onChange,
  mode,
  onModeChange,
  hours,
  onReset,
}: {
  quick: QuickEstimate;
  onChange: (patch: Partial<QuickEstimate>) => void;
  mode: CalculationMode;
  onModeChange: (mode: CalculationMode) => void;
  hours: HoursBreakdown;
  onReset: () => void;
}) {
  const share = hoursShare(hours);
  const active = mode === "rapido";

  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => onModeChange("rapido")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              active ? "bg-white text-brand-900 shadow-sm dark:bg-slate-950 dark:text-brand-200" : "text-slate-500"
            }`}
          >
            Rápido
          </button>
          <button
            type="button"
            onClick={() => onModeChange("detalhado")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              !active ? "bg-white text-brand-900 shadow-sm dark:bg-slate-950 dark:text-brand-200" : "text-slate-500"
            }`}
          >
            Detalhado
          </button>
        </div>
        <button type="button" className="btn-secondary" onClick={onReset}>
          <RotateCcw size={15} /> Restaurar exemplo
        </button>
      </div>

      {!active ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          O modo detalhado está ativo: estes campos ficam guardados, mas não entram no cálculo. O total vem das linhas de
          atividade.
        </p>
      ) : null}

      <div className={`grid gap-4 sm:grid-cols-2 ${active ? "" : "opacity-60"}`}>
        {FIELDS.map((field) => (
          <SliderField
            key={field.key}
            label={field.label}
            value={quick[field.key]}
            onChange={(value) => onChange({ [field.key]: value } as Partial<QuickEstimate>)}
            min={field.min}
            max={field.max}
            step={field.step}
            suffix={field.suffix}
            hint={field.hint}
          />
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Distribuição das horas
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatHours(hours.total)}</p>
        </div>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {share.map((entry, index) => (
            <div
              key={entry.key}
              className={["bg-brand-900", "bg-brand-600", "bg-brand-400", "bg-emerald-500"][index]}
              style={{ width: `${entry.percent}%` }}
              title={`${entry.label}: ${formatHours(entry.value)}`}
            />
          ))}
        </div>
        <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
          {share.map((entry, index) => (
            <li key={entry.key} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    ["bg-brand-900", "bg-brand-600", "bg-brand-400", "bg-emerald-500"][index]
                  }`}
                />
                {entry.label}
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(entry.value, 2)} h
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Macros" value={`${formatNumber(quick.macrosQty)} × ${formatNumber(quick.minutesPerMacro)} min`} />
        <MiniStat label="Páginas" value={`${formatNumber(quick.pagesQty)} × ${formatNumber(quick.minutesPerPage)} min`} />
        <MiniStat label="Total exato" value={`${formatNumber(hours.total, 6)} h`} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

export function QuickHourInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <NumberInput value={value} onChange={onChange} min={0} step={0.25} suffix="h" />
    </div>
  );
}
