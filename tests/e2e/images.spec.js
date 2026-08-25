"use strict";

const { test, expect } = require("@playwright/test");

const IMAGES = [
  { selector: ".brand-logo", alt: "DC Elétrica", file: "logo-horizontal.jpeg" },
  { selector: ".hero-logo", alt: /Símbolo DC Elétrica/, file: "logo-principal.jpeg" },
  { selector: ".sobre-logo", alt: "Logo monocromático DC Elétrica", file: "logo-monocromatico.jpeg" },
  { selector: ".footer-logo", alt: "", file: "logo-simbolo.jpeg" },
];

test.describe("Imagens da marca", () => {
  test("carrega e exibe as imagens principais", async ({ page }) => {
    await page.goto("/");

    for (const img of IMAGES) {
      const locator = page.locator(img.selector);
      await expect(locator).toBeVisible();

      const naturalWidth = await locator.evaluate((el) => el.naturalWidth);
      expect(naturalWidth, `${img.file} não carregou`).toBeGreaterThan(0);

      await expect(locator).toHaveAttribute("src", new RegExp(img.file.replace(".", "\\.")));
      if (img.alt === "") {
        await expect(locator).toHaveAttribute("alt", "");
      } else {
        await expect(locator).toHaveAttribute("alt", img.alt);
      }
    }
  });

  test("favicon aponta para o símbolo isolado", async ({ page }) => {
    await page.goto("/");

    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toHaveAttribute("href", /logo-simbolo\.jpeg/);
  });
});
