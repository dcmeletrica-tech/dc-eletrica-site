"use strict";

const { test, expect } = require("@playwright/test");

const SIMULATOR_URL = "https://azume.com.br/simulador/61f9b8ab53cc900016438c9e";

test.describe("Simulador solar", () => {
  test("home exibe o simulador embutido", async ({ page }) => {
    await page.goto("/");

    const iframe = page.locator("iframe#solar-simulator");
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute("src", SIMULATOR_URL);
  });

  test("página do simulador carrega com título e iframe", async ({ page }) => {
    await page.goto("/simulador.html");

    await expect(page).toHaveTitle(/Simulador/);
    await expect(page.locator("h1")).toHaveText("Simulador de energia solar");

    const iframe = page.locator("iframe#solar-simulator");
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute("src", SIMULATOR_URL);
  });
});
