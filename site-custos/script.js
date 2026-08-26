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
    novoLanc: document.getElementById("novoLanc"),
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
    lancCount: document.getElementById("lancCount"),
    lancForm: document.getElementById("lancForm"),
    segTipo: document.getElementById("segTipo"),
    lancDesc: document.getElementById("lancDesc"),
    lancValor: document.getElementById("lancValor"),
    lancData: document.getElementById("lancData"),
    btnLancar: document.getElementById("btnLancar"),
    lancMsg: document.getElementById("lancMsg"),
    lancTitle: document.getElementById("lancTitle"),
    btnCancelarEdicao: document.getElementById("btnCancelarEdicao"),
    btnAddProjeto: document.getElementById("btnAddProjeto"),
    projetoForm: document.getElementById("projetoForm"),
    projetoFormEl: document.getElementById("projetoFormEl"),
    projNome: document.getElementById("projNome"),
    projData: document.getElementById("projData"),
    projDesc: document.getElementById("projDesc"),
    btnSalvarProjeto: document.getElementById("btnSalvarProjeto"),
    btnCancelarProjeto: document.getElementById("btnCancelarProjeto"),
    projMsg: document.getElementById("projMsg"),
    btnAddParticipante: document.getElementById("btnAddParticipante"),
    participanteForm: document.getElementById("participanteForm"),
    participanteFormEl: document.getElementById("participanteFormEl"),
    partNome: document.getElementById("partNome"),
    partPct: document.getElementById("partPct"),
    btnSalvarParticipante: document.getElementById("btnSalvarParticipante"),
    btnCancelarParticipante: document.getElementById("btnCancelarParticipante"),
    partMsg: document.getElementById("partMsg")
  };

  var lancTipo = "Entrada";
  var editingCustoId = null;

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
    el.novoLanc.hidden = false;
    el.sumSaldo.textContent = fmt(saldo);
    el.sumSaldo.className = "saldo-value " + (saldo >= 0 ? "positivo" : "negativo");
    el.sumEntradas.textContent = fmt(entradas);
    el.sumSaidas.textContent = fmt(saidas);

    var total = entradas + saidas;
    var pctEntrada = total > 0 ? Math.round((entradas / total) * 100) : 0;
    el.saldoBarFill.style.width = pctEntrada + "%";

    renderParticipants(participantes, saldo);
    renderLancamentos(custos);
  }

  function renderParticipants(list, saldo) {
    el.participants.hidden = false;
    el.participantList.innerHTML = "";
    if (!list.length) {
      el.participants.hidden = true;
      return;
    }
    list.forEach(function (p) {
      var pct = Number(p.Porcentagem) || 0;
      var valor = saldo * (pct / 100);

      var li = document.createElement("li");
      li.className = "participant-item";

      var left = document.createElement("div");
      left.className = "participant-left";

      var avatar = document.createElement("span");
      avatar.className = "participant-avatar";
      avatar.textContent = (p.Nome || "?").charAt(0).toUpperCase();

      var name = document.createElement("span");
      name.className = "participant-name";
      name.textContent = p.Nome;

      left.appendChild(avatar);
      left.appendChild(name);

      var right = document.createElement("div");
      right.className = "participant-right";

      var pctEl = document.createElement("span");
      pctEl.className = "participant-pct";
      pctEl.textContent = pct + "%";

      var valorEl = document.createElement("span");
      valorEl.className = "participant-valor " + (valor >= 0 ? "receber" : "dever");
      valorEl.textContent = (valor >= 0 ? "Recebe " : "Deve ") + fmt(Math.abs(valor));

      right.appendChild(pctEl);
      right.appendChild(valorEl);

      li.appendChild(left);
      li.appendChild(right);
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

      var actions = document.createElement("div");
      actions.className = "lanc-actions";

      var btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "lanc-action-btn edit";
      btnEdit.setAttribute("aria-label", "Editar");
      btnEdit.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
      btnEdit.addEventListener("click", function () { startEditCusto(c.ID_Custo); });

      var btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "lanc-action-btn del";
      btnDel.setAttribute("aria-label", "Excluir");
      btnDel.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      btnDel.addEventListener("click", function () { deleteCusto(c.ID_Custo); });

      actions.appendChild(btnEdit);
      actions.appendChild(btnDel);

      li.appendChild(icon);
      li.appendChild(body);
      li.appendChild(valor);
      li.appendChild(actions);
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

  function setLancMsg(msg, ok) {
    el.lancMsg.hidden = false;
    el.lancMsg.className = "form-msg " + (ok ? "ok" : "err");
    el.lancMsg.textContent = msg;
  }

  function clearLancMsg() {
    el.lancMsg.hidden = true;
  }

  function setLancTipo(tipo) {
    lancTipo = tipo;
    var btns = el.segTipo.querySelectorAll(".seg-btn");
    btns.forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tipo") === tipo);
    });
  }

  function checkConfig() {
    return window.WEB_APP_URL && WEB_APP_URL.indexOf("COLE_A_URL") === -1;
  }

  function postAction(payload) {
    return fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
  }

  function resetLancForm() {
    editingCustoId = null;
    el.lancForm.reset();
    setLancTipo("Entrada");
    el.lancTitle.textContent = "Novo lançamento";
    el.btnLancar.textContent = "Lançar";
    el.btnCancelarEdicao.hidden = true;
    clearLancMsg();
  }

  function startEditCusto(idCusto) {
    var custo = state.custos.find(function (c) { return c.ID_Custo === idCusto; });
    if (!custo) return;
    editingCustoId = idCusto;
    setLancTipo(custo.Tipo);
    el.lancDesc.value = custo.Descrição || "";
    el.lancValor.value = custo.Valor;
    if (custo.Data) {
      var d = new Date(custo.Data);
      el.lancData.value = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    } else {
      el.lancData.value = "";
    }
    el.lancTitle.textContent = "Editar lançamento";
    el.btnLancar.textContent = "Salvar alterações";
    el.btnCancelarEdicao.hidden = false;
    clearLancMsg();
    el.novoLanc.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteCusto(idCusto) {
    var custo = state.custos.find(function (c) { return c.ID_Custo === idCusto; });
    var label = custo ? (custo.Descrição || "este lançamento") : "este lançamento";
    if (!window.confirm("Excluir \"" + label + "\"?")) return;
    if (!checkConfig()) {
      setLancMsg("Configure a URL do Apps Script no arquivo config.js.", false);
      return;
    }
    postAction({ action: "deleteCusto", idCusto: idCusto })
      .then(function () {
        setLancMsg("Lançamento excluído. Atualizando...", true);
        if (editingCustoId === idCusto) resetLancForm();
        return loadAll();
      })
      .catch(function () {
        setLancMsg("Falha ao excluir.", false);
      });
  }

  el.segTipo.addEventListener("click", function (e) {
    var btn = e.target.closest(".seg-btn");
    if (btn) setLancTipo(btn.getAttribute("data-tipo"));
  });

  el.lancForm.addEventListener("submit", function (e) {
    e.preventDefault();
    clearLancMsg();

    var descricao = el.lancDesc.value.trim();
    var valor = parseFloat(el.lancValor.value);
    var data = el.lancData.value || "";

    if (!descricao) {
      setLancMsg("Informe a descrição.", false);
      return;
    }
    if (!valor || valor <= 0) {
      setLancMsg("Informe um valor válido.", false);
      return;
    }
    if (!state.selectedId) {
      setLancMsg("Selecione um projeto.", false);
      return;
    }
    if (!checkConfig()) {
      setLancMsg("Configure a URL do Apps Script no arquivo config.js.", false);
      return;
    }

    el.btnLancar.disabled = true;
    el.btnLancar.textContent = "Salvando...";

    var payload = editingCustoId
      ? { action: "updateCusto", idCusto: editingCustoId, tipo: lancTipo, descricao: descricao, valor: valor, data: data }
      : { action: "addCusto", idProjeto: state.selectedId, tipo: lancTipo, descricao: descricao, valor: valor, data: data };

    postAction(payload)
      .then(function () {
        setLancMsg(editingCustoId ? "Alterações salvas! Atualizando..." : "Lançamento enviado! Atualizando...", true);
        resetLancForm();
        return loadAll();
      })
      .catch(function () {
        setLancMsg("Falha ao enviar. Verifique a URL do Apps Script.", false);
      })
      .finally(function () {
        el.btnLancar.disabled = false;
        el.btnLancar.textContent = editingCustoId ? "Salvar alterações" : "Lançar";
      });
  });

  el.btnCancelarEdicao.addEventListener("click", resetLancForm);

  el.select.addEventListener("change", function () {
    state.selectedId = el.select.value;
    resetLancForm();
    render();
  });

  el.btnRefresh.addEventListener("click", function () {
    el.btnRefresh.classList.add("spinning");
    loadAll().finally(function () {
      setTimeout(function () { el.btnRefresh.classList.remove("spinning"); }, 400);
    });
  });

  el.btnRetry.addEventListener("click", loadAll);

  // ===== Novo projeto =====
  function setProjMsg(msg, ok) {
    el.projMsg.hidden = false;
    el.projMsg.className = "form-msg " + (ok ? "ok" : "err");
    el.projMsg.textContent = msg;
  }

  el.btnAddProjeto.addEventListener("click", function () {
    el.projetoForm.hidden = false;
    el.projetoForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  el.btnCancelarProjeto.addEventListener("click", function () {
    el.projetoForm.hidden = true;
    el.projetoFormEl.reset();
    el.projMsg.hidden = true;
  });

  el.projetoFormEl.addEventListener("submit", function (e) {
    e.preventDefault();
    var nome = el.projNome.value.trim();
    if (!nome) {
      setProjMsg("Informe o nome do projeto.", false);
      return;
    }
    if (!checkConfig()) {
      setProjMsg("Configure a URL do Apps Script no arquivo config.js.", false);
      return;
    }
    el.btnSalvarProjeto.disabled = true;
    el.btnSalvarProjeto.textContent = "Salvando...";
    postAction({
      action: "addProjeto",
      nome: nome,
      dataInicio: el.projData.value || "",
      descricao: el.projDesc.value.trim()
    })
      .then(function () {
        setProjMsg("Projeto criado! Atualizando...", true);
        el.projetoFormEl.reset();
        return loadAll();
      })
      .then(function () {
        el.projetoForm.hidden = true;
        el.projMsg.hidden = true;
      })
      .catch(function () {
        setProjMsg("Falha ao criar projeto.", false);
      })
      .finally(function () {
        el.btnSalvarProjeto.disabled = false;
        el.btnSalvarProjeto.textContent = "Salvar projeto";
      });
  });

  // ===== Novo participante =====
  function setPartMsg(msg, ok) {
    el.partMsg.hidden = false;
    el.partMsg.className = "form-msg " + (ok ? "ok" : "err");
    el.partMsg.textContent = msg;
  }

  el.btnAddParticipante.addEventListener("click", function () {
    el.participanteForm.hidden = false;
    el.participanteForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  el.btnCancelarParticipante.addEventListener("click", function () {
    el.participanteForm.hidden = true;
    el.participanteFormEl.reset();
    el.partMsg.hidden = true;
  });

  el.participanteFormEl.addEventListener("submit", function (e) {
    e.preventDefault();
    var nome = el.partNome.value.trim();
    var pct = parseFloat(el.partPct.value);
    if (!nome) {
      setPartMsg("Informe o nome.", false);
      return;
    }
    if (!pct || pct <= 0 || pct > 100) {
      setPartMsg("Informe uma porcentagem entre 0 e 100.", false);
      return;
    }
    if (!state.selectedId) {
      setPartMsg("Selecione um projeto primeiro.", false);
      return;
    }
    if (!checkConfig()) {
      setPartMsg("Configure a URL do Apps Script no arquivo config.js.", false);
      return;
    }
    el.btnSalvarParticipante.disabled = true;
    el.btnSalvarParticipante.textContent = "Salvando...";
    postAction({
      action: "addParticipante",
      idProjeto: state.selectedId,
      nome: nome,
      porcentagem: pct
    })
      .then(function () {
        setPartMsg("Participante adicionado! Atualizando...", true);
        el.participanteFormEl.reset();
        return loadAll();
      })
      .then(function () {
        el.participanteForm.hidden = true;
        el.partMsg.hidden = true;
      })
      .catch(function () {
        setPartMsg("Falha ao adicionar participante.", false);
      })
      .finally(function () {
        el.btnSalvarParticipante.disabled = false;
        el.btnSalvarParticipante.textContent = "Salvar participante";
      });
  });

  loadAll();
})();
