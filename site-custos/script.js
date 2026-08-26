(function () {
  "use strict";

  var SHEET_ID = "1S2NJi7x6-jCWSh-Om082vLOetNePqVu0Hr0R2MHnyOs";
  var GIDS = {
    projetos: "0",
    participantes: "1543233281",
    custos: "1641623139"
  };

  var state = {
    projetos: [],
    participantes: [],
    custos: [],
    selectedId: null
  };

  var el = {
    select: document.getElementById("projectSelect"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnRetry: document.getElementById("btnRetry"),
    summary: document.getElementById("summary"),
    participants: document.getElementById("participants"),
    lancamentos: document.getElementById("lancamentos"),
    stateLoading: document.getElementById("stateLoading"),
    stateError: document.getElementById("stateError"),
    errorMsg: document.getElementById("errorMsg"),
    sumSaldo: document.getElementById("sum-saldo"),
    sumEntradas: document.getElementById("sum-entradas"),
    sumSaidas: document.getElementById("sum-saidas"),
    saldoBarFill: document.getElementById("saldo-bar-fill"),
    participantList: document.getElementById("participantList"),
    lancList: document.getElementById("lancList"),
    lancCount: document.getElementById("lancCount")
  };

  function fmt(v) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function fmtDate(d) {
    if (!d) return "";
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    return dd + "/" + mm + "/" + d.getFullYear();
  }

  function parseGviz(text) {
    var start = text.indexOf("{");
    var end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  }

  function fetchSheet(gid) {
    var url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID +
      "/gviz/tq?gid=" + gid + "&tqx=out:json";
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(parseGviz);
  }

  function rowsToObjects(table) {
    if (!table || !table.cols || !table.rows) return [];
    var headers = table.cols.map(function (c) { return c.label; });
    return table.rows.map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) {
        var cell = row.c[i];
        obj[h] = cell ? cell.v : null;
      });
      return obj;
    });
  }

  function loadAll() {
    showLoading();
    return Promise.all([
      fetchSheet(GIDS.projetos),
      fetchSheet(GIDS.participantes),
      fetchSheet(GIDS.custos)
    ]).then(function (results) {
      state.projetos = rowsToObjects(results[0].table);
      state.participantes = rowsToObjects(results[1].table);
      state.custos = rowsToObjects(results[2].table);
      populateProjects();
      if (state.projetos.length) {
        state.selectedId = state.projetos[0].ID_Projeto;
        el.select.value = state.selectedId;
        render();
      } else {
        showError("Nenhum projeto encontrado na planilha.");
      }
    }).catch(function (err) {
      showError("Não foi possível carregar os dados. Verifique sua conexão e se a planilha está compartilhada.");
    });
  }

  function populateProjects() {
    el.select.innerHTML = "";
    state.projetos.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.ID_Projeto;
      opt.textContent = p.Nome;
      el.select.appendChild(opt);
    });
  }

  function render() {
    var id = state.selectedId;
    var custos = state.custos.filter(function (c) { return c.ID_Projeto === id; });
    var participantes = state.participantes.filter(function (p) { return p.ID_Projeto === id; });

    var entradas = custos.filter(function (c) { return c.Tipo === "Entrada"; })
      .reduce(function (s, c) { return s + (Number(c.Valor) || 0); }, 0);
    var saidas = custos.filter(function (c) { return c.Tipo === "Saída"; })
      .reduce(function (s, c) { return s + (Number(c.Valor) || 0); }, 0);
    var saldo = entradas - saidas;

    el.summary.hidden = false;
    el.sumSaldo.textContent = fmt(saldo);
    el.sumSaldo.className = "saldo-value " + (saldo >= 0 ? "positivo" : "negativo");
    el.sumEntradas.textContent = fmt(entradas);
    el.sumSaidas.textContent = fmt(saidas);

    var total = entradas + saidas;
    var pctEntrada = total > 0 ? Math.round((entradas / total) * 100) : 0;
    el.saldoBarFill.style.width = pctEntrada + "%";

    renderParticipants(participantes);
    renderLancamentos(custos);
  }

  function renderParticipants(list) {
    el.participants.hidden = false;
    el.participantList.innerHTML = "";
    if (!list.length) {
      el.participants.hidden = true;
      return;
    }
    list.forEach(function (p) {
      var li = document.createElement("li");
      li.className = "participant-item";

      var name = document.createElement("span");
      name.className = "participant-name";
      name.textContent = p.Nome;

      var pct = document.createElement("span");
      pct.className = "participant-pct";
      pct.textContent = (Number(p.Porcentagem) || 0) + "%";

      li.appendChild(name);
      li.appendChild(pct);
      el.participantList.appendChild(li);
    });
  }

  function renderLancamentos(list) {
    el.lancamentos.hidden = false;
    el.lancList.innerHTML = "";
    el.lancCount.textContent = list.length;

    var sorted = list.slice().sort(function (a, b) {
      var da = a.Data ? new Date(a.Data) : new Date(0);
      var db = b.Data ? new Date(b.Data) : new Date(0);
      return db - da;
    });

    if (!sorted.length) {
      var empty = document.createElement("li");
      empty.className = "lanc-item";
      empty.textContent = "Nenhum lançamento neste projeto.";
      el.lancList.appendChild(empty);
      return;
    }

    sorted.forEach(function (c) {
      var isEntrada = c.Tipo === "Entrada";
      var li = document.createElement("li");
      li.className = "lanc-item";

      var icon = document.createElement("span");
      icon.className = "lanc-icon " + (isEntrada ? "entrada" : "saida");
      icon.innerHTML = isEntrada
        ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>'
        : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>';

      var body = document.createElement("div");
      body.className = "lanc-body";

      var desc = document.createElement("div");
      desc.className = "lanc-desc";
      desc.textContent = c.Descrição || "Sem descrição";

      var meta = document.createElement("div");
      meta.className = "lanc-meta";
      meta.textContent = c.Data ? fmtDate(new Date(c.Data)) : "";

      body.appendChild(desc);
      body.appendChild(meta);

      var valor = document.createElement("span");
      valor.className = "lanc-valor " + (isEntrada ? "entrada" : "saida");
      valor.textContent = (isEntrada ? "+" : "-") + fmt(Math.abs(Number(c.Valor) || 0));

      li.appendChild(icon);
      li.appendChild(body);
      li.appendChild(valor);
      el.lancList.appendChild(li);
    });
  }

  function showLoading() {
    el.stateLoading.hidden = false;
    el.stateError.hidden = true;
    el.summary.hidden = true;
    el.participants.hidden = true;
    el.lancamentos.hidden = true;
  }

  function showError(msg) {
    el.stateLoading.hidden = true;
    el.stateError.hidden = false;
    el.errorMsg.textContent = msg;
    el.summary.hidden = true;
    el.participants.hidden = true;
    el.lancamentos.hidden = true;
  }

  el.select.addEventListener("change", function () {
    state.selectedId = el.select.value;
    render();
  });

  el.btnRefresh.addEventListener("click", function () {
    el.btnRefresh.classList.add("spinning");
    loadAll().finally(function () {
      setTimeout(function () { el.btnRefresh.classList.remove("spinning"); }, 400);
    });
  });

  el.btnRetry.addEventListener("click", loadAll);

  loadAll();
})();
