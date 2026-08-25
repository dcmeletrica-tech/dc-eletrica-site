"use strict";

const { test, expect } = require("@playwright/test");

test.describe("Menu mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("hambúrguer abre e fecha o menu", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("#nav-toggle");
    const nav = page.locator("#site-nav");

    await expect(toggle).toBeVisible();
    await expect(nav).not.toHaveClass(/open/);

    await toggle.click();
    await expect(nav).toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await toggle.click();
    await expect(nav).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("clicar em um link fecha o menu", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("#nav-toggle");
    const nav = page.locator("#site-nav");

    await toggle.click();
    await expect(nav).toHaveClass(/open/);

    await nav.getByRole("link", { name: "Simulador" }).click();
    await expect(nav).not.toHaveClass(/open/);
  });
});
