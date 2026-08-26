// ============================================================
//  Custos DC Elétrica — Apps Script
//  Este script fica DENTRO da planilha do Google e faz a ponte
//  entre o site e a planilha (grava, edita e exclui dados).
//  Publicar como Web App (Executar como: Eu; Acesso: Qualquer pessoa).
// ============================================================

// Roteador principal (chamado pelo site)
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    if (action === "addCusto") return addCusto(data);
    if (action === "updateCusto") return updateCusto(data);
    if (action === "deleteCusto") return deleteCusto(data);
    if (action === "addProjeto") return addProjeto(data);
    if (action === "updateProjeto") return updateProjeto(data);
    if (action === "deleteProjeto") return deleteProjeto(data);
    if (action === "addParticipante") return addParticipante(data);
    if (action === "updateParticipante") return updateParticipante(data);
    if (action === "deleteParticipante") return deleteParticipante(data);
    return json({ ok: false, error: "Ação desconhecida." });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// ============ CUSTOS ============

// Novo lançamento
function addCusto(data) {
  var idProjeto = data.idProjeto;
  var tipo = data.tipo;
  var descricao = data.descricao;
  var valor = Number(data.valor);
  var dataLanc = data.data;

  if (!idProjeto || !tipo || !descricao || isNaN(valor) || valor <= 0) {
    return json({ ok: false, error: "Dados inválidos." });
  }

  var sheet = getSheetByHeader("ID_Custo");
  var newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1).setValue(generateId());
  sheet.getRange(newRow, 2).setValue(idProjeto);
  sheet.getRange(newRow, 3).setValue(tipo);
  sheet.getRange(newRow, 4).setValue(descricao);
  sheet.getRange(newRow, 5).setValue(valor);
  sheet.getRange(newRow, 6).setValue(dataLanc ? new Date(dataLanc) : new Date());
  sheet.getRange(newRow, 7).setValue("");
  return json({ ok: true });
}

// Edita um lançamento existente (pelo ID_Custo)
function updateCusto(data) {
  var idCusto = data.idCusto;
  var sheet = getSheetByHeader("ID_Custo");
  var row = findRowById(sheet, idCusto);
  if (!row) return json({ ok: false, error: "Lançamento não encontrado." });

  var tipo = data.tipo;
  var descricao = data.descricao;
  var valor = Number(data.valor);
  var dataLanc = data.data;
  if (!tipo || !descricao || isNaN(valor) || valor <= 0) {
    return json({ ok: false, error: "Dados inválidos." });
  }

  sheet.getRange(row, 3).setValue(tipo);
  sheet.getRange(row, 4).setValue(descricao);
  sheet.getRange(row, 5).setValue(valor);
  sheet.getRange(row, 6).setValue(dataLanc ? new Date(dataLanc) : new Date());
  return json({ ok: true });
}

// Exclui um lançamento (pelo ID_Custo)
function deleteCusto(data) {
  var idCusto = data.idCusto;
  var sheet = getSheetByHeader("ID_Custo");
  var row = findRowById(sheet, idCusto);
  if (!row) return json({ ok: false, error: "Lançamento não encontrado." });
  sheet.deleteRow(row);
  return json({ ok: true });
}

// ============ PROJETOS ============

// Novo projeto
function addProjeto(data) {
  var nome = data.nome;
  var dataInicio = data.dataInicio;
  var descricao = data.descricao;
  if (!nome) return json({ ok: false, error: "Informe o nome do projeto." });

  var sheet = getSheetByHeader("ID_Projeto");
  var newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1).setValue(generateId());
  sheet.getRange(newRow, 2).setValue(nome);
  sheet.getRange(newRow, 3).setValue(dataInicio ? new Date(dataInicio) : new Date());
  sheet.getRange(newRow, 4).setValue(descricao || "");
  return json({ ok: true });
}

// Edita um projeto (pelo ID_Projeto)
function updateProjeto(data) {
  var idProjeto = data.idProjeto;
  var nome = data.nome;
  var dataInicio = data.dataInicio;
  var descricao = data.descricao;
  if (!idProjeto || !nome) return json({ ok: false, error: "Dados inválidos." });

  var sheet = getSheetByHeader("ID_Projeto");
  var row = findRowById(sheet, idProjeto);
  if (!row) return json({ ok: false, error: "Projeto não encontrado." });

  sheet.getRange(row, 2).setValue(nome);
  sheet.getRange(row, 3).setValue(dataInicio ? new Date(dataInicio) : new Date());
  sheet.getRange(row, 4).setValue(descricao || "");
  return json({ ok: true });
}

// Exclui um projeto e seus lançamentos/participantes vinculados
function deleteProjeto(data) {
  var idProjeto = data.idProjeto;
  var sheet = getSheetByHeader("ID_Projeto");
  var row = findRowById(sheet, idProjeto);
  if (!row) return json({ ok: false, error: "Projeto não encontrado." });
  sheet.deleteRow(row);

  deleteRowsByColumn(getSheetByHeader("ID_Custo"), "ID_Projeto", idProjeto);
  deleteRowsByColumn(getSheetByHeader("ID_Participante"), "ID_Projeto", idProjeto);
  return json({ ok: true });
}

// ============ PARTICIPANTES ============

// Novo participante de um projeto
function addParticipante(data) {
  var idProjeto = data.idProjeto;
  var nome = data.nome;
  var pct = Number(data.porcentagem);
  if (!idProjeto || !nome || isNaN(pct) || pct <= 0) {
    return json({ ok: false, error: "Dados inválidos." });
  }

  var sheet = getSheetByHeader("ID_Participante");
  var newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1).setValue(generateId());
  sheet.getRange(newRow, 2).setValue(idProjeto);
  sheet.getRange(newRow, 3).setValue(nome);
  sheet.getRange(newRow, 4).setValue(pct);
  return json({ ok: true });
}

// Edita um participante (pelo ID_Participante)
function updateParticipante(data) {
  var idParticipante = data.idParticipante;
  var nome = data.nome;
  var pct = Number(data.porcentagem);
  if (!idParticipante || !nome || isNaN(pct) || pct <= 0) {
    return json({ ok: false, error: "Dados inválidos." });
  }

  var sheet = getSheetByHeader("ID_Participante");
  var row = findRowById(sheet, idParticipante);
  if (!row) return json({ ok: false, error: "Participante não encontrado." });

  sheet.getRange(row, 3).setValue(nome);
  sheet.getRange(row, 4).setValue(pct);
  return json({ ok: true });
}

// Exclui um participante (pelo ID_Participante)
function deleteParticipante(data) {
  var idParticipante = data.idParticipante;
  var sheet = getSheetByHeader("ID_Participante");
  var row = findRowById(sheet, idParticipante);
  if (!row) return json({ ok: false, error: "Participante não encontrado." });
  sheet.deleteRow(row);
  return json({ ok: true });
}

// ============ UTILITÁRIOS ============

// Exclui todas as linhas de uma aba onde a coluna informada tem o valor
function deleteRowsByColumn(sheet, columnHeader, value) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIndex = headers.indexOf(columnHeader) + 1;
  if (colIndex === 0) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var values = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0]) === String(value)) {
      sheet.deleteRow(i + 2);
    }
  }
}

// Localiza a aba cujo cabeçalho da coluna A é o informado
function getSheetByHeader(header) {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getRange(1, 1).getValue() === header) {
      return sheets[i];
    }
  }
  return sheets[sheets.length - 1];
}

// Retorna o número da linha (a partir de 2) que tem o ID na coluna A
function findRowById(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return null;
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
