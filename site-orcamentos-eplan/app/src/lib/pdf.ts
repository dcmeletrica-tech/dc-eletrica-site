const MM_TO_PT = 72 / 25.4;
const PAGE_W = 210 * MM_TO_PT;
const PAGE_H = 297 * MM_TO_PT;

export type Rgb = [number, number, number];

export interface TextOptions {
  size?: number;
  bold?: boolean;
  color?: Rgb;
  align?: "left" | "right" | "center";
}

const WIDTHS_REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const WIDTHS_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611,
  611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

const WIN_ANSI_EXTRA: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

function toWinAnsi(input: string): string {
  let output = "";
  for (const char of input) {
    const code = char.codePointAt(0) ?? 32;
    if (code < 256) {
      output += String.fromCharCode(code);
    } else if (WIN_ANSI_EXTRA[char] !== undefined) {
      output += String.fromCharCode(WIN_ANSI_EXTRA[char]);
    } else {
      const base = char.normalize("NFD")[0];
      const baseCode = base.codePointAt(0) ?? 63;
      output += String.fromCharCode(baseCode < 256 ? baseCode : 63);
    }
  }
  return output;
}

function charWidth(char: string, bold: boolean): number {
  const table = bold ? WIDTHS_BOLD : WIDTHS_REGULAR;
  const code = char.charCodeAt(0);
  if (code >= 32 && code <= 126) return table[code - 32];
  const base = char.normalize("NFD")[0].charCodeAt(0);
  if (base >= 32 && base <= 126) return table[base - 32];
  return 500;
}

function escapePdfString(value: string): string {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x28 || code === 0x29 || code === 0x5c) {
      output += `\\${value[index]}`;
    } else if (code < 32 || code > 126) {
      output += `\\${code.toString(8).padStart(3, "0")}`;
    } else {
      output += value[index];
    }
  }
  return output;
}

function rgb(color: Rgb): string {
  return color.map((channel) => (channel / 255).toFixed(3)).join(" ");
}

export class PdfBuilder {
  private pages: string[][] = [[]];
  private current = this.pages[0];

  textWidth(text: string, size: number, bold = false): number {
    const units = toWinAnsi(text)
      .split("")
      .reduce((total, char) => total + charWidth(char, bold), 0);
    return (units / 1000) * size / MM_TO_PT;
  }

  wrap(text: string, maxWidth: number, size: number, bold = false): string[] {
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (this.textWidth(candidate, size, bold) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  addPage(): void {
    this.pages.push([]);
    this.current = this.pages[this.pages.length - 1];
  }

  setPage(index: number): void {
    if (index >= 0 && index < this.pages.length) {
      this.current = this.pages[index];
    }
  }

  get pageCount(): number {
    return this.pages.length;
  }

  text(text: string, x: number, y: number, options: TextOptions = {}): void {
    const size = options.size ?? 10;
    const bold = options.bold ?? false;
    const color = options.color ?? [30, 41, 59];
    const width = this.textWidth(text, size, bold);
    let drawX = x;
    if (options.align === "right") drawX = x - width;
    if (options.align === "center") drawX = x - width / 2;
    const px = drawX * MM_TO_PT;
    const py = PAGE_H - y * MM_TO_PT;
    this.current.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${rgb(color)} rg 1 0 0 1 ${px.toFixed(2)} ${py.toFixed(2)} Tm (${escapePdfString(
        toWinAnsi(text),
      )}) Tj ET`,
    );
  }

  paragraph(text: string, x: number, y: number, maxWidth: number, options: TextOptions = {}): number {
    const size = options.size ?? 9.5;
    const bold = options.bold ?? false;
    const lineHeight = size * 0.45;
    const lines = this.wrap(text, maxWidth, size, bold);
    lines.forEach((line, index) => this.text(line, x, y + index * lineHeight, options));
    return y + lines.length * lineHeight;
  }

  rect(x: number, y: number, width: number, height: number, color: Rgb): void {
    const px = x * MM_TO_PT;
    const py = PAGE_H - (y + height) * MM_TO_PT;
    this.current.push(
      `${rgb(color)} rg ${px.toFixed(2)} ${py.toFixed(2)} ${(width * MM_TO_PT).toFixed(2)} ${(height * MM_TO_PT).toFixed(2)} re f`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = [226, 232, 240], width = 0.2): void {
    this.current.push(
      `${rgb(color)} RG ${width} w ${(x1 * MM_TO_PT).toFixed(2)} ${(PAGE_H - y1 * MM_TO_PT).toFixed(2)} m ${(
        x2 * MM_TO_PT
      ).toFixed(2)} ${(PAGE_H - y2 * MM_TO_PT).toFixed(2)} l S`,
    );
  }

  build(): Uint8Array {
    const objects: string[] = [];
    const pageObjectNumbers: number[] = [];
    const firstPageObject = 5;

    this.pages.forEach((_ops, index) => {
      pageObjectNumbers.push(firstPageObject + index * 2);
    });

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${
      this.pages.length
    } >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

    this.pages.forEach((ops, index) => {
      const pageNumber = pageObjectNumbers[index];
      const contentNumber = pageNumber + 1;
      objects[pageNumber] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>`;
      const stream = ops.join("\n");
      objects[contentNumber] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    let file = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (let number = 1; number < objects.length; number += 1) {
      const body = objects[number];
      if (!body) continue;
      offsets[number] = file.length;
      file += `${number} 0 obj\n${body}\nendobj\n`;
    }

    const xrefOffset = file.length;
    const total = objects.length;
    file += `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let number = 1; number < total; number += 1) {
      file += `${String(offsets[number] ?? 0).padStart(10, "0")} 00000 n \n`;
    }
    file += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const bytes = new Uint8Array(file.length);
    for (let index = 0; index < file.length; index += 1) {
      bytes[index] = file.charCodeAt(index) & 0xff;
    }
    return bytes;
  }

  save(fileName: string): void {
    savePdfBytes(this.build(), fileName);
  }
}

export function savePdfBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}
