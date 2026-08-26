"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// Roteamento dos sites
const SITES = {
  "/": { dir: "site-eletrica" },
  "/cruzeiro": { dir: "site-cruzeiro" },
  "/busca-empresas": { dir: "site-busca-empresas" },
};

function resolveSite(urlPath) {
  if (urlPath === "/cruzeiro" || urlPath.startsWith("/cruzeiro/")) {
    const rel = urlPath.slice("/cruzeiro".length) || "/";
    return { dir: path.join(__dirname, "site-cruzeiro"), rel };
  }
  if (urlPath === "/busca-empresas" || urlPath.startsWith("/busca-empresas/")) {
    const rel = urlPath.slice("/busca-empresas".length) || "/";
    return { dir: path.join(__dirname, "site-busca-empresas"), rel };
  }
  return { dir: path.join(__dirname, "site-eletrica"), rel: urlPath };
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const { dir, rel } = resolveSite(urlPath);
  let filePath = path.join(dir, rel === "/" ? "index.html" : rel);

  if (!filePath.startsWith(dir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`DC Elétrica site rodando em http://localhost:${PORT}`);
});
