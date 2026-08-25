"use strict";

const { test, expect } = require("@playwright/test");

test.describe("Formulário de contato", () => {
  test("envia mensagem com dados válidos", async ({ page }) => {
    await page.goto("/#contato");

    await page.locator("#name").fill("Maria Silva");
    await page.locator("#email").fill("maria@exemplo.com");
    await page.locator("#message").fill("Gostaria de uma proposta de energia solar.");

    await page.getByRole("button", { name: "Enviar mensagem" }).click();

    await expect(page.locator("#form-success")).toBeVisible();
    await expect(page.locator("#form-success")).toHaveText(/Mensagem enviada/);
  });

  test("mostra erro ao enviar formulário vazio", async ({ page }) => {
    await page.goto("/#contato");

    await page.getByRole("button", { name: "Enviar mensagem" }).click();

    await expect(page.locator("#form-error")).toBeVisible();
    await expect(page.locator("#form-error")).toHaveText(/obrigatórios/);
  });

  test("rejeita e-mail inválido", async ({ page }) => {
    await page.goto("/#contato");

    await page.locator("#name").fill("João");
    await page.locator("#email").fill("email-invalido");
    await page.locator("#message").fill("Olá");

    await page.getByRole("button", { name: "Enviar mensagem" }).click();

    await expect(page.locator("#form-error")).toBeVisible();
    await expect(page.locator("#email")).toHaveClass(/invalid/);
  });
});
