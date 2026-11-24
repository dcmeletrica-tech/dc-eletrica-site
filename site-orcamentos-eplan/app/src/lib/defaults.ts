import type {
  Budget,
  BudgetItem,
  BudgetSettings,
  BudgetStatus,
  CommercialTerms,
  PricingParams,
  QuickEstimate,
  ServiceType,
} from "../types/budget";
import { BRAND_SIMBOLO } from "../assets/brand";

export const SCHEMA_VERSION = 1;

export const CATEGORIES = [
  "Análise do projeto-base",
  "Macros 2D EPLAN",
  "Macros e dispositivos 3D",
  "Páginas de diagrama elétrico",
  "Adequação de páginas existentes",
  "Layout mecânico e Pro Panel",
  "Chaparia, barramentos, policarbonato e suportes",
  "Dimensionamento elétrico e memorial",
  "Lista de materiais (BOM)",
  "Documentação, datasheets e checklist",
  "Revisão Alphatek",
  "Revisão cliente",
  "Validação, conferência final e entrega",
  "Reuniões e alinhamentos",
  "Deslocamento/visita técnica",
  "Outros",
];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  adequacao: "Adequação de projeto",
  "painel-novo": "Projeto novo de painel",
  qgbt: "QGBT",
  acionamentos: "Painel de acionamentos",
  automacao: "Automação/CLP",
  outro: "Outro",
};

export const STATUS_LABELS: Record<BudgetStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export const STATUS_ORDER: BudgetStatus[] = ["rascunho", "enviado", "aprovado", "recusado"];

export const DEFAULT_QUICK: QuickEstimate = {
  macrosQty: 3,
  minutesPerMacro: 30,
  pagesQty: 35,
  minutesPerPage: 10,
  hours3d: 2,
  hoursEngineering: 3,
  hourlyRate: 200,
};

export const DEFAULT_PRICING: PricingParams = {
  reservePercent: 15,
  taxPercent: 0,
  marginPercent: 0,
  discountPercent: 0,
  manualPriceEnabled: false,
  manualPrice: 0,
};

export const DEFAULT_TERMS: CommercialTerms = {
  paymentTerms: "50% na aprovação da proposta e 50% na entrega dos arquivos finais.",
  deliveryTerm: "Prazo a confirmar após o recebimento completo dos dados do projeto.",
  validityDays: 15,
  revisionsIncluded: 2,
  inclusions:
    "Desenvolvimento dos diagramas elétricos em EPLAN Electric P8, modelagem 3D em EPLAN Pro Panel, lista de materiais e revisões inclusas.",
  exclusions:
    "Fornecimento de materiais, mão de obra de montagem, ART, taxas de concessionária e alterações de escopo não previstas.",
  assumptions:
    "O prazo é condicionado ao recebimento dos dados do projeto, lista de materiais definida e aprovação das etapas anteriores.",
  notes: "Alterações de escopo serão reorçadas antes da execução.",
};

export const DEFAULT_SETTINGS: BudgetSettings = {
  schemaVersion: SCHEMA_VERSION,
  company: {
    name: "DC Elétrica",
    document: "",
    phone: "",
    email: "",
    address: "",
    logoDataUrl: BRAND_SIMBOLO,
  },
  defaults: {
    hourlyRate: 200,
    reservePercent: 15,
    taxPercent: 0,
    marginPercent: 0,
    discountPercent: 0,
    validityDays: 15,
    paymentTerms: DEFAULT_TERMS.paymentTerms,
    deliveryTerm: DEFAULT_TERMS.deliveryTerm,
    notes: DEFAULT_TERMS.notes,
    footer: "OrçaEng — orçamentos de engenharia elétrica.",
  },
  numberPrefix: "ORC",
  categories: CATEGORIES,
  theme: "light",
};

export function createId(prefix = "id"): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}

export function emptyItem(hourlyRate: number, category = CATEGORIES[0]): BudgetItem {
  return {
    id: createId("item"),
    category,
    description: "",
    quantity: 1,
    unit: "h",
    timePerUnit: 1,
    hourlyRate,
    notes: "",
  };
}

export function nextBudgetNumber(existing: Budget[], prefix: string): string {
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-${year}-(\\d+)$`);
  let max = 0;
  for (const budget of existing) {
    const match = pattern.exec(budget.number);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
}

export function createBudget(settings: BudgetSettings, existing: Budget[]): Budget {
  const now = new Date().toISOString();
  const defaults = settings.defaults;
  return {
    id: createId("orc"),
    number: nextBudgetNumber(existing, settings.numberPrefix),
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    status: "rascunho",
    serviceType: "adequacao",
    customer: { name: "", company: "", contact: "", phone: "", email: "" },
    projectName: "",
    projectCode: "",
    scope: "",
    mode: "rapido",
    quick: { ...DEFAULT_QUICK, hourlyRate: defaults.hourlyRate },
    items: [],
    directCosts: [],
    pricing: {
      reservePercent: defaults.reservePercent,
      taxPercent: defaults.taxPercent,
      marginPercent: defaults.marginPercent,
      discountPercent: defaults.discountPercent,
      manualPriceEnabled: false,
      manualPrice: 0,
    },
    terms: {
      ...DEFAULT_TERMS,
      validityDays: defaults.validityDays,
      paymentTerms: defaults.paymentTerms,
      deliveryTerm: defaults.deliveryTerm,
      notes: defaults.notes,
    },
    scenarios: [],
    selectedScenarioId: null,
    snapshot: {
      hourlyRate: defaults.hourlyRate,
      reservePercent: defaults.reservePercent,
      taxPercent: defaults.taxPercent,
      marginPercent: defaults.marginPercent,
      discountPercent: defaults.discountPercent,
      validityDays: defaults.validityDays,
      capturedAt: now,
    },
  };
}

export interface ProjectPreset {
  id: string;
  name: string;
  description: string;
  serviceType: ServiceType;
  quick: QuickEstimate;
  items: Omit<BudgetItem, "id">[];
}

export const PROJECT_PRESETS: ProjectPreset[] = [
  {
    id: "preset-a",
    name: "A — Adequação de inversores em projeto existente",
    description:
      "Análise do projeto-base, macro do novo inversor, alteração de páginas existentes, conferência de potência/comando/proteções, rede Profinet, modelo 3D, BOM e revisão.",
    serviceType: "adequacao",
    quick: {
      macrosQty: 2,
      minutesPerMacro: 30,
      pagesQty: 12,
      minutesPerPage: 10,
      hours3d: 2,
      hoursEngineering: 4,
      hourlyRate: 200,
    },
    items: [
      { category: "Análise do projeto-base", description: "Análise do projeto-base e levantamento das páginas afetadas", quantity: 1, unit: "h", timePerUnit: 2, hourlyRate: 200, notes: "" },
      { category: "Macros 2D EPLAN", description: "Macro do novo inversor", quantity: 2, unit: "min", timePerUnit: 30, hourlyRate: 200, notes: "" },
      { category: "Adequação de páginas existentes", description: "Alteração de páginas existentes", quantity: 12, unit: "min", timePerUnit: 10, hourlyRate: 200, notes: "" },
      { category: "Dimensionamento elétrico e memorial", description: "Conferência de potência, comando, proteções e rede Profinet", quantity: 1, unit: "h", timePerUnit: 2, hourlyRate: 200, notes: "" },
      { category: "Macros e dispositivos 3D", description: "Modelo 3D do inversor", quantity: 1, unit: "h", timePerUnit: 2, hourlyRate: 200, notes: "" },
      { category: "Lista de materiais (BOM)", description: "Atualização da lista de materiais", quantity: 1, unit: "h", timePerUnit: 1, hourlyRate: 200, notes: "" },
      { category: "Revisão cliente", description: "Revisão e entrega", quantity: 1, unit: "h", timePerUnit: 1, hourlyRate: 200, notes: "" },
    ],
  },
  {
    id: "preset-b",
    name: "B — Painel para bombas com inversor + CLP",
    description:
      "Diagramas de força e comando, seleção de bombas, CLP/I-O, instrumentos, cálculos de proteções, layout Pro Panel, chaparia, BOM e revisões.",
    serviceType: "automacao",
    quick: {
      macrosQty: 4,
      minutesPerMacro: 30,
      pagesQty: 25,
      minutesPerPage: 12,
      hours3d: 6,
      hoursEngineering: 8,
      hourlyRate: 200,
    },
    items: [
      { category: "Análise do projeto-base", description: "Análise de requisitos e dados de processo", quantity: 1, unit: "h", timePerUnit: 3, hourlyRate: 200, notes: "" },
      { category: "Páginas de diagrama elétrico", description: "Diagramas de força e comando", quantity: 25, unit: "min", timePerUnit: 12, hourlyRate: 200, notes: "" },
      { category: "Macros 2D EPLAN", description: "Macros de inversores, CLP e instrumentos", quantity: 4, unit: "min", timePerUnit: 30, hourlyRate: 200, notes: "" },
      { category: "Dimensionamento elétrico e memorial", description: "Seleção de bombas, CLP/I-O, proteções e painel", quantity: 1, unit: "h", timePerUnit: 5, hourlyRate: 200, notes: "" },
      { category: "Layout mecânico e Pro Panel", description: "Layout do painel em Pro Panel", quantity: 1, unit: "h", timePerUnit: 4, hourlyRate: 200, notes: "" },
      { category: "Chaparia, barramentos, policarbonato e suportes", description: "Detalhamento de chaparia e barramentos", quantity: 1, unit: "h", timePerUnit: 2, hourlyRate: 200, notes: "" },
      { category: "Lista de materiais (BOM)", description: "Lista de materiais completa", quantity: 1, unit: "h", timePerUnit: 2, hourlyRate: 200, notes: "" },
      { category: "Revisão Alphatek", description: "Revisão interna Alphatek", quantity: 1, unit: "h", timePerUnit: 2, hourlyRate: 200, notes: "" },
      { category: "Revisão cliente", description: "Revisão com o cliente", quantity: 1, unit: "h", timePerUnit: 2, hourlyRate: 200, notes: "" },
    ],
  },
  {
    id: "preset-c",
    name: "C — QGBT e painel de acionamentos",
    description:
      "Alimentadores, partidas, barramentos, proteção e coordenação, memoriais, EPLAN, 3D, chaparia, detalhes de fabricação, BOM, checklist e revisões.",
    serviceType: "qgbt",
    quick: {
      macrosQty: 5,
      minutesPerMacro: 30,
      pagesQty: 40,
      minutesPerPage: 12,
      hours3d: 8,
      hoursEngineering: 12,
      hourlyRate: 200,
    },
    items: [
      { category: "Análise do projeto-base", description: "Análise de dados de carga e alimentação", quantity: 1, unit: "h", timePerUnit: 4, hourlyRate: 200, notes: "" },
      { category: "Páginas de diagrama elétrico", description: "Alimentadores, partidas e comando", quantity: 40, unit: "min", timePerUnit: 12, hourlyRate: 200, notes: "" },
      { category: "Dimensionamento elétrico e memorial", description: "Proteção, coordenação e memorial de cálculo", quantity: 1, unit: "h", timePerUnit: 8, hourlyRate: 200, notes: "" },
      { category: "Layout mecânico e Pro Panel", description: "Layout 3D do QGBT", quantity: 1, unit: "h", timePerUnit: 6, hourlyRate: 200, notes: "" },
      { category: "Chaparia, barramentos, policarbonato e suportes", description: "Barramentos e detalhes de fabricação", quantity: 1, unit: "h", timePerUnit: 4, hourlyRate: 200, notes: "" },
      { category: "Lista de materiais (BOM)", description: "BOM e checklist de montagem", quantity: 1, unit: "h", timePerUnit: 3, hourlyRate: 200, notes: "" },
      { category: "Revisão Alphatek", description: "Revisão interna", quantity: 1, unit: "h", timePerUnit: 2, hourlyRate: 200, notes: "" },
      { category: "Revisão cliente", description: "Revisão com o cliente", quantity: 1, unit: "h", timePerUnit: 2, hourlyRate: 200, notes: "" },
    ],
  },
  {
    id: "preset-d",
    name: "D — Projeto EPLAN do zero",
    description: "Campos livres para macros, páginas, dimensionamento e 3D. Ajuste as quantidades ao escopo real.",
    serviceType: "painel-novo",
    quick: {
      macrosQty: 0,
      minutesPerMacro: 30,
      pagesQty: 0,
      minutesPerPage: 10,
      hours3d: 0,
      hoursEngineering: 0,
      hourlyRate: 200,
    },
    items: [],
  },
];
