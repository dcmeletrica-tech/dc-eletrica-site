"use strict";

const { test, expect } = require("@playwright/test");

test.describe("Navegação", () => {
  test("links do menu levam às seções correspondentes", async ({ page }) => {
    await page.goto("/");

    const nav = page.locator(".site-nav");
    await nav.getByRole("link", { name: "Serviços" }).click();
    await expect(page.locator("#servicos")).toBeInViewport();

    await nav.getByRole("link", { name: "Sobre" }).click();
    await expect(page.locator("#sobre")).toBeInViewport();

    await nav.getByRole("link", { name: "Contato" }).click();
    await expect(page.locator("#contato")).toBeInViewport();
  });

  test("botão do hero leva ao formulário de contato", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Solicitar proposta" }).click();
    await expect(page.locator("#contato")).toBeInViewport();
  });
});
