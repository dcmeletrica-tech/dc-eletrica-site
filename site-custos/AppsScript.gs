// ============================================================
//  Custos DC Elétrica — Apps Script
//  Este script fica DENTRO da planilha do Google e faz a ponte
//  entre o site e a planilha (grava novos lançamentos).
//  Publicar como Web App (Executar como: Eu; Acesso: Qualquer pessoa).
// ============================================================

// Grava um novo lançamento na aba Custos (chamado pelo site)
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var idProjeto = data.idProjeto;
    var tipo = data.tipo;          // "Entrada" ou "Saída"
    var descricao = data.descricao;
    var valor = Number(data.valor);
    var dataLanc = data.data;      // "yyyy-mm-dd" ou vazio

    if (!idProjeto || !tipo || !descricao || isNaN(valor) || valor <= 0) {
      return json({ ok: false, error: "Dados inválidos." });
    }

    var sheet = getCustosSheet();
    var lastRow = sheet.getLastRow();
    var newRow = lastRow + 1;

    var idCusto = generateId();
    var dataValue = dataLanc ? new Date(dataLanc) : new Date();

    sheet.getRange(newRow, 1).setValue(idCusto);
    sheet.getRange(newRow, 2).setValue(idProjeto);
    sheet.getRange(newRow, 3).setValue(tipo);
    sheet.getRange(newRow, 4).setValue(descricao);
    sheet.getRange(newRow, 5).setValue(valor);
    sheet.getRange(newRow, 6).setValue(dataValue);
    sheet.getRange(newRow, 7).setValue("");

    return json({ ok: true, id: idCusto });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Localiza a aba de custos (a que tem cabeçalho ID_Custo)
function getCustosSheet() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var header = sheets[i].getRange(1, 1).getValue();
    if (header === "ID_Custo") {
      return sheets[i];
    }
  }
  // Fallback: última aba
  return sheets[sheets.length - 1];
}

// Gera um ID curto único (hex)
function generateId() {
  var chars = "abcdef0123456789";
  var id = "";
  for (var i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
