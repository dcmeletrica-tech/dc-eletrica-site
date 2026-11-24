import { describe, expect, it } from "vitest";
import { PdfBuilder } from "../lib/pdf";

function decode(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

describe("PdfBuilder", () => {
  it("gera um PDF com cabeçalho, rodapé e xref consistente", () => {
    const pdf = new PdfBuilder();
    pdf.text("Orçamento — Ação", 15, 20, { size: 10 });
    pdf.addPage();
    pdf.text("Segunda página", 15, 20, { size: 10 });
    const text = decode(pdf.build());

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Count 2");
    expect(text.match(/\/Type \/Page[^s]/g)).toHaveLength(2);

    const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");

    const size = Number(/\/Size (\d+)/.exec(text)?.[1]);
    const entries = text.slice(startxref).split("\n").slice(2, 2 + size);
    expect(entries).toHaveLength(size);
    entries.forEach((entry, index) => {
      if (index === 0) return;
      const offset = Number(entry.slice(0, 10));
      expect(text.slice(offset, offset + `${index} 0 obj`.length)).toBe(`${index} 0 obj`);
    });
  });

  it("codifica acentos em WinAnsi", () => {
    const pdf = new PdfBuilder();
    pdf.text("Ação ç ã", 15, 20);
    const text = decode(pdf.build());
    expect(text).toContain("\\347");
    expect(text).toContain("\\343");
  });

  it("quebra texto respeitando a largura", () => {
    const pdf = new PdfBuilder();
    const lines = pdf.wrap("palavra ".repeat(40), 60, 10);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(pdf.textWidth(line, 10)).toBeLessThanOrEqual(60.5);
    }
  });

  it("alinhamento à direita termina na coordenada informada", () => {
    const pdf = new PdfBuilder();
    const width = pdf.textWidth("Total", 10, true);
    expect(width).toBeGreaterThan(0);
    pdf.text("Total", 100, 20, { size: 10, bold: true, align: "right" });
    const text = decode(pdf.build());
    const match = /1 0 0 1 ([\d.]+) ([\d.]+) Tm/.exec(text);
    expect(match).not.toBeNull();
    const x = Number(match?.[1]);
    expect(x).toBeCloseTo((100 - width) * (72 / 25.4), 1);
  });
});
