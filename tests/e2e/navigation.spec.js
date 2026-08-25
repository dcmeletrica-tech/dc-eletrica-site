"use strict";

const { test, expect } = require("@playwright/test");

test.describe("Navegação", () => {
  test("links do menu levam às seções correspondentes", async ({ page }) => {
    await page.goto("/");

    const nav = page.locator(".site-nav");
    await nav.getByRole("link", { name: "Benefícios" }).click();
    await expect(page.locator("#beneficios")).toBeInViewport();

    await nav.getByRole("link", { name: "Simulador" }).click();
    await expect(page.locator("#simulador")).toBeInViewport();

    await nav.getByRole("link", { name: "FAQ" }).click();
    await expect(page.locator("#faq")).toBeInViewport();

    await nav.getByRole("link", { name: "Contato" }).click();
    await expect(page.locator("#captura")).toBeInViewport();
  });
});
