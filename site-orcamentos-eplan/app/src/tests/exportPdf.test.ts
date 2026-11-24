import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Budget, BudgetSettings } from "../types/budget";

vi.mock("../assets/brand", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const file = path.join(process.cwd(), "src", "assets", "logo-simbolo.jpeg");
  const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}`;
  return { BRAND_SIMBOLO: dataUrl, BRAND_HORIZONTAL: dataUrl, BRAND_NAME: "DC Elétrica" };
});

const { buildInternalPdf, buildProposalPdf, buildWhatsAppSummary } = await import("../services/exportPdf");
const { createBudget, DEFAULT_SETTINGS } = await import("../lib/defaults");

function decode(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

function logoDataUrl(): string {
  const file = join(process.cwd(), "src", "assets", "logo-simbolo.jpeg");
  return `data:image/jpeg;base64,${readFileSync(file).toString("base64")}`;
}

function assertValidXref(text: string) {
  const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
  expect(text.slice(startxref, startxref + 4)).toBe("xref");
  const size = Number(/\/Size (\d+)/.exec(text)?.[1]);
  const entries = text.slice(startxref).split("\n").slice(2, 2 + size);
  entries.forEach((entry, index) => {
    if (index === 0) return;
    const offset = Number(entry.slice(0, 10));
    expect(text.slice(offset, offset + `${index} 0 obj`.length)).toBe(`${index} 0 obj`);
  });
}

function sampleBudget(): Budget {
  const budget = createBudget(DEFAULT_SETTINGS, []);
  budget.customer = { name: "Alphatek Automação", company: "Alphatek", contact: "Eng. Souza", phone: "", email: "" };
  budget.projectName = "Adequação de inversores";
  budget.projectCode = "PE946906 – REQ30965";
  budget.scope = "Adequação do projeto elétrico existente para dois inversores, com revisão de proteções e rede Profinet.";
  return budget;
}

describe("PDF da proposta", () => {
  it("gera um PDF válido com os dados do cliente e o preço final", () => {
    const text = decode(buildProposalPdf(sampleBudget(), DEFAULT_SETTINGS));
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("PROPOSTA COMERCIAL");
    expect(text).toContain("Alphatek Automa");
    expect(text).toContain("2.836,67");
    expect(text).toContain("CONDI");
    assertValidXref(text);
  });

  it("respeita as opções de ocultar horas e valores unitários", () => {
    const comHoras = decode(buildProposalPdf(sampleBudget(), DEFAULT_SETTINGS, { showHours: true, showUnitValues: true }));
    const semHoras = decode(
      buildProposalPdf(sampleBudget(), DEFAULT_SETTINGS, { showHours: false, showUnitValues: false }),
    );
    expect(comHoras).toContain("HORAS");
    expect(semHoras).not.toContain("Valor unit");
    expect(semHoras.length).toBeLessThan(comHoras.length);
  });

  it("gera a memória interna com a composição do preço", () => {
    const text = decode(buildInternalPdf(sampleBudget(), DEFAULT_SETTINGS));
    expect(text).toContain("MEM");
    expect(text).toContain("Composi");
    expect(text).toContain("2.836,67");
    assertValidXref(text);
  });
});

describe("resumo para WhatsApp", () => {
  it("inclui cliente, horas e valor final", () => {
    const summary = buildWhatsAppSummary(sampleBudget(), DEFAULT_SETTINGS);
    expect(summary).toContain("Alphatek Automação");
    expect(summary).toContain("Horas previstas");
    expect(summary).toContain("2.836,67");
  });
});

describe("logo no PDF", () => {
  const withLogo: BudgetSettings = { ...DEFAULT_SETTINGS, company: { ...DEFAULT_SETTINGS.company, logoDataUrl: logoDataUrl() } };

  it("embeda o logo da empresa no cabeçalho da proposta", () => {
    const text = decode(buildProposalPdf(sampleBudget(), withLogo));
    expect(text).toContain("/Subtype /Image");
    expect(text).toContain("/Filter /DCTDecode");
    expect(text).toContain("/Width 1280 /Height 1280");
    expect(text).toContain("/Im0 Do");
    assertValidXref(text);
  });

  it("embeda o logo também na memória interna", () => {
    const text = decode(buildInternalPdf(sampleBudget(), withLogo));
    expect(text).toContain("/Filter /DCTDecode");
    assertValidXref(text);
  });

  it("cai no logo embutido quando a empresa não tem logo configurado", () => {
    const semLogo: BudgetSettings = { ...DEFAULT_SETTINGS, company: { ...DEFAULT_SETTINGS.company, logoDataUrl: "" } };
    const text = decode(buildProposalPdf(sampleBudget(), semLogo));
    expect(text).toContain("/Filter /DCTDecode");
    assertValidXref(text);
  });
});
