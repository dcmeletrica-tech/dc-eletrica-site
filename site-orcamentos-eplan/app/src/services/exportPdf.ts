import type { Budget, BudgetSettings } from "../types/budget";
import { calculatePricing, itemHours, itemSubtotal } from "../lib/pricing";
import { formatCurrency, formatDate, formatHours, formatNumber, sanitizeFileName } from "../lib/format";
import { SERVICE_TYPE_LABELS } from "../lib/defaults";
import { PdfBuilder, savePdfBytes } from "../lib/pdf";
import type { Rgb } from "../lib/pdf";

export interface PdfOptions {
  showUnitValues: boolean;
  showHours: boolean;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const NAVY: Rgb = [15, 42, 74];
const SLATE: Rgb = [51, 65, 85];
const MUTED: Rgb = [100, 116, 139];

class Layout {
  pdf = new PdfBuilder();
  y = MARGIN;

  ensure(space: number) {
    if (this.y + space > PAGE_HEIGHT - 22) {
      this.pdf.addPage();
      this.y = MARGIN;
    }
  }

  title(text: string, size = 12) {
    this.ensure(size * 0.6 + 4);
    this.pdf.text(text, MARGIN, this.y, { size, bold: true, color: NAVY });
    this.y += size * 0.45 + 2;
  }

  paragraph(text: string, size = 9.5, color: Rgb = SLATE) {
    if (!text.trim()) return;
    const lines = this.pdf.wrap(text, CONTENT_WIDTH, size);
    for (const line of lines) {
      this.ensure(size * 0.5);
      this.pdf.text(line, MARGIN, this.y, { size, color });
      this.y += size * 0.45;
    }
    this.y += 2;
  }

  labelValue(label: string, value: string) {
    this.ensure(6);
    this.pdf.text(label.toUpperCase(), MARGIN, this.y, { size: 9, bold: true, color: MUTED });
    this.pdf.text(value, MARGIN, this.y + 4.5, { size: 10, color: [15, 23, 42] });
    this.y += 9;
  }

  divider() {
    this.ensure(4);
    this.pdf.line(MARGIN, this.y, PAGE_WIDTH - MARGIN, this.y);
    this.y += 4;
  }

  table(headers: string[], rows: string[][], widths: number[], align: ("left" | "right")[] = []) {
    const drawHead = () => {
      this.ensure(10);
      this.pdf.rect(MARGIN, this.y - 4, CONTENT_WIDTH, 7, [241, 245, 249]);
      let x = MARGIN + 2;
      headers.forEach((header, index) => {
        const width = widths[index];
        this.pdf.text(header, align[index] === "right" ? x + width - 4 : x, this.y, {
          size: 8,
          bold: true,
          color: [71, 85, 105],
          align: align[index] === "right" ? "right" : "left",
        });
        x += width;
      });
      this.y += 6;
    };

    drawHead();

    for (const row of rows) {
      const cellLines = row.map((cell, index) => this.pdf.wrap(cell, widths[index] - 4, 8.5));
      const height = Math.max(...cellLines.map((lines) => lines.length)) * 4 + 2;
      if (this.y + height > PAGE_HEIGHT - 22) {
        this.pdf.addPage();
        this.y = MARGIN;
        drawHead();
      }
      let x = MARGIN + 2;
      cellLines.forEach((lines, index) => {
        const width = widths[index];
        lines.forEach((line, lineIndex) => {
          this.pdf.text(line, align[index] === "right" ? x + width - 4 : x, this.y + lineIndex * 4, {
            size: 8.5,
            color: [30, 41, 59],
            align: align[index] === "right" ? "right" : "left",
          });
        });
        x += width;
      });
      this.y += height;
      this.pdf.line(MARGIN, this.y - 1.5, PAGE_WIDTH - MARGIN, this.y - 1.5, [241, 245, 249]);
    }
    this.y += 3;
  }

  finish(footer: string): Uint8Array {
    const pages = this.pdf.pageCount;
    for (let page = 0; page < pages; page += 1) {
      this.pdf.setPage(page);
      this.pdf.text(footer, MARGIN, PAGE_HEIGHT - 10, { size: 7.5, color: [148, 163, 184] });
      this.pdf.text(`Página ${page + 1} de ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, {
        size: 7.5,
        color: [148, 163, 184],
        align: "right",
      });
    }
    return this.pdf.build();
  }
}

function header(layout: Layout, budget: Budget, settings: BudgetSettings, subtitle: string) {
  const { pdf } = layout;
  pdf.rect(0, 0, PAGE_WIDTH, 30, NAVY);
  pdf.text(settings.company.name || "OrçaEng", MARGIN, 13, { size: 15, bold: true, color: [255, 255, 255] });
  const companyLine = [settings.company.document, settings.company.phone, settings.company.email]
    .filter(Boolean)
    .join("  •  ");
  if (companyLine) pdf.text(companyLine, MARGIN, 19, { size: 8.5, color: [219, 234, 254] });
  if (settings.company.address) pdf.text(settings.company.address, MARGIN, 24, { size: 8.5, color: [219, 234, 254] });
  pdf.text(subtitle.toUpperCase(), PAGE_WIDTH - MARGIN, 13, { size: 9, bold: true, color: [255, 255, 255], align: "right" });
  pdf.text(`${budget.number}  •  ${formatDate(budget.createdAt)}`, PAGE_WIDTH - MARGIN, 19, {
    size: 8.5,
    color: [219, 234, 254],
    align: "right",
  });
  layout.y = 38;
}

function proposalFileName(budget: Budget): string {
  const client = sanitizeFileName(budget.customer.name || "Cliente");
  return `Proposta_${sanitizeFileName(budget.number)}_${client}.pdf`;
}

export function buildProposalPdf(
  budget: Budget,
  settings: BudgetSettings,
  options: PdfOptions = { showUnitValues: true, showHours: true },
): Uint8Array {
  const result = calculatePricing(budget);
  const layout = new Layout();
  header(layout, budget, settings, "Proposta comercial");

  layout.title("Dados da proposta", 11);
  layout.labelValue("Cliente", budget.customer.name || "—");
  if (budget.customer.company || budget.customer.contact) {
    layout.labelValue("Empresa / contato", [budget.customer.company, budget.customer.contact].filter(Boolean).join(" — "));
  }
  layout.labelValue("Projeto", budget.projectName || "—");
  if (budget.projectCode) layout.labelValue("Código do projeto (contratante)", budget.projectCode);
  layout.labelValue("Tipo de serviço", SERVICE_TYPE_LABELS[budget.serviceType]);
  layout.divider();

  layout.title("Objetivo do serviço", 11);
  layout.paragraph(
    budget.scope ||
      `Elaboração de serviços de engenharia elétrica referentes a ${budget.projectName || "projeto informado"}, conforme escopo e premissas abaixo.`,
  );

  const rows: string[][] = [];
  const headers: string[] = ["Atividade"];
  const widths: number[] = [110];
  const align: ("left" | "right")[] = ["left"];

  if (options.showHours) {
    headers.push("Horas");
    widths.push(22);
    align.push("right");
  }
  if (options.showUnitValues) {
    headers.push("Valor unit.");
    widths.push(26);
    align.push("right");
  }
  headers.push("Subtotal");
  widths.push(22);
  align.push("right");

  if (budget.mode === "detalhado") {
    for (const item of budget.items) {
      const row = [item.description || item.category];
      if (options.showHours) row.push(formatNumber(itemHours(item), 2));
      if (options.showUnitValues) row.push(formatCurrency(item.hourlyRate));
      row.push(formatCurrency(itemSubtotal(item)));
      rows.push(row);
    }
  } else {
    const groups = [
      {
        label: `Macros novas (${formatNumber(budget.quick.macrosQty)} un × ${formatNumber(budget.quick.minutesPerMacro)} min)`,
        hours: result.hours.macros,
      },
      {
        label: `Páginas de diagrama (${formatNumber(budget.quick.pagesQty)} pág × ${formatNumber(budget.quick.minutesPerPage)} min)`,
        hours: result.hours.pages,
      },
      { label: "Modelagem 3D (Pro Panel)", hours: result.hours.threeD },
      { label: "Dimensionamentos e revisões", hours: result.hours.engineering },
    ].filter((group) => group.hours > 0);
    for (const group of groups) {
      const row = [group.label];
      if (options.showHours) row.push(formatNumber(group.hours, 2));
      if (options.showUnitValues) row.push(formatCurrency(budget.quick.hourlyRate));
      row.push(formatCurrency(group.hours * budget.quick.hourlyRate));
      rows.push(row);
    }
  }

  if (rows.length > 0) {
    layout.title("Atividades previstas", 11);
    layout.table(headers, rows, widths, align);
  }

  layout.ensure(24);
  layout.pdf.rect(MARGIN, layout.y, CONTENT_WIDTH, 18, [239, 246, 255]);
  layout.pdf.text("HORAS TÉCNICAS PREVISTAS", MARGIN + 4, layout.y + 6, { size: 9, bold: true, color: [71, 85, 105] });
  layout.pdf.text("PREÇO GLOBAL", MARGIN + 4, layout.y + 13, { size: 9, bold: true, color: [71, 85, 105] });
  layout.pdf.text(formatHours(result.hours.total), MARGIN + 70, layout.y + 6, { size: 11, bold: true, color: NAVY });
  layout.pdf.text(formatCurrency(result.precoFinal), MARGIN + 70, layout.y + 13.5, { size: 14, bold: true, color: NAVY });
  layout.y += 24;

  layout.title("Condições comerciais", 11);
  layout.labelValue("Prazo de execução", budget.terms.deliveryTerm || "A definir");
  layout.labelValue("Condições de pagamento", budget.terms.paymentTerms || "A definir");
  layout.labelValue(
    "Validade da proposta",
    `${formatNumber(budget.terms.validityDays)} dias a partir de ${formatDate(budget.createdAt)}`,
  );
  layout.labelValue("Revisões incluídas", formatNumber(budget.terms.revisionsIncluded));

  if (budget.terms.inclusions.trim()) {
    layout.title("Inclusões", 10);
    layout.paragraph(budget.terms.inclusions);
  }
  if (budget.terms.exclusions.trim()) {
    layout.title("Exclusões", 10);
    layout.paragraph(budget.terms.exclusions);
  }
  if (budget.terms.assumptions.trim()) {
    layout.title("Premissas e dependências", 10);
    layout.paragraph(budget.terms.assumptions);
  }
  if (budget.terms.notes.trim()) {
    layout.title("Observações", 10);
    layout.paragraph(budget.terms.notes);
  }

  layout.paragraph(
    "Alterações de escopo, mudanças de premissas ou revisões adicionais serão reorçadas antes da execução.",
    8.5,
    MUTED,
  );

  layout.ensure(26);
  layout.divider();
  layout.pdf.text("Aceite do cliente: ______________________________________    Data: ____ / ____ / ________", MARGIN, layout.y + 8, {
    size: 8.5,
    color: MUTED,
  });

  return layout.finish(settings.defaults.footer || settings.company.name || "OrçaEng");
}

export function exportProposalPdf(
  budget: Budget,
  settings: BudgetSettings,
  options: PdfOptions = { showUnitValues: true, showHours: true },
): void {
  savePdfBytes(buildProposalPdf(budget, settings, options), proposalFileName(budget));
}

export function buildInternalPdf(budget: Budget, settings: BudgetSettings): Uint8Array {
  const result = calculatePricing(budget);
  const layout = new Layout();
  header(layout, budget, settings, "Memória interna de orçamento");

  layout.title("Identificação", 11);
  layout.labelValue("Cliente", budget.customer.name || "—");
  layout.labelValue("Projeto", `${budget.projectName || "—"}${budget.projectCode ? ` — ${budget.projectCode}` : ""}`);
  layout.labelValue(
    "Modo de cálculo",
    budget.mode === "rapido" ? "Rápido (estimativa por grupos)" : "Detalhado (linhas de atividade)",
  );
  layout.divider();

  layout.title("Horas por categoria", 11);
  layout.table(
    ["Categoria", "Horas"],
    [
      ["Macros", formatNumber(result.hours.macros, 3)],
      ["Páginas", formatNumber(result.hours.pages, 3)],
      ["Modelagem 3D", formatNumber(result.hours.threeD, 3)],
      ["Dimensionamento e revisões", formatNumber(result.hours.engineering, 3)],
      ["Total", formatNumber(result.hours.total, 3)],
    ],
    [140, 40],
    ["left", "right"],
  );

  if (budget.mode === "detalhado" && budget.items.length > 0) {
    layout.title("Linhas de atividade", 11);
    layout.table(
      ["Atividade", "Qtd", "Tempo", "Horas", "R$/h", "Subtotal"],
      budget.items.map((item) => [
        `${item.category}${item.description ? ` — ${item.description}` : ""}`,
        formatNumber(item.quantity, 2),
        `${formatNumber(item.timePerUnit, 2)} ${item.unit}`,
        formatNumber(itemHours(item), 3),
        formatCurrency(item.hourlyRate),
        formatCurrency(itemSubtotal(item)),
      ]),
      [76, 16, 20, 20, 24, 24],
      ["left", "right", "right", "right", "right", "right"],
    );
  }

  if (budget.directCosts.length > 0) {
    layout.title("Custos adicionais diretos", 11);
    layout.table(
      ["Descrição", "Valor"],
      budget.directCosts.map((cost) => [cost.description || "Custo", formatCurrency(cost.amount)]),
      [140, 40],
      ["left", "right"],
    );
  }

  layout.title("Composição do preço", 11);
  layout.table(
    ["Parâmetro", "Valor"],
    [
      ["Base técnica", formatCurrency(result.baseTecnica)],
      ["Custos adicionais", formatCurrency(result.custosAdicionais)],
      ["Subtotal base", formatCurrency(result.subtotalBase)],
      [`Reserva (${formatNumber(budget.pricing.reservePercent, 2)}%)`, formatCurrency(result.reservaValor)],
      ["Base com reserva", formatCurrency(result.baseComReserva)],
      [`Tributos (${formatNumber(budget.pricing.taxPercent, 2)}%)`, formatCurrency(result.tributosSobreFinal)],
      [
        `Margem desejada (${formatNumber(budget.pricing.marginPercent, 2)}%)`,
        `${formatNumber(budget.pricing.marginPercent, 2)}%`,
      ],
      ["Preço sugerido", formatCurrency(result.precoSugerido)],
      [`Desconto (${formatNumber(budget.pricing.discountPercent, 2)}%)`, formatCurrency(result.descontoValor)],
      ["Preço final", formatCurrency(result.precoFinal)],
      ["Saldo sobre base de referência", formatCurrency(result.saldoSobreBase)],
      ["Margem sobre base de referência", `${formatNumber(result.margemSobreBase, 2)}%`],
    ],
    [120, 60],
    ["left", "right"],
  );

  layout.paragraph(
    "A base técnica usa a taxa de venda por hora, não o custo interno real. O saldo e a margem acima são indicadores de markup sobre a base de referência, não lucro contábil.",
    8.5,
    MUTED,
  );

  return layout.finish(settings.defaults.footer || settings.company.name || "OrçaEng");
}

export function exportInternalPdf(budget: Budget, settings: BudgetSettings): void {
  savePdfBytes(buildInternalPdf(budget, settings), `Memoria_${sanitizeFileName(budget.number)}.pdf`);
}

export function buildWhatsAppSummary(budget: Budget, settings: BudgetSettings): string {
  const result = calculatePricing(budget);
  const lines = [
    `*${settings.company.name || "OrçaEng"}* — Proposta ${budget.number}`,
    `Cliente: ${budget.customer.name || "—"}`,
    `Projeto: ${budget.projectName || "—"}${budget.projectCode ? ` (${budget.projectCode})` : ""}`,
    budget.scope ? `Escopo: ${budget.scope.slice(0, 240)}${budget.scope.length > 240 ? "…" : ""}` : "",
    `Horas previstas: ${formatHours(result.hours.total)}`,
    `Valor final: ${formatCurrency(result.precoFinal)}`,
    `Prazo: ${budget.terms.deliveryTerm || "a definir"}`,
    `Validade: ${formatNumber(budget.terms.validityDays)} dias`,
  ].filter(Boolean);
  return lines.join("\n");
}
