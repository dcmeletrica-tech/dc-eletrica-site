import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { X } from "lucide-react";
import { parseDecimal } from "../../lib/format";
import type { BudgetStatus } from "../../types/budget";
import { STATUS_LABELS } from "../../lib/defaults";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

function formatInputValue(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(value).replace(".", ",");
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  id,
  ariaLabel,
  className = "",
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  id?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(() => formatInputValue(value));

  useEffect(() => {
    if (parseDecimal(text) !== value) setText(formatInputValue(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setText(raw);
    if (raw.trim() === "" || raw === "-" || raw === ",") return;
    let parsed = parseDecimal(raw);
    if (!Number.isFinite(parsed)) return;
    if (min !== undefined && parsed < min) parsed = min;
    if (max !== undefined && parsed > max) parsed = max;
    onChange(parsed);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        aria-label={ariaLabel}
        type="text"
        inputMode="decimal"
        value={text}
        step={step}
        disabled={disabled}
        onChange={handleChange}
        onBlur={() => setText(formatInputValue(value))}
        className={`input ${suffix ? "pr-10" : ""}`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label className="label mb-0" htmlFor={id}>
          {label}
        </label>
        <NumberInput value={value} onChange={onChange} min={0} step={step} suffix={suffix} className="w-28" ariaLabel={label} />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full cursor-pointer"
      />
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{min}</span>
        {hint ? <span className="text-slate-500 dark:text-slate-400">{hint}</span> : null}
        <span>{max}</span>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: BudgetStatus }) {
  const styles: Record<BudgetStatus, string> = {
    rascunho: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    enviado: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    aprovado: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    recusado: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:rounded-2xl ${
          wide ? "sm:max-w-4xl" : "sm:max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button type="button" className="btn-ghost p-1.5" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12h6M9 16h6M9 8h6" strokeLinecap="round" />
          <rect x="3" y="4" width="18" height="16" rx="2" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "error" }) {
  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
        tone === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {message}
    </div>
  );
}
