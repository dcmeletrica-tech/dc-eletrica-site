"use strict";

const { test, expect } = require("@playwright/test");

const SIMULATOR_URL = "https://azume.com.br/simulador/61f9b8ab53cc900016438c9e";

test.describe("Simulador solar", () => {
  test("página do simulador carrega com título e iframe", async ({ page }) => {
    await page.goto("/simulador.html");

    await expect(page).toHaveTitle(/Simulador/);
    await expect(page.locator("h1")).toHaveText("Simulador de energia solar");

    const iframe = page.locator("iframe#solar-simulator");
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute("src", SIMULATOR_URL);
  });

  test("link do menu vai para a página do simulador", async ({ page }) => {
    await page.goto("/");

    await page.locator(".site-nav").getByRole("link", { name: "Simulador solar" }).click();
    await expect(page).toHaveURL(/simulador\.html/);
    await expect(page.locator("h1")).toHaveText("Simulador de energia solar");
  });

  test("botão do hero vai para a página do simulador", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Simular energia solar" }).click();
    await expect(page).toHaveURL(/simulador\.html/);
  });

  test("link 'Simule agora' no card de energia solar vai para o simulador", async ({ page }) => {
    await page.goto("/");

    await page.locator(".card-solar .link-solar").click();
    await expect(page).toHaveURL(/simulador\.html/);
  });
});
