export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const numberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return currencyFormatter.format(safe);
}

export function formatNumber(value: number, digits = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(safe);
}

export function formatHours(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${formatNumber(safe, 1)} h`;
}

export function formatHoursLong(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${formatNumber(safe, 2)} h`;
}

export function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${formatNumber(safe, 1)}%`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function parseDecimal(input: string): number {
  const cleaned = input
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, (match, _offset, full) => (full.indexOf(",") > -1 ? "" : match))
    .replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sanitizeFileName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function formatHoursMinutes(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  const totalMinutes = Math.round(safe * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}
