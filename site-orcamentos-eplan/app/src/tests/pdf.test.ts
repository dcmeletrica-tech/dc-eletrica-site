import { describe, expect, it } from "vitest";
import { PdfBuilder, dataUrlToBytes, jpegSize } from "../lib/pdf";

function decode(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

function fakeJpeg(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9,
  ]);
}

describe("jpegSize", () => {
  it("lê largura e altura do marcador SOF", () => {
    expect(jpegSize(fakeJpeg(1280, 640))).toEqual({ width: 1280, height: 640 });
  });

  it("rejeita dados que não são JPEG", () => {
    expect(jpegSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });
});

describe("dataUrlToBytes", () => {
  it("decodifica base64 de JPEG", () => {
    const bytes = dataUrlToBytes("data:image/jpeg;base64,/9j/4AAQ");
    expect(bytes).not.toBeNull();
    expect(Array.from(bytes ?? [])).toEqual([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  });

  it("recusa formatos não suportados", () => {
    expect(dataUrlToBytes("data:image/png;base64,AAAA")).toBeNull();
    expect(dataUrlToBytes("nao-e-data-url")).toBeNull();
  });
});

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

  it("embeda imagem JPEG como XObject DCTDecode", () => {
    const pdf = new PdfBuilder();
    pdf.image(fakeJpeg(1280, 640), 15, 10, 18, 9);
    const text = decode(pdf.build());

    expect(text).toContain("/Subtype /Image");
    expect(text).toContain("/Filter /DCTDecode");
    expect(text).toContain("/Width 1280 /Height 640");
    expect(text).toContain("/XObject << /Im0");
    expect(text).toContain("/Im0 Do");
    expect(text).toContain("/ColorSpace /DeviceRGB");
  });

  it("não referencia imagem em páginas que não a usam", () => {
    const pdf = new PdfBuilder();
    pdf.image(fakeJpeg(10, 10), 15, 10, 5, 5);
    pdf.addPage();
    pdf.text("sem imagem", 15, 20);
    const text = decode(pdf.build());
    const pages = text.match(/\/Type \/Page[^s][\s\S]*?\/Contents \d+ 0 R >>/g) ?? [];
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain("/XObject");
    expect(pages[1]).not.toContain("/XObject");
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
