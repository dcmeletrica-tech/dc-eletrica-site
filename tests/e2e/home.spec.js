"use strict";

const { test, expect } = require("@playwright/test");

test.describe("Página inicial", () => {
  test("carrega com título, marca e tagline corretos", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/DC Elétrica/);

    const brandLogo = page.locator(".brand-logo");
    await expect(brandLogo).toBeVisible();
    await expect(brandLogo).toHaveAttribute("alt", "DC Elétrica");

    await expect(page.locator("h1")).toHaveText("Energia que conecta projetos.");
  });

  test("exibe as seções principais", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#servicos h2")).toHaveText("Serviços");
    await expect(page.locator("#sobre h2")).toHaveText("Sobre a DC Elétrica");
    await expect(page.locator("#contato h2")).toHaveText("Fale conosco");
  });

  test("lista os três serviços", async ({ page }) => {
    await page.goto("/");

    const cards = page.locator("#servicos .card");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0).locator("h3")).toHaveText("Energia solar");
    await expect(cards.nth(1).locator("h3")).toHaveText("Projetos elétricos industriais");
    await expect(cards.nth(2).locator("h3")).toHaveText("Consultoria técnica");
  });
});
