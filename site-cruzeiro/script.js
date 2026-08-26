(function () {
  "use strict";

  // Dados da planilha original
  var TOTAL = 13128;
  var NUM_PARCELAS = 12;
  var MESES = [
    "set/2026", "out/2026", "nov/2026", "dez/2026",
    "jan/2027", "fev/2027", "mar/2027", "abr/2027",
    "mai/2027", "jun/2027", "jul/2027", "ago/2027"
  ];

  var STORAGE_KEY = "controle_pagamentos_cruzeiro_v1";

  // Valores pagos (inicia vazio; carrega da planilha)
  var pagos = new Array(NUM_PARCELAS).fill(null);

  // ---------- Persistência ----------
  function carregarLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === NUM_PARCELAS) {
        pagos = arr.map(function (v) {
          return (v === null || v === undefined || v === "") ? null : Number(v);
        });
      }
    } catch (e) { /* ignora */ }
  }

  function salvarLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pagos));
    } catch (e) { /* ignora */ }
  }

  // Carrega da planilha (Google Sheets via Apps Script)
  function carregarDaPlanilha() {
    if (!WEB_APP_URL || WEB_APP_URL.indexOf("COLE_A_URL") !== -1) return;
    fetch(WEB_APP_URL + "?t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && Array.isArray(d.pagos) && d.pagos.length === NUM_PARCELAS) {
          pagos = d.pagos.map(function (v) {
            return (v === null || v === undefined || v === "") ? null : Number(v);
          });
          salvarLocal();
          atualizarTudo();
          preencherInputs();
          mostrarSugerida(primeiroNaoPago());
        }
      })
      .catch(function () { /* se falhar, usa o que está no navegador */ });
  }

  // Grava na planilha (Google Sheets via Apps Script)
  function salvarNaPlanilha() {
    if (!WEB_APP_URL || WEB_APP_URL.indexOf("COLE_A_URL") !== -1) return;
    fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ pagos: pagos })
    }).catch(function () { /* falha de rede: mantém local */ });
  }

  // ---------- Cálculo (mesma lógica das fórmulas da planilha) ----------
  function calcular() {
    var linhas = [];
    var saldoAnterior = TOTAL;
    var totalPago = 0;

    for (var i = 0; i < NUM_PARCELAS; i++) {
      var pago = pagos[i] || 0;
      totalPago += pago;
      var saldoRestante = saldoAnterior - pago;
      var restantes = NUM_PARCELAS - (i + 1);
      var sugerida = restantes > 0 ? saldoRestante / restantes : saldoRestante;

      linhas.push({
        parcela: i + 1,
        mes: MESES[i],
        pago: pago,
        saldoAnterior: saldoAnterior,
        saldoRestante: saldoRestante,
        sugerida: sugerida
      });

      saldoAnterior = saldoRestante;
    }

    return {
      linhas: linhas,
      totalPago: totalPago,
      saldoDevedor: linhas[NUM_PARCELAS - 1].saldoRestante
    };
  }

  function fmt(v) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function mesAtual() {
    var agora = new Date();
    return MESES[agora.getMonth()] + "/" + agora.getFullYear();
  }

  function primeiroNaoPago() {
    var idx = pagos.findIndex(function (p) { return !p || p === 0; });
    return idx === -1 ? NUM_PARCELAS - 1 : idx;
  }

  // ---------- Monta a tabela UMA vez (não recria a cada tecla) ----------
  var body = document.getElementById("parcelas-body");
  var dados = calcular();
  var atual = mesAtual();
  var html = "";

  dados.linhas.forEach(function (l) {
    var isAtual = l.mes === atual;
    var isPassado = l.mes < atual;
    var temPago = l.pago > 0;

    html += "<tr>"
      + '<td class="parcela-num">' + l.parcela + "</td>"
      + '<td class="mes' + (isAtual ? " current" : isPassado ? " past" : "") + '">' + l.mes + "</td>"
      + '<td><input class="valor-pago' + (temPago ? " has-value" : "") + '" type="text" inputmode="decimal" '
      + 'data-parcela="' + l.parcela + '" value="' + (temPago ? fmt(l.pago) : "") + '" placeholder="R$ 0,00" /></td>'
      + '<td class="valor" data-campo="anterior"></td>'
      + '<td class="valor restante" data-campo="restante"></td>'
      + "</tr>";
  });

  body.innerHTML = html;

  var linhasRef = [];
  body.querySelectorAll("tr").forEach(function (tr) {
    var input = tr.querySelector("input.valor-pago");
    var cells = tr.querySelectorAll("td.valor");
    linhasRef.push({ input: input, anterior: cells[0], restante: cells[1] });
  });

  function atualizarTudo() {
    var d = calcular();
    linhasRef.forEach(function (ref, idx) {
      var l = d.linhas[idx];
      ref.anterior.textContent = fmt(l.saldoAnterior);
      ref.restante.textContent = fmt(l.saldoRestante);
      ref.input.classList.toggle("has-value", l.pago > 0);
    });

    document.getElementById("sum-total").textContent = fmt(TOTAL);
    document.getElementById("sum-parcelas").textContent = NUM_PARCELAS;
    document.getElementById("sum-base").textContent = fmt(TOTAL / NUM_PARCELAS);
    document.getElementById("sum-pago").textContent = fmt(d.totalPago);
    document.getElementById("sum-devedor").textContent = fmt(d.saldoDevedor);
    document.getElementById("foot-pago").textContent = fmt(d.totalPago);
    document.getElementById("foot-restante").textContent = fmt(d.saldoDevedor);
  }

  // Preenche os campos com o valor formatado em reais (usado ao carregar)
  function preencherInputs() {
    var d = calcular();
    linhasRef.forEach(function (ref, idx) {
      var l = d.linhas[idx];
      ref.input.value = l.pago > 0 ? fmt(l.pago) : "";
    });
  }

  var sumSugerida = document.getElementById("sum-sugerida");
  function mostrarSugerida(idx) {
    var d = calcular();
    sumSugerida.textContent = fmt(d.linhas[idx].sugerida);
  }

  function parseValor(str) {
    if (!str) return 0;
    var s = str.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  linhasRef.forEach(function (ref, idx) {
    ref.input.addEventListener("input", function () {
      var val = parseValor(ref.input.value);
      pagos[idx] = val > 0 ? val : null;
      salvarLocal();
      salvarNaPlanilha();
      atualizarTudo();
      mostrarSugerida(idx);
    });
    ref.input.addEventListener("blur", function () {
      if (pagos[idx] > 0) {
        ref.input.value = fmt(pagos[idx]);
      }
    });
    ref.input.addEventListener("focus", function () {
      mostrarSugerida(idx);
      if (pagos[idx] > 0) {
        ref.input.value = String(pagos[idx]);
        ref.input.select();
      }
    });
  });

  // ---------- Inicialização ----------
  carregarLocal();
  atualizarTudo();
  preencherInputs();
  mostrarSugerida(primeiroNaoPago());
  carregarDaPlanilha();
})();
