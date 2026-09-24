"use strict";

const { test, expect } = require("@playwright/test");
const { PDFParse } = require("pdf-parse");

// Fixtures fictícias com dígitos verificadores válidos, sem documentos de clientes.
const PESSOA = {
  nome: "Pessoa Fictícia de Teste",
  cpf: "00000000191",
  endereco: "Rua de Testes, 100, Centro, Cidade Exemplo/SP, 00000-000",
};
const EMPRESA = {
  nome: "Empresa Fictícia de Teste Ltda",
  cnpj: "00000000000191",
};

async function preencherComuns(page) {
  await page.locator("#concessionaria").fill("DISTRIBUIDORA FICTÍCIA DE TESTE");
  await page.locator("#cidade").fill("Cidade Exemplo");
  await page.locator("#uf").selectOption("SP");
  await page.locator("#data-assinatura").fill("2026-09-23");
}

async function preencherPessoa(page) {
  await page.locator("#pf-nome").fill(PESSOA.nome);
  await page.locator("#pf-cpf").fill(PESSOA.cpf);
  await page.locator("#pf-endereco").fill(PESSOA.endereco);
  await preencherComuns(page);
}

async function preencherEmpresa(page) {
  await page.locator('input[name="tipoOutorgante"][value="cnpj"]').check();
  await page.locator("#pj-razao").fill(EMPRESA.nome);
  await page.locator("#pj-cnpj").fill(EMPRESA.cnpj);
  await page.locator("#pj-endereco").fill(PESSOA.endereco);
  await page.locator("#rep-nome").fill(PESSOA.nome);
  await page.locator("#rep-cpf").fill(PESSOA.cpf);
  await preencherComuns(page);
}

async function gerarPdf(page) {
  await page.locator("#gerar-pdf").click();
  await expect(page.locator("#resultado")).toBeVisible();
  const download = page.locator("#link-download");
  await expect(download).toHaveAttribute("href", /^blob:/);
  await expect(page.locator("#link-visualizar")).toHaveAttribute("href", await download.getAttribute("href"));
  const bytes = await download.evaluate(async (link) => {
    const response = await fetch(link.href);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
  const buffer = Buffer.from(bytes);
  expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  const parser = new PDFParse({ data: buffer });
  try {
    return await parser.getText();
  } finally {
    await parser.destroy();
  }
}

test.describe("Procurações", () => {
  test.beforeEach(async ({ page }) => {
    // Estes cenários exercitam o formulário com uma sessão já liberada.
    await page.addInitScript(() => sessionStorage.setItem("dc-procuracoes-acesso", "ok"));
  });

  test("normaliza a URL sem barra e preserva a consulta", async ({ request, page }) => {
    const response = await request.get("/procuracoes?origem=teste%20rota", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/procuracoes/?origem=teste%20rota");
    await page.goto("/procuracoes?origem=teste%20rota");
    await expect(page).toHaveURL(/\/procuracoes\/\?origem=teste%20rota$/);
    await expect(page.locator("#data-assinatura")).toHaveValue(await page.evaluate(() => {
      const hoje = new Date();
      return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    }));
    await expect(page.locator(".topbar-logo")).not.toHaveJSProperty("naturalWidth", 0);
  });

  test("campos vazios mostram resumo acessível com links para correção", async ({ page }) => {
    await page.goto("/procuracoes/");
    await page.locator("#gerar-pdf").click();
    const erro = page.locator("#form-erro");
    await expect(erro).toBeVisible();
    await expect(erro).toBeFocused();
    await expect(page.locator("#pf-nome")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#resultado")).toBeHidden();
    const primeiroLink = erro.locator('a[href^="#"]').first();
    const alvo = await primeiroLink.getAttribute("href");
    expect(alvo).toBeTruthy();
    await primeiroLink.click();
    await expect(page.locator(alvo)).toBeFocused();
  });

  test("CPF com dígitos inválidos impede gerar e permite corrigir", async ({ page }) => {
    await page.goto("/procuracoes/");
    await preencherPessoa(page);
    await page.locator("#pf-cpf").fill("11111111111");
    await page.locator("#gerar-pdf").click();
    await expect(page.locator("#form-erro")).toContainText(/CPF/);
    await expect(page.locator("#pf-cpf")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#resultado")).toBeHidden();
    await page.locator("#pf-cpf").fill(PESSOA.cpf);
    const pdf = await gerarPdf(page);
    expect(pdf.text).toContain(PESSOA.nome);
    await expect(page.locator("#form-erro")).toBeHidden();
    await expect(page.locator("#pf-cpf")).not.toHaveAttribute("aria-invalid", "true");
  });

  test("pessoa física gera PDF real com data escolhida e RG opcional", async ({ page }) => {
    await page.goto("/procuracoes/");
    await preencherPessoa(page);
    const pdf = await gerarPdf(page);
    expect(pdf.text).toContain("PROCURAÇÃO PARTICULAR");
    expect(pdf.text).toContain(PESSOA.nome);
    expect(pdf.text).toContain("000.000.001-91");
    expect(pdf.text).toContain("DISTRIBUIDORA FICTÍCIA DE TESTE");
    expect(pdf.text).toContain("23 de setembro de 2026");
    expect(pdf.text).toContain("RG nº não informado");
    await expect(page.locator("#link-download")).toHaveAttribute("download", /\.pdf$/i);
    await expect(page.locator("#resumo-nome")).toContainText(PESSOA.nome);
  });

  test("pessoa jurídica gera PDF com empresa e representante sem exigir PF oculta", async ({ page }) => {
    await page.goto("/procuracoes/");
    await preencherEmpresa(page);
    await expect(page.locator("#bloco-cpf")).toBeHidden();
    const pdf = await gerarPdf(page);
    expect(pdf.text).toContain(EMPRESA.nome);
    expect(pdf.text).toContain("00.000.000/0001-91");
    expect(pdf.text).toContain(PESSOA.nome);
    expect(pdf.text).toContain("RG nº não informado");
    expect(pdf.total).toBeGreaterThan(0);
  });

  test("CNPJ alfanumérico aceita letras, aplica máscara e gera o documento", async ({ page }) => {
    await page.goto("/procuracoes/");
    await preencherEmpresa(page);
    await page.locator("#pj-cnpj").fill("00000000e08g12");
    await expect(page.locator("#pj-cnpj")).toHaveValue("00.000.000/E08G-12");
    const pdf = await gerarPdf(page);
    expect(pdf.text).toContain("00.000.000/E08G-12");
  });

  test("dados extensos mantêm data e identificação junto da assinatura", async ({ page }) => {
    await page.goto("/procuracoes/");
    await preencherEmpresa(page);
    const valores = {};
    for (const [id, base, limite] of [
      ["pj-razao", "Empresa Fictícia de Teste ", 160],
      ["rep-nome", "Pessoa Fictícia de Teste ", 140],
      ["pj-endereco", "Rua Exemplo de Testes, Centro, Cidade Exemplo/SP ", 300],
      ["concessionaria", "Distribuidora Fictícia de Teste ", 120],
    ]) {
      const campo = page.locator(`#${id}`);
      const maximo = Number(await campo.getAttribute("maxlength")) || limite;
      valores[id] = base.repeat(Math.ceil(maximo / base.length)).slice(0, maximo).trim();
      await campo.fill(valores[id]);
    }
    const pdf = await gerarPdf(page);
    const assinatura = pdf.pages.at(-1).text.replace(/\s+/g, " ");
    expect(assinatura).toContain("23 de setembro de 2026");
    expect(assinatura).toContain("________________");
    expect(assinatura).toContain(valores["rep-nome"]);
    expect(assinatura).toContain(valores["pj-razao"]);
    expect(assinatura).toContain("00.000.000/0001-91");
  });

  test("editar dados invalida o PDF anterior e gerar novamente usa os dados atuais", async ({ page }) => {
    await page.goto("/procuracoes/");
    await preencherPessoa(page);
    await gerarPdf(page);
    const urlAntiga = await page.locator("#link-download").getAttribute("href");
    await page.locator("#cidade").fill("Outra Cidade Exemplo");
    await expect(page.locator("#resultado")).toBeHidden();
    await expect(page.locator("#link-download")).not.toHaveAttribute("href", /^blob:/);
    await expect(page.locator("#link-visualizar")).not.toHaveAttribute("href", /^blob:/);
    expect(await page.evaluate(async (url) => {
      try { await fetch(url); return false; } catch { return true; }
    }, urlAntiga)).toBe(true);
    const pdf = await gerarPdf(page);
    expect(pdf.text).toContain("Outra Cidade Exemplo - SP");
    expect(await page.locator("#link-download").getAttribute("href")).not.toBe(urlAntiga);
  });

  test("biblioteca PDF indisponível mostra erro e aceita uma nova tentativa", async ({ page }) => {
    await page.goto("/procuracoes/");
    await preencherPessoa(page);
    await page.evaluate(() => {
      window.bibliotecaPdfDoTeste = window.jspdf;
      window.jspdf = undefined;
    });
    await page.locator("#gerar-pdf").click();
    await expect(page.locator("#status-geracao")).toBeVisible();
    await expect(page.locator("#status-geracao")).toContainText(/Não foi possível.*PDF/i);
    await expect(page.locator("#resultado")).toBeHidden();
    await expect(page.locator("#gerar-pdf")).toBeEnabled();
    await page.evaluate(() => {
      window.jspdf = window.bibliotecaPdfDoTeste;
      delete window.bibliotecaPdfDoTeste;
    });
    expect((await gerarPdf(page)).text).toContain(PESSOA.nome);
  });

  for (const valor of ["{json inválido", '[null, 42, {}, "DISTRIBUIDORA FICTÍCIA DE TESTE"]']) {
    test(`preferências salvas inválidas não impedem gerar: ${valor[0]}`, async ({ page }) => {
      const erros = [];
      page.on("pageerror", (erro) => erros.push(erro.message));
      await page.addInitScript((salvo) => {
        localStorage.setItem("dc-procuracoes-concessionarias", salvo);
      }, valor);
      await page.goto("/procuracoes/");
      await preencherPessoa(page);
      expect((await gerarPdf(page)).text).toContain(PESSOA.nome);
      expect(erros).toEqual([]);
    });
  }

  for (const largura of [320, 375]) {
    test(`formulário e resultado cabem na tela de ${largura}px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 });
      await page.goto("/procuracoes/");
      await preencherEmpresa(page);
      await page.locator("#pj-razao").fill("Empresa Fictícia de Teste com Nome Extenso para Conferência de Layout Ltda");
      await gerarPdf(page);
      const medidas = await page.evaluate(() => ({
        viewport: window.innerWidth,
        documento: document.documentElement.scrollWidth,
        corpo: document.body.scrollWidth,
      }));
      expect(medidas.documento).toBeLessThanOrEqual(medidas.viewport);
      expect(medidas.corpo).toBeLessThanOrEqual(medidas.viewport);
      await expect(page.locator("#link-download")).toBeVisible();
    });
  }
});
