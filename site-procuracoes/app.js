(function () {
  "use strict";

  const PROCURADOR = {
    nome: "Douglas de Carvalho Melo",
    titulo: "Técnico em Eletrotécnica",
    registro: "41730848893",
    rg: "41.055.396-7",
    cpf: "417.308.488-93",
  };

  const WHATSAPP_NUMERO = "5519998093790";

  const CONCESSIONARIAS_PADRAO = [
    "ELEKTRO REDES S.A.",
    "CPFL PAULISTA",
    "CPFL PIRATININGA",
    "ENEL SP",
    "EDP SÃO PAULO",
  ];

  const CONCESSIONARIAS_STORAGE_KEY = "dc-procuracoes-concessionarias";
  const UFS = new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);

  const MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];

  const form = document.getElementById("form-procuracao");
  const blocoCpf = document.getElementById("bloco-cpf");
  const blocoCnpj = document.getElementById("bloco-cnpj");
  const radiosTipo = document.querySelectorAll('input[name="tipoOutorgante"]');
  const inputConcessionaria = document.getElementById("concessionaria");
  const listaConcessionarias = document.getElementById("lista-concessionarias");
  const formErro = document.getElementById("form-erro");
  const resultado = document.getElementById("resultado");
  const linkDownload = document.getElementById("link-download");
  const linkWhatsapp = document.getElementById("link-whatsapp");
  const linkVisualizar = document.getElementById("link-visualizar");
  const inputData = document.getElementById("data-assinatura");
  const botaoGerar = document.getElementById("gerar-pdf");
  const statusGeracao = document.getElementById("status-geracao");
  const statusDocumento = document.getElementById("status-documento");
  const ucAtivar = document.getElementById("uc-ativar");
  const blocoUc = document.getElementById("bloco-uc");
  const errosCampos = new Map();
  let urlPdf = null;
  let gerando = false;
  let revisaoFormulario = 0;

  function onlyDigits(str) {
    return (str || "").replace(/\D/g, "");
  }

  function maskCpf(value) {
    const d = onlyDigits(value).slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function maskCnpj(value) {
    const d = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
    return d
      .replace(/^([A-Z0-9]{2})([A-Z0-9])/, "$1.$2")
      .replace(/^([A-Z0-9]{2}\.[A-Z0-9]{3})([A-Z0-9])/, "$1.$2")
      .replace(/^([A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3})([A-Z0-9])/, "$1/$2")
      .replace(/([A-Z0-9]{4})([A-Z0-9]{1,2})$/, "$1-$2");
  }

  function validaCpf(cpfInput) {
    const cpf = onlyDigits(cpfInput);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[9], 10)) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf[10], 10);
  }

  function validaCnpj(cnpjInput) {
    const cnpj = cnpjInput.toUpperCase().replace(/[.\/\-\s]/g, "");
    if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
    const calc = (base) => {
      const pesos = base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let soma = 0;
      // Receita Federal: valor ASCII menos 48, também compatível com CNPJ numérico.
      // https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
      for (let i = 0; i < base.length; i++) soma += (base.charCodeAt(i) - 48) * pesos[i];
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    const dv1 = calc(cnpj.slice(0, 12));
    const dv2 = calc(cnpj.slice(0, 12) + dv1);
    return cnpj.slice(12) === `${dv1}${dv2}`;
  }

  function toggleTipoOutorgante() {
    const tipo = document.querySelector('input[name="tipoOutorgante"]:checked').value;
    blocoCpf.hidden = tipo !== "cpf";
    blocoCnpj.hidden = tipo !== "cnpj";
    blocoCpf.disabled = tipo !== "cpf";
    blocoCnpj.disabled = tipo !== "cnpj";
    for (const id of errosCampos.keys()) {
      if (document.getElementById(id).matches(":disabled")) limparErroCampo(id);
    }
    atualizarResumo();
  }

  radiosTipo.forEach((radio) => radio.addEventListener("change", toggleTipoOutorgante));

  function toggleUc() {
    const ligado = ucAtivar.checked;
    blocoUc.disabled = !ligado;
    if (!ligado) {
      document.getElementById("uc-numero").value = "";
      document.getElementById("uc-endereco").value = "";
    }
  }
  ucAtivar.addEventListener("change", toggleUc);

  document.getElementById("pf-cpf").addEventListener("input", (e) => {
    e.target.value = maskCpf(e.target.value);
  });
  document.getElementById("rep-cpf").addEventListener("input", (e) => {
    e.target.value = maskCpf(e.target.value);
  });
  document.getElementById("pj-cnpj").addEventListener("input", (e) => {
    e.target.value = maskCnpj(e.target.value);
  });

  function lerConcessionariasSalvas() {
    try {
      const raw = localStorage.getItem(CONCESSIONARIAS_STORAGE_KEY);
      const lista = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(lista)) return [];
      return [...new Set(lista.filter((nome) => typeof nome === "string")
        .map((nome) => nome.trim()).filter((nome) => nome && nome.length <= 120))].slice(-30);
    } catch (err) {
      return [];
    }
  }

  function salvarNovaConcessionaria(nome) {
    const salvas = lerConcessionariasSalvas();
    const jaExiste = [...CONCESSIONARIAS_PADRAO, ...salvas].some(
      (item) => item.toLowerCase() === nome.toLowerCase()
    );
    if (!jaExiste) {
      salvas.push(nome);
      try {
        localStorage.setItem(CONCESSIONARIAS_STORAGE_KEY, JSON.stringify(salvas.slice(-30)));
      } catch (err) {
        // localStorage indisponível: segue sem persistir, o nome digitado ainda é usado no PDF.
      }
    }
  }

  function preencherListaConcessionarias() {
    const todas = [...CONCESSIONARIAS_PADRAO, ...lerConcessionariasSalvas()];
    listaConcessionarias.innerHTML = "";
    todas.forEach((nome) => {
      const opt = document.createElement("option");
      opt.value = nome;
      listaConcessionarias.appendChild(opt);
    });
  }

  function renderizarErros(focar = false) {
    formErro.replaceChildren();
    formErro.hidden = errosCampos.size === 0;
    if (!errosCampos.size) return;
    const titulo = document.createElement("h3");
    titulo.id = "erro-titulo";
    titulo.textContent = "Confira os campos abaixo";
    const lista = document.createElement("ul");
    const ordemCampos = [...form.elements].map((campo) => campo.id);
    const errosOrdenados = [...errosCampos].sort(([idA], [idB]) => ordemCampos.indexOf(idA) - ordemCampos.indexOf(idB));
    errosOrdenados.forEach(([id, mensagem]) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${id}`;
      link.textContent = mensagem;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.getElementById(id).focus();
      });
      item.appendChild(link);
      lista.appendChild(item);
    });
    formErro.append(titulo, lista);
    if (focar) formErro.focus();
  }

  function limparErroCampo(id) {
    const campo = document.getElementById(id);
    const erroId = `${id}-erro`;
    document.getElementById(erroId)?.remove();
    campo.removeAttribute("aria-invalid");
    const descricoes = (campo.getAttribute("aria-describedby") || "").split(/\s+/).filter((item) => item && item !== erroId);
    if (descricoes.length) campo.setAttribute("aria-describedby", descricoes.join(" "));
    else campo.removeAttribute("aria-describedby");
    errosCampos.delete(id);
    renderizarErros();
  }

  function limparErros() {
    [...errosCampos.keys()].forEach(limparErroCampo);
  }

  function mostrarErros(erros) {
    erros.forEach(({ id, mensagem }) => {
      const campo = document.getElementById(id);
      const erroId = `${id}-erro`;
      const aviso = document.createElement("p");
      aviso.id = erroId;
      aviso.className = "field-error";
      aviso.textContent = mensagem;
      campo.closest(".field").appendChild(aviso);
      campo.setAttribute("aria-invalid", "true");
      campo.setAttribute("aria-describedby", [campo.getAttribute("aria-describedby"), erroId].filter(Boolean).join(" "));
      errosCampos.set(id, mensagem);
    });
    renderizarErros(true);
  }

  function lerDataLocal(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(0);
    data.setHours(0, 0, 0, 0);
    data.setFullYear(ano, mes - 1, dia);
    return ano > 0 && data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia ? data : null;
  }

  function atualizarResumo() {
    const tipo = document.querySelector('input[name="tipoOutorgante"]:checked').value;
    const valor = (id) => document.getElementById(id).value.trim();
    const data = lerDataLocal(inputData.value);
    const resumo = {
      "resumo-tipo": tipo === "cpf" ? "Pessoa física" : "Pessoa jurídica",
      "resumo-nome": valor(tipo === "cpf" ? "pf-nome" : "pj-razao") || "A preencher",
      "resumo-concessionaria": valor("concessionaria") || "A preencher",
      "resumo-local": [valor("cidade"), valor("uf")].filter(Boolean).join(" / ") || "A preencher",
      "resumo-data": data ? data.toLocaleDateString("pt-BR") : "A preencher",
    };
    Object.entries(resumo).forEach(([id, texto]) => { document.getElementById(id).textContent = texto; });
    const obrigatorios = [...form.querySelectorAll("[required]")].filter((campo) => !campo.matches(":disabled") && campo.type !== "radio");
    const preenchidos = obrigatorios.filter((campo) => campo.value.trim()).length;
    document.getElementById("progresso-texto").textContent = `${preenchidos} de ${obrigatorios.length} campos preenchidos`;
    const progresso = document.getElementById("progresso-preenchimento");
    progresso.max = obrigatorios.length || 1;
    progresso.value = preenchidos;
  }

  function invalidarPdf() {
    if (urlPdf) {
      URL.revokeObjectURL(urlPdf);
      urlPdf = null;
      statusDocumento.textContent = "Os dados foram alterados. Gere novamente o PDF para baixar a versão atualizada.";
    }
    resultado.hidden = true;
    [linkDownload, linkVisualizar, linkWhatsapp].forEach((link) => link.removeAttribute("href"));
    linkDownload.removeAttribute("download");
  }

  function coletarDados() {
    const tipo = document.querySelector('input[name="tipoOutorgante"]:checked').value;
    const concessionaria = inputConcessionaria.value.trim();
    const cidade = document.getElementById("cidade").value.trim();
    const uf = document.getElementById("uf").value.trim().toUpperCase();

    const erros = [];
    const erro = (id, mensagem) => erros.push({ id, mensagem });
    if (!concessionaria) erro("concessionaria", "Informe a concessionária.");
    if (!cidade) erro("cidade", "Informe a cidade de assinatura.");
    if (!UFS.has(uf)) erro("uf", "Selecione a UF de assinatura.");
    const dataAssinatura = lerDataLocal(inputData.value);
    if (!dataAssinatura) erro("data-assinatura", "Informe uma data de assinatura válida.");

    let outorgante = null;

    if (tipo === "cpf") {
      const nome = document.getElementById("pf-nome").value.trim();
      const cpf = document.getElementById("pf-cpf").value.trim();
      const rg = document.getElementById("pf-rg").value.trim();
      const endereco = document.getElementById("pf-endereco").value.trim();
      if (!nome) erro("pf-nome", "Informe o nome completo do outorgante.");
      if (!cpf) erro("pf-cpf", "Informe o CPF do outorgante.");
      else if (!validaCpf(cpf)) erro("pf-cpf", "O CPF do outorgante parece inválido. Confira os números.");
      if (!endereco) erro("pf-endereco", "Informe o endereço completo do outorgante.");
      outorgante = { tipo: "cpf", nome, cpf, rg, endereco };
    } else {
      const razaoSocial = document.getElementById("pj-razao").value.trim();
      const cnpj = document.getElementById("pj-cnpj").value.trim();
      const enderecoSede = document.getElementById("pj-endereco").value.trim();
      const repNome = document.getElementById("rep-nome").value.trim();
      const repCpf = document.getElementById("rep-cpf").value.trim();
      const repRg = document.getElementById("rep-rg").value.trim();
      if (!razaoSocial) erro("pj-razao", "Informe a razão social.");
      if (!cnpj) erro("pj-cnpj", "Informe o CNPJ.");
      else if (!validaCnpj(cnpj)) erro("pj-cnpj", "O CNPJ parece inválido. Confira os caracteres.");
      if (!enderecoSede) erro("pj-endereco", "Informe o endereço da sede.");
      if (!repNome) erro("rep-nome", "Informe o nome do representante legal.");
      if (!repCpf) erro("rep-cpf", "Informe o CPF do representante legal.");
      else if (!validaCpf(repCpf)) erro("rep-cpf", "O CPF do representante parece inválido. Confira os números.");
      outorgante = { tipo: "cnpj", razaoSocial, cnpj, enderecoSede, repNome, repCpf, repRg };
    }

    form.querySelectorAll("input[maxlength]").forEach((campo) => {
      if (!campo.matches(":disabled") && campo.value.length > campo.maxLength && !erros.some((item) => item.id === campo.id)) {
        erro(campo.id, `Use no máximo ${campo.maxLength} caracteres neste campo.`);
      }
    });

    let unidadeConsumidora = null;
    if (ucAtivar.checked) {
      const numero = document.getElementById("uc-numero").value.trim();
      const endereco = document.getElementById("uc-endereco").value.trim();
      if (numero || endereco) unidadeConsumidora = { numero, endereco };
    }

    return {
      erros,
      dados: {
        outorgante,
        concessionaria,
        cidade,
        uf,
        dataAssinatura,
        unidadeConsumidora,
      },
    };
  }

  function formatarData(data) {
    return `${String(data.getDate()).padStart(2, "0")} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`;
  }

  function gerarPdf(dados) {
    if (typeof window.jspdf?.jsPDF !== "function") {
      throw new Error("A ferramenta de PDF não carregou. Confira sua conexão e recarregue a página para tentar novamente.");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margem = 56;
    const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
    const alturaPagina = doc.internal.pageSize.getHeight();
    let y = margem;

    function novaLinha(altura) {
      y += altura;
      if (y > alturaPagina - margem) {
        doc.addPage();
        y = margem;
      }
    }

    function paragrafo(texto, opts) {
      opts = opts || {};
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setFontSize(opts.size || 11);
      const linhas = doc.splitTextToSize(texto, larguraUtil);
      linhas.forEach((linha) => {
        if (y > alturaPagina - margem) {
          doc.addPage();
          y = margem;
        }
        doc.text(linha, opts.center ? doc.internal.pageSize.getWidth() / 2 : margem, y, {
          align: opts.center ? "center" : "left",
        });
        y += (opts.lineHeight || 15);
      });
    }

    paragrafo("PROCURAÇÃO PARTICULAR", { bold: true, size: 15, center: true });
    novaLinha(14);

    const dataAssinatura = formatarData(dados.dataAssinatura);
    let abertura;
    if (dados.outorgante.tipo === "cpf") {
      const o = dados.outorgante;
      abertura = `${o.nome}, portador(a) do RG nº ${o.rg || "não informado"} e do CPF nº ${o.cpf}, residente e domiciliado(a) na ${o.endereco}, nomeia e constitui seu procurador ${PROCURADOR.nome}, ${PROCURADOR.titulo}, registro profissional CFT nº ${PROCURADOR.registro}, portador do RG nº ${PROCURADOR.rg} e do CPF nº ${PROCURADOR.cpf}.`;
    } else {
      const o = dados.outorgante;
      abertura = `${o.razaoSocial}, inscrita no CNPJ sob o nº ${o.cnpj}, com sede na ${o.enderecoSede}, neste ato representada por ${o.repNome}, portador(a) do RG nº ${o.repRg || "não informado"} e do CPF nº ${o.repCpf}, nomeia e constitui seu procurador ${PROCURADOR.nome}, ${PROCURADOR.titulo}, registro profissional CFT nº ${PROCURADOR.registro}, portador do RG nº ${PROCURADOR.rg} e do CPF nº ${PROCURADOR.cpf}.`;
    }
    paragrafo(abertura);
    novaLinha(10);

    const poderes1 = `Ao procurador são conferidos poderes para assinar e representar a outorgante perante a concessionária ${dados.concessionaria}, podendo tratar de disponibilidade de energia elétrica, elaboração de projetos, execução de obras de redes em média e baixa tensão e subestações elétricas, aumento de carga instalada e demanda, consultoria, extratos de faturas, contratos de demanda, energia provisória e solicitação de novas unidades consumidoras, inclusive incorporação de redes particulares.`;
    paragrafo(poderes1);
    novaLinha(10);

    if (dados.unidadeConsumidora && (dados.unidadeConsumidora.numero || dados.unidadeConsumidora.endereco)) {
      const partes = [];
      if (dados.unidadeConsumidora.numero) partes.push(`UC nº ${dados.unidadeConsumidora.numero}`);
      if (dados.unidadeConsumidora.endereco) partes.push(`instalação em ${dados.unidadeConsumidora.endereco}`);
      paragrafo(`Esta procuração refere-se especificamente à ${partes.join(", ")}.`);
      novaLinha(10);
    }

    const poderes2 = "Os poderes abrangem a assinatura do projeto elétrico, das documentações pertinentes ao projeto e do Termo de Responsabilidade Técnica (TRT), que se fizerem necessários perante o CFT, bem como dos demais documentos de habilitação e outros perante os órgãos competentes, inclusive os de infraestrutura, viação e obras públicas e meio ambiente, quando necessários e pertinentes aos serviços elétricos.";
    paragrafo(poderes2);
    novaLinha(10);

    const validade = "O procurador poderá assinar e encaminhar os documentos necessários pelo período de 01 (um) ano, contado da data da assinatura desta procuração.";
    paragrafo(validade);
    novaLinha(30);

    const localData = `${dados.cidade} - ${dados.uf}, ${dataAssinatura}.`;
    const assinatura = dados.outorgante.tipo === "cpf"
      ? [{ texto: dados.outorgante.nome, bold: true }]
      : [
        { texto: dados.outorgante.repNome, bold: true },
        { texto: `Representante de ${dados.outorgante.razaoSocial}` },
        { texto: `CNPJ: ${dados.outorgante.cnpj}` },
      ];
    // Mantém local, espaço para assinatura e identificação na mesma página.
    const alturaTexto = (texto, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(11);
      return doc.splitTextToSize(texto, larguraUtil).length * 15;
    };
    const alturaAssinatura = alturaTexto(localData) + 50 + 15 + 2
      + assinatura.reduce((altura, item) => altura + alturaTexto(item.texto, item.bold), 0);
    if (y + alturaAssinatura > alturaPagina - margem) {
      doc.addPage();
      y = margem;
    }

    paragrafo(localData);
    novaLinha(50);

    paragrafo("_________________________________________");
    novaLinha(2);
    assinatura.forEach((item) => paragrafo(item.texto, { bold: item.bold }));

    const nomeArquivoBase = dados.outorgante.tipo === "cpf" ? dados.outorgante.nome : dados.outorgante.razaoSocial;
    const nomeSeguro = nomeArquivoBase.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "Documento";
    const nomeArquivo = `Procuracao_${nomeSeguro}.pdf`;

    return { doc, nomeArquivo };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (gerando) return;
    limparErros();
    statusGeracao.textContent = "";

    const { erros, dados } = coletarDados();
    if (erros.length > 0) {
      mostrarErros(erros);
      return;
    }

    gerando = true;
    const revisao = revisaoFormulario;
    const conteudoBotao = [...botaoGerar.childNodes];
    botaoGerar.disabled = true;
    botaoGerar.textContent = "Gerando PDF…";
    form.setAttribute("aria-busy", "true");
    statusGeracao.textContent = "Preparando sua procuração…";
    try {
      // Permite que o navegador mostre o estado de geração antes de montar o arquivo.
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      if (revisao !== revisaoFormulario) {
        statusGeracao.textContent = "Os dados foram alterados. Gere novamente a procuração.";
        return;
      }
      const { doc, nomeArquivo } = gerarPdf(dados);
      const blob = doc.output("blob");
      invalidarPdf();
      urlPdf = URL.createObjectURL(blob);
      linkDownload.href = urlPdf;
      linkDownload.download = nomeArquivo;
      linkVisualizar.href = urlPdf;
      const textoWhatsapp = encodeURIComponent("Olá! Gerei minha procuração. Vou conferir, assinar e anexar o PDF nesta conversa.");
      linkWhatsapp.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${textoWhatsapp}`;
      document.getElementById("resultado-arquivo").textContent = nomeArquivo;
      salvarNovaConcessionaria(dados.concessionaria);
      preencherListaConcessionarias();
      statusDocumento.textContent = "";
      statusGeracao.textContent = "PDF gerado. Confira os dados antes de assinar.";
      resultado.hidden = false;
      resultado.focus();
    } catch (erro) {
      invalidarPdf();
      statusGeracao.textContent = typeof window.jspdf?.jsPDF !== "function"
        ? "Não foi possível carregar a ferramenta de PDF. Confira a conexão e recarregue a página para tentar novamente."
        : "Não foi possível gerar o PDF. Seus dados continuam no formulário; tente novamente.";
    } finally {
      gerando = false;
      botaoGerar.disabled = false;
      botaoGerar.replaceChildren(...conteudoBotao);
      form.removeAttribute("aria-busy");
    }
  });

  function aoEditar(event) {
    if (!event.target.matches("input, select, textarea")) return;
    revisaoFormulario += 1;
    invalidarPdf();
    if (!gerando) statusGeracao.textContent = "";
    if (errosCampos.has(event.target.id)) limparErroCampo(event.target.id);
    atualizarResumo();
  }
  form.addEventListener("input", aoEditar);
  form.addEventListener("change", aoEditar);

  const hoje = new Date();
  inputData.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  toggleTipoOutorgante();
  toggleUc();
  preencherListaConcessionarias();
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted && urlPdf) URL.revokeObjectURL(urlPdf);
  });
})();
