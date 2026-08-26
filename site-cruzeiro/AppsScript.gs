// ============================================================
//  Controle de Pagamentos do Cruzeiro — Apps Script
//  Este script fica DENTRO da planilha do Google e faz a ponte
//  entre o site e a planilha (lê e grava os valores pagos).
//  Coluna C (Valor Pago) das linhas 2 a 13.
// ============================================================

// Lê os valores pagos da planilha (chamado pelo site ao abrir)
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var values = sheet.getRange(2, 3, 12, 1).getValues();
  var pagos = values.map(function (r) { return r[0]; });
  return ContentService
    .createTextOutput(JSON.stringify({ pagos: pagos }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Grava os valores pagos na planilha (chamado pelo site ao editar)
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var pagos = data.pagos;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var valores = pagos.map(function (v) { return [v]; });
  sheet.getRange(2, 3, 12, 1).setValues(valores);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
