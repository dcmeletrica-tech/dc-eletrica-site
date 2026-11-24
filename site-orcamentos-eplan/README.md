# OrçaEng — Orçamentos de Engenharia Elétrica

Aplicação web para montar, precificar e emitir orçamentos de projetos elétricos em EPLAN Electric P8 / Pro Panel
(macros 2D, páginas de diagrama, modelagem 3D, chaparia, BOM e revisões).

## Como rodar

O código-fonte fica em `app/`. O arquivo publicado (`index.html` na raiz desta pasta) é gerado pelo build.

```bash
cd app
npm install
npm run dev           # ambiente de desenvolvimento
npm test              # testes de cálculo, repositórios e PDF
npm run lint          # oxlint
npm run build         # build de produção em app/dist/
npm run build:single  # build + app/dist/single/index.html e ../index.html (arquivo único publicado)
```

## O que a aplicação faz

- **Estimativa rápida**: sliders e campos numéricos sincronizados para macros, páginas, 3D, dimensionamento e valor/hora.
- **Composição detalhada**: linhas de atividade com quantidade, unidade (min/h), tempo por unidade e valor/hora.
  Apenas o modo ativo compõe o resultado — não há dupla contagem.
- **Precificação**: custos adicionais diretos, reserva para imprevistos, tributos, margem sobre o preço de venda,
  desconto e preço manual negociado.
- **Cenários**: econômico, padrão e premium lado a lado, alterando apenas parâmetros comerciais.
- **Proposta em PDF**: preço global e escopo para o cliente; memória interna com horas, custos e composição do preço.
- **Backup**: exportação e importação em JSON, com validação de schema.

## Fórmulas

```
horas_macros   = qtd_macros × minutos_por_macro / 60
horas_paginas  = qtd_paginas × minutos_por_pagina / 60
horas_totais   = horas_macros + horas_paginas + horas_3d + horas_engenharia

base_tecnica   = horas_totais × valor_hora          (modo rápido)
base_tecnica   = Σ (horas_item × valor_hora_item)   (modo detalhado)
subtotal_base  = base_tecnica + custos_adicionais
reserva        = subtotal_base × reserva%
base_reserva   = subtotal_base + reserva
preco_sugerido = base_reserva / (1 − tributos% − margem%)
desconto       = preco_sugerido × desconto%
preco_final    = preco_sugerido − desconto          (ou preço manual)
```

A reserva de 15% cobre imprevistos e não é margem de lucro. A base técnica usa a taxa de venda por hora, não o
custo interno real; o saldo e a margem exibidos são indicadores de markup sobre a base de referência.

## Dados

Tudo fica no `localStorage` do navegador (`orcaeng.budgets.v1`, `orcaeng.settings.v1`), com versão de schema e
migração. Não há backend nem envio de dados para servidores.

## PDF

A geração de PDF é feita por um escritor próprio em `app/src/lib/pdf.ts` (PDF 1.4, Helvetica/WinAnsi, multi-página),
sem biblioteca externa e sem serviço online — necessário para manter o build em arquivo único abaixo do limite de
publicação.
