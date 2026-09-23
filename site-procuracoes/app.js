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
    const d = onlyDigits(value).slice(0, 14);
    return d
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
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
    const cnpj = onlyDigits(cnpjInput);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    const calc = (base) => {
      let pesos = base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let soma = 0;
      for (let i = 0; i < base.length; i++) soma += parseInt(base[i], 10) * pesos[i];
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
  }

  radiosTipo.forEach((radio) => radio.addEventListener("change", toggleTipoOutorgante));

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
      return Array.isArray(lista) ? lista : [];
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
        localStorage.setItem(CONCESSIONARIAS_STORAGE_KEY, JSON.stringify(salvas));
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

  function mostrarErro(mensagem) {
    formErro.textContent = mensagem;
    formErro.hidden = false;
    formErro.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function limparErro() {
    formErro.hidden = true;
    formErro.textContent = "";
  }

  function coletarDados() {
    const tipo = document.querySelector('input[name="tipoOutorgante"]:checked').value;
    const concessionaria = inputConcessionaria.value.trim();
    const cidade = document.getElementById("cidade").value.trim();
    const uf = document.getElementById("uf").value.trim().toUpperCase();

    const erros = [];
    if (!concessionaria) erros.push("Informe a concessionária.");
    if (!cidade) erros.push("Informe a cidade de assinatura.");
    if (!uf || uf.length !== 2) erros.push("Informe a UF de assinatura (2 letras).");

    let outorgante = null;

    if (tipo === "cpf") {
      const nome = document.getElementById("pf-nome").value.trim();
      const cpf = document.getElementById("pf-cpf").value.trim();
      const rg = document.getElementById("pf-rg").value.trim();
      const endereco = document.getElementById("pf-endereco").value.trim();
      if (!nome) erros.push("Informe o nome completo do outorgante.");
      if (!cpf) erros.push("Informe o CPF do outorgante.");
      else if (!validaCpf(cpf)) erros.push("O CPF do outorgante parece inválido. Confira os números.");
      if (!endereco) erros.push("Informe o endereço completo do outorgante.");
      outorgante = { tipo: "cpf", nome, cpf, rg, endereco };
    } else {
      const razaoSocial = document.getElementById("pj-razao").value.trim();
      const cnpj = document.getElementById("pj-cnpj").value.trim();
      const enderecoSede = document.getElementById("pj-endereco").value.trim();
      const repNome = document.getElementById("rep-nome").value.trim();
      const repCpf = document.getElementById("rep-cpf").value.trim();
      const repRg = document.getElementById("rep-rg").value.trim();
      if (!razaoSocial) erros.push("Informe a razão social.");
      if (!cnpj) erros.push("Informe o CNPJ.");
      else if (!validaCnpj(cnpj)) erros.push("O CNPJ parece inválido. Confira os números.");
      if (!enderecoSede) erros.push("Informe o endereço da sede.");
      if (!repNome) erros.push("Informe o nome do representante legal.");
      if (!repCpf) erros.push("Informe o CPF do representante legal.");
      else if (!validaCpf(repCpf)) erros.push("O CPF do representante parece inválido. Confira os números.");
      outorgante = { tipo: "cnpj", razaoSocial, cnpj, enderecoSede, repNome, repCpf, repRg };
    }

    return {
      erros,
      dados: {
        outorgante,
        concessionaria,
        cidade,
        uf,
      },
    };
  }

  function formatarDataHoje() {
    const hoje = new Date();
    return `${String(hoje.getDate()).padStart(2, "0")} de ${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  }

  function gerarPdf(dados) {
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

    const dataAssinatura = formatarDataHoje();
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

    const poderes2 = "Os poderes abrangem a assinatura do projeto elétrico, das documentações pertinentes ao projeto e do Termo de Responsabilidade Técnica (TRT), que se fizerem necessários perante o CFT, bem como dos demais documentos de habilitação e outros perante os órgãos competentes, inclusive os de infraestrutura, viação e obras públicas e meio ambiente, quando necessários e pertinentes aos serviços elétricos.";
    paragrafo(poderes2);
    novaLinha(10);

    const validade = "O procurador poderá assinar e encaminhar os documentos necessários pelo período de 01 (um) ano, contado da data da assinatura desta procuração.";
    paragrafo(validade);
    novaLinha(30);

    paragrafo(`${dados.cidade} - ${dados.uf}, ${dataAssinatura}.`);
    novaLinha(50);

    paragrafo("_________________________________________");
    novaLinha(2);
    if (dados.outorgante.tipo === "cpf") {
      paragrafo(dados.outorgante.nome, { bold: true });
    } else {
      paragrafo(dados.outorgante.repNome, { bold: true });
      paragrafo(`Representante de ${dados.outorgante.razaoSocial}`);
      paragrafo(`CNPJ: ${dados.outorgante.cnpj}`);
    }

    const nomeArquivoBase = dados.outorgante.tipo === "cpf" ? dados.outorgante.nome : dados.outorgante.razaoSocial;
    const nomeArquivo = `Procuracao_${nomeArquivoBase.replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`;

    return { doc, nomeArquivo };
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    limparErro();

    const { erros, dados } = coletarDados();
    if (erros.length > 0) {
      mostrarErro(erros.join(" "));
      return;
    }

    salvarNovaConcessionaria(dados.concessionaria);
    preencherListaConcessionarias();

    const { doc, nomeArquivo } = gerarPdf(dados);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    linkDownload.href = url;
    linkDownload.download = nomeArquivo;

    const textoWhatsapp = encodeURIComponent(
      `Olá! Gerei minha procuração (${nomeArquivo}). Já vou assinar e te envio em seguida.`
    );
    linkWhatsapp.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${textoWhatsapp}`;

    resultado.hidden = false;
    resultado.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  toggleTipoOutorgante();
  preencherListaConcessionarias();
})();
