import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./app/App";
import { BRAND_SIMBOLO } from "./assets/brand";
import "./index.css";

function applyFavicon() {
  for (const rel of ["icon", "apple-touch-icon"]) {
    const link = document.createElement("link");
    link.rel = rel;
    link.type = "image/jpeg";
    link.href = BRAND_SIMBOLO;
    document.head.appendChild(link);
  }
}

applyFavicon();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
