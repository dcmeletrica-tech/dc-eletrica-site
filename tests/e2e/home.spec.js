"use strict";

const { test, expect } = require("@playwright/test");

test.describe("Página inicial (lead page)", () => {
  test("carrega com título, marca e chamada principal", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/economia de energia solar/);

    const brandLogo = page.locator(".brand-logo");
    await expect(brandLogo).toBeVisible();
    await expect(brandLogo).toHaveAttribute("alt", "DC Elétrica");

    await expect(page.locator("h1")).toContainText("economizar");
  });

  test("exibe as seções principais", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#como-funciona h2")).toHaveText("Como funciona");
    await expect(page.locator("#simulador h2")).toHaveText("Simule agora");
    await expect(page.locator("#beneficios h2")).toHaveText("Por que investir em energia solar?");
    await expect(page.locator("#para-quem h2")).toHaveText("Para quem é a energia solar?");
    await expect(page.locator("#depoimentos h2")).toHaveText("Quem já economiza com a DC Elétrica");
    await expect(page.locator("#captura h2")).toHaveText("Receba sua proposta no WhatsApp");
    await expect(page.locator("#faq h2")).toHaveText("Perguntas frequentes");
  });
});
