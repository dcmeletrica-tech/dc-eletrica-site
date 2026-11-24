export type BudgetStatus = "rascunho" | "enviado" | "aprovado" | "recusado";

export type ServiceType =
  | "adequacao"
  | "painel-novo"
  | "qgbt"
  | "acionamentos"
  | "automacao"
  | "outro";

export type CalculationMode = "rapido" | "detalhado";

export type TimeUnit = "min" | "h";

export interface Customer {
  name: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
}

export interface QuickEstimate {
  macrosQty: number;
  minutesPerMacro: number;
  pagesQty: number;
  minutesPerPage: number;
  hours3d: number;
  hoursEngineering: number;
  hourlyRate: number;
}

export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: TimeUnit;
  timePerUnit: number;
  hourlyRate: number;
  notes: string;
}

export interface DirectCost {
  id: string;
  description: string;
  amount: number;
}

export interface PricingParams {
  reservePercent: number;
  taxPercent: number;
  marginPercent: number;
  discountPercent: number;
  manualPriceEnabled: boolean;
  manualPrice: number;
}

export interface CommercialTerms {
  paymentTerms: string;
  deliveryTerm: string;
  validityDays: number;
  revisionsIncluded: number;
  inclusions: string;
  exclusions: string;
  assumptions: string;
  notes: string;
}

export interface BudgetSnapshot {
  hourlyRate: number;
  reservePercent: number;
  taxPercent: number;
  marginPercent: number;
  discountPercent: number;
  validityDays: number;
  capturedAt: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  pricing: PricingParams;
}

export interface Budget {
  id: string;
  number: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  status: BudgetStatus;
  serviceType: ServiceType;
  customer: Customer;
  projectName: string;
  projectCode: string;
  scope: string;
  mode: CalculationMode;
  quick: QuickEstimate;
  items: BudgetItem[];
  directCosts: DirectCost[];
  pricing: PricingParams;
  terms: CommercialTerms;
  scenarios: Scenario[];
  selectedScenarioId: string | null;
  snapshot: BudgetSnapshot;
}

export interface CompanyProfile {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  logoDataUrl: string;
}

export interface SettingsDefaults {
  hourlyRate: number;
  reservePercent: number;
  taxPercent: number;
  marginPercent: number;
  discountPercent: number;
  validityDays: number;
  paymentTerms: string;
  deliveryTerm: string;
  notes: string;
  footer: string;
}

export interface BudgetSettings {
  schemaVersion: number;
  company: CompanyProfile;
  defaults: SettingsDefaults;
  numberPrefix: string;
  categories: string[];
  theme: "light" | "dark";
}

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  settings: BudgetSettings;
  budgets: Budget[];
}
