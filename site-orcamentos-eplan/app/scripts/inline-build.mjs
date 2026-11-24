import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const html = readFileSync(join(dist, "index.html"), "utf8");
const assetsDir = join(dist, "assets");
const assets = readdirSync(assetsDir);

const jsFile = assets.find((file) => file.endsWith(".js"));
const cssFile = assets.find((file) => file.endsWith(".css"));

if (!jsFile) {
  console.error("Nenhum bundle JS encontrado em dist/assets");
  process.exit(1);
}

const js = readFileSync(join(assetsDir, jsFile), "utf8").replace(/<\/script/gi, "<\\/script");
const css = cssFile ? readFileSync(join(assetsDir, cssFile), "utf8") : "";

let output = html
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/gi, "")
  .replace(/<link[^>]*rel="stylesheet"[^>]*>/gi, "");

output = output.replace("</head>", () => `<style>${css}</style>\n</head>`);
output = output.replace("</body>", () => `<script type="module">${js}</script>\n</body>`);

mkdirSync(join(dist, "single"), { recursive: true });
writeFileSync(join(dist, "single", "index.html"), output, "utf8");

const published = join(process.cwd(), "..", "index.html");
writeFileSync(published, output, "utf8");

const kb = (Buffer.byteLength(output, "utf8") / 1024).toFixed(1);
console.log(`dist/single/index.html e ../index.html gerados (${kb} KB)`);
