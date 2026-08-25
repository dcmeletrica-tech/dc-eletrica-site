"use strict";

const { test, expect } = require("@playwright/test");

const WHATSAPP_NUMBER = "5519998093790";

test.describe("Lead page", () => {
  test("carrega com título, simulador e benefícios", async ({ page }) => {
    await page.goto("/lead.html");

    await expect(page).toHaveTitle(/economia de energia solar/);
    await expect(page.locator("h1")).toContainText("economizar");
    await expect(page.locator(".lead-benefits li")).toHaveCount(4);

    const iframe = page.locator("iframe#solar-simulator");
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute("src", /azume\.com\.br\/simulador/);
  });

  test("exibe as seções de conteúdo", async ({ page }) => {
    await page.goto("/lead.html");

    await expect(page.locator(".stats-grid .stat")).toHaveCount(4);
    await expect(page.locator("#como-funciona h2")).toHaveText("Como funciona");
    await expect(page.locator(".steps .step")).toHaveCount(4);
    await expect(page.locator("#beneficios h2")).toHaveText("Por que investir em energia solar?");
    await expect(page.locator(".benefit-grid .benefit")).toHaveCount(6);
    await expect(page.locator("#para-quem h2")).toHaveText("Para quem é a energia solar?");
    await expect(page.locator(".audience-grid .audience")).toHaveCount(4);
    await expect(page.locator(".audience").first().locator("h3")).toHaveText("Residencial");
    await expect(page.locator("#depoimentos h2")).toHaveText("Quem já economiza com a DC Elétrica");
    await expect(page.locator(".testimonial-grid .testimonial")).toHaveCount(3);
    await expect(page.locator("#faq h2")).toHaveText("Perguntas frequentes");
    await expect(page.locator(".faq-item")).toHaveCount(5);
  });

  test("FAQ abre e mostra a resposta", async ({ page }) => {
    await page.goto("/lead.html");

    const first = page.locator(".faq-item").first();
    await first.locator("summary").click();
    await expect(first.locator("p")).toBeVisible();
  });

  test("envia lead e abre o WhatsApp com a mensagem preenchida", async ({ page }) => {
    await page.goto("/lead.html");

    await page.locator("#lead-name").fill("Maria Silva");
    await page.locator("#lead-phone").fill("(19) 99999-0000");
    await page.locator("#lead-message").fill("Quero proposta para minha empresa");

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Enviar pelo WhatsApp" }).click();
    const popup = await popupPromise;

    const url = popup.url();
    expect(url).toMatch(/wa\.me\/|api\.whatsapp\.com\/send/);
    expect(url).toContain(WHATSAPP_NUMBER);

    const text = new URL(url).searchParams.get("text") || "";
    expect(text).toContain("Maria Silva");
    expect(text).toContain("(19) 99999-0000");
    expect(text).toContain("Quero proposta para minha empresa");

    await expect(page.locator("#lead-success")).toBeVisible();
  });

  test("mostra erro ao enviar formulário vazio", async ({ page }) => {
    await page.goto("/lead.html");

    await page.getByRole("button", { name: "Enviar pelo WhatsApp" }).click();

    await expect(page.locator("#lead-error")).toBeVisible();
    await expect(page.locator("#lead-error")).toHaveText(/nome e um WhatsApp/);
  });

  test("rejeita WhatsApp inválido", async ({ page }) => {
    await page.goto("/lead.html");

    await page.locator("#lead-name").fill("João");
    await page.locator("#lead-phone").fill("123");

    await page.getByRole("button", { name: "Enviar pelo WhatsApp" }).click();

    await expect(page.locator("#lead-error")).toBeVisible();
    await expect(page.locator("#lead-phone")).toHaveClass(/invalid/);
  });
});

test.describe("Botão flutuante de WhatsApp", () => {
  test("está presente na home e aponta para o número correto", async ({ page }) => {
    await page.goto("/");

    const float = page.locator(".whatsapp-float");
    await expect(float).toBeVisible();
    await expect(float).toHaveAttribute("href", new RegExp("wa\\.me/" + WHATSAPP_NUMBER));
  });

  test("está presente na lead page", async ({ page }) => {
    await page.goto("/lead.html");

    await expect(page.locator(".whatsapp-float")).toBeVisible();
  });
});
