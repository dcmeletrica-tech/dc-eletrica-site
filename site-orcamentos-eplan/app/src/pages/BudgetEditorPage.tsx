import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Copy, FileDown, MessageCircle, Save, Trash2 } from "lucide-react";
import { useAppData } from "../app/store";
import { budgetRepository } from "../services/budgetRepository";
import { calculatePricing } from "../lib/pricing";
import { createBudget, DEFAULT_QUICK, PROJECT_PRESETS, SERVICE_TYPE_LABELS, STATUS_LABELS } from "../lib/defaults";
import { validateBudgetForDraft, validateBudgetForProposal } from "../lib/validation";
import { buildWhatsAppSummary, exportProposalPdf } from "../services/exportPdf";
import { Card, Field, NumberInput, SectionHeader, StatusBadge, Toast } from "../components/ui";
import QuickCalculator from "../components/pricing/QuickCalculator";
import DetailedItems from "../components/pricing/DetailedItems";
import PricingPanel from "../components/pricing/PricingPanel";
import ScenariosPanel from "../components/pricing/ScenariosPanel";
import SummaryCard from "../components/pricing/SummaryCard";
import ProposalPreview from "../components/pdf/ProposalPreview";
import type { Budget, BudgetStatus, CalculationMode, CommercialTerms, Customer, PricingParams, QuickEstimate, Scenario, ServiceType } from "../types/budget";

const TABS = [
  { key: "identificacao", label: "Identificação" },
  { key: "horas", label: "Horas" },
  { key: "precificacao", label: "Precificação" },
  { key: "cenarios", label: "Cenários" },
  { key: "comercial", label: "Condições" },
  { key: "exportar", label: "Exportar" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function BudgetEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { budgets, settings, saveBudget, duplicate, removeBudget } = useAppData();
  const existing = id ? budgets.find((budget) => budget.id === id) : undefined;

  const [budget, setBudget] = useState<Budget>(() => existing ?? createBudget(settings, budgets));
  const [tab, setTab] = useState<TabKey>("identificacao");
  const [toast, setToast] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const loadedId = useRef<string | null>(existing?.id ?? null);
  const lastSaved = useRef<string>(existing ? JSON.stringify(existing) : "");

  useEffect(() => {
    if (!id || id === loadedId.current) return;
    const found = budgetRepository.get(id);
    if (found) {
      setBudget(found);
      loadedId.current = found.id;
      lastSaved.current = JSON.stringify(found);
    }
  }, [id]);

  const result = useMemo(() => calculatePricing(budget), [budget]);
  const draftIssues = useMemo(() => validateBudgetForDraft(budget), [budget]);
  const proposalIssues = useMemo(() => validateBudgetForProposal(budget, result.precoFinal), [budget, result.precoFinal]);

  const hasContent =
    budget.customer.name.trim().length > 0 ||
    budget.projectName.trim().length > 0 ||
    budget.items.length > 0 ||
    budget.scope.trim().length > 0;

  useEffect(() => {
    if (!hasContent) return;
    const serialized = JSON.stringify(budget);
    if (serialized === lastSaved.current) return;
    const timer = setTimeout(() => {
      const saved = saveBudget(budget);
      lastSaved.current = JSON.stringify(saved);
      loadedId.current = saved.id;
      if (!id) navigate(`/orcamentos/${saved.id}`, { replace: true });
    }, 1200);
    return () => clearTimeout(timer);
  }, [budget, hasContent, id, navigate, saveBudget]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const patch = (changes: Partial<Budget>) => setBudget((current) => ({ ...current, ...changes }));
  const patchCustomer = (changes: Partial<Customer>) =>
    setBudget((current) => ({ ...current, customer: { ...current.customer, ...changes } }));
  const patchTerms = (changes: Partial<CommercialTerms>) =>
    setBudget((current) => ({ ...current, terms: { ...current.terms, ...changes } }));
  const patchPricing = (changes: Partial<PricingParams>) =>
    setBudget((current) => ({ ...current, pricing: { ...current.pricing, ...changes } }));
  const patchQuick = (changes: Partial<QuickEstimate>) =>
    setBudget((current) => ({ ...current, quick: { ...current.quick, ...changes } }));

  const handleSave = () => {
    const saved = saveBudget(budget);
    lastSaved.current = JSON.stringify(saved);
    loadedId.current = saved.id;
    if (!id) navigate(`/orcamentos/${saved.id}`, { replace: true });
    setToast("Orçamento salvo");
  };

  const handleConvert = () => {
    const quick = budget.quick;
    const items = [...budget.items];
    const make = (category: string, description: string, quantity: number, unit: "min" | "h", time: number) => ({
      id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      category,
      description,
      quantity,
      unit,
      timePerUnit: time,
      hourlyRate: quick.hourlyRate,
      notes: "",
    });
    if (quick.macrosQty > 0) items.push(make("Macros 2D EPLAN", "Macros novas", quick.macrosQty, "min", quick.minutesPerMacro));
    if (quick.pagesQty > 0)
      items.push(make("Páginas de diagrama elétrico", "Páginas para desenvolver", quick.pagesQty, "min", quick.minutesPerPage));
    if (quick.hours3d > 0) items.push(make("Macros e dispositivos 3D", "Modelagem 3D", 1, "h", quick.hours3d));
    if (quick.hoursEngineering > 0)
      items.push(make("Dimensionamento elétrico e memorial", "Dimensionamentos e revisões", 1, "h", quick.hoursEngineering));
    patch({ items, mode: "detalhado" });
    setToast("Estimativa convertida em linhas de atividade");
  };

  const applyPreset = (presetId: string) => {
    const preset = PROJECT_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    if (!window.confirm(`Aplicar o modelo "${preset.name}"? As horas e linhas atuais serão substituídas.`)) return;
    patch({
      serviceType: preset.serviceType,
      quick: { ...preset.quick, hourlyRate: budget.quick.hourlyRate },
      items: preset.items.map((item, index) => ({
        ...item,
        id: `item-${Date.now().toString(36)}-${index}`,
        hourlyRate: item.hourlyRate || budget.quick.hourlyRate,
      })),
      mode: preset.items.length > 0 ? "detalhado" : "rapido",
    });
    setToast(`Modelo ${preset.name} aplicado`);
  };

  const applyScenario = (scenario: Scenario) => {
    setBudget((current) => ({
      ...current,
      pricing: { ...scenario.pricing },
      selectedScenarioId: scenario.id,
      scenarios: current.scenarios.length > 0 ? current.scenarios : [],
    }));
    setToast(`Cenário ${scenario.name} aplicado ao preço oficial`);
  };

  const copyWhatsApp = async () => {
    const text = buildWhatsAppSummary(budget, settings);
    try {
      await navigator.clipboard.writeText(text);
      setToast("Resumo copiado para a área de transferência");
    } catch {
      setToast("Não foi possível copiar automaticamente");
    }
  };

  if (id && !existing && !loadedId.current) {
    return (
      <Card className="p-8 text-center">
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Orçamento não encontrado</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ele pode ter sido excluído deste navegador.</p>
        <Link to="/orcamentos" className="btn-primary mt-4">
          Voltar para a lista
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            {existing ? "Editar orçamento" : "Novo orçamento"}
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {budget.number}
            <StatusBadge status={budget.status} />
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {budget.customer.name || "Cliente não informado"} • {budget.projectName || "Projeto não informado"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={copyWhatsApp}>
            <MessageCircle size={15} /> WhatsApp
          </button>
          <button type="button" className="btn-secondary" onClick={() => setPreviewOpen(true)}>
            <FileDown size={15} /> PDF
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            <Save size={15} /> Salvar
          </button>
        </div>
      </header>

      <div className="xl:hidden">
        <SummaryCard result={result} issues={draftIssues} compact />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="no-print flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            {TABS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setTab(entry.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  tab === entry.key
                    ? "bg-brand-900 text-white dark:bg-brand-600"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {tab === "identificacao" ? (
            <Card>
              <SectionHeader title="Identificação do projeto" description="Dados do cliente, projeto e escopo" />
              <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
                <Field label="Cliente" htmlFor="customer-name">
                  <input
                    id="customer-name"
                    className="input"
                    value={budget.customer.name}
                    onChange={(event) => patchCustomer({ name: event.target.value })}
                    placeholder="Nome do cliente"
                  />
                </Field>
                <Field label="Empresa" htmlFor="customer-company">
                  <input
                    id="customer-company"
                    className="input"
                    value={budget.customer.company}
                    onChange={(event) => patchCustomer({ company: event.target.value })}
                    placeholder="Empresa contratante"
                  />
                </Field>
                <Field label="Contato" htmlFor="customer-contact">
                  <input
                    id="customer-contact"
                    className="input"
                    value={budget.customer.contact}
                    onChange={(event) => patchCustomer({ contact: event.target.value })}
                    placeholder="Pessoa de contato"
                  />
                </Field>
                <Field label="Telefone" htmlFor="customer-phone">
                  <input
                    id="customer-phone"
                    className="input"
                    value={budget.customer.phone}
                    onChange={(event) => patchCustomer({ phone: event.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </Field>
                <Field label="E-mail" htmlFor="customer-email">
                  <input
                    id="customer-email"
                    className="input"
                    value={budget.customer.email}
                    onChange={(event) => patchCustomer({ email: event.target.value })}
                    placeholder="contato@empresa.com.br"
                  />
                </Field>
                <Field label="Nome do projeto" htmlFor="project-name">
                  <input
                    id="project-name"
                    className="input"
                    value={budget.projectName}
                    onChange={(event) => patch({ projectName: event.target.value })}
                    placeholder="Ex.: Adequação de inversores"
                  />
                </Field>
                <Field label="Código do projeto (contratante)" htmlFor="project-code">
                  <input
                    id="project-code"
                    className="input"
                    value={budget.projectCode}
                    onChange={(event) => patch({ projectCode: event.target.value })}
                    placeholder="PE946906 – REQ30965"
                  />
                </Field>
                <Field label="Tipo de serviço" htmlFor="service-type">
                  <select
                    id="service-type"
                    className="input"
                    value={budget.serviceType}
                    onChange={(event) => patch({ serviceType: event.target.value as ServiceType })}
                  >
                    {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Situação" htmlFor="status">
                  <select
                    id="status"
                    className="input"
                    value={budget.status}
                    onChange={(event) => patch({ status: event.target.value as BudgetStatus })}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Modelo rápido de projeto" htmlFor="preset" hint="Ponto de partida editável, não é escopo confirmado">
                  <select
                    id="preset"
                    className="input"
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) applyPreset(event.target.value);
                      event.target.value = "";
                    }}
                  >
                    <option value="">Selecionar modelo…</option>
                    {PROJECT_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Escopo do serviço" htmlFor="scope" className="sm:col-span-2">
                  <textarea
                    id="scope"
                    className="input min-h-[90px]"
                    value={budget.scope}
                    onChange={(event) => patch({ scope: event.target.value })}
                    placeholder="Descreva o objetivo e o escopo do serviço"
                  />
                </Field>
              </div>
            </Card>
          ) : null}

          {tab === "horas" ? (
            <>
              <Card>
                <SectionHeader
                  title="Estimativa rápida"
                  description="Sliders e campos numéricos sincronizados — digite valores precisos quando precisar"
                />
                <QuickCalculator
                  quick={budget.quick}
                  onChange={patchQuick}
                  mode={budget.mode}
                  onModeChange={(mode: CalculationMode) => patch({ mode })}
                  hours={result.hours}
                  onReset={() => patchQuick({ ...DEFAULT_QUICK, hourlyRate: budget.quick.hourlyRate })}
                />
              </Card>
              <Card>
                <SectionHeader
                  title="Composição detalhada de atividades"
                  description="Somente o modo ativo compõe o resultado — sem dupla contagem"
                />
                <DetailedItems
                  items={budget.items}
                  onChange={(items) => patch({ items })}
                  categories={settings.categories}
                  defaultRate={budget.quick.hourlyRate}
                  mode={budget.mode}
                  quick={budget.quick}
                  onConvert={handleConvert}
                />
              </Card>
            </>
          ) : null}

          {tab === "precificacao" ? (
            <Card>
              <SectionHeader title="Precificação" description="Custos, reserva, tributos, margem e desconto" />
              <PricingPanel
                pricing={budget.pricing}
                onChange={patchPricing}
                costs={budget.directCosts}
                onCostsChange={(directCosts) => patch({ directCosts })}
                result={result}
              />
            </Card>
          ) : null}

          {tab === "cenarios" ? (
            <Card>
              <SectionHeader title="Cenários comerciais" description="Compare econômico, padrão e premium lado a lado" />
              <ScenariosPanel budget={budget} onApply={applyScenario} />
            </Card>
          ) : null}

          {tab === "comercial" ? (
            <Card>
              <SectionHeader title="Condições comerciais" description="Prazo, pagamento, validade e premissas" />
              <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
                <Field label="Prazo de execução" htmlFor="delivery-term">
                  <input
                    id="delivery-term"
                    className="input"
                    value={budget.terms.deliveryTerm}
                    onChange={(event) => patchTerms({ deliveryTerm: event.target.value })}
                  />
                </Field>
                <Field label="Condições de pagamento" htmlFor="payment-terms">
                  <input
                    id="payment-terms"
                    className="input"
                    value={budget.terms.paymentTerms}
                    onChange={(event) => patchTerms({ paymentTerms: event.target.value })}
                  />
                </Field>
                <Field label="Validade da proposta (dias)" htmlFor="validity">
                  <NumberInput
                    id="validity"
                    value={budget.terms.validityDays}
                    onChange={(value) => patchTerms({ validityDays: value })}
                    step={1}
                    suffix="dias"
                  />
                </Field>
                <Field label="Revisões incluídas" htmlFor="revisions">
                  <NumberInput
                    id="revisions"
                    value={budget.terms.revisionsIncluded}
                    onChange={(value) => patchTerms({ revisionsIncluded: value })}
                    step={1}
                  />
                </Field>
                <Field label="Inclusões" htmlFor="inclusions" className="sm:col-span-2">
                  <textarea
                    id="inclusions"
                    className="input min-h-[80px]"
                    value={budget.terms.inclusions}
                    onChange={(event) => patchTerms({ inclusions: event.target.value })}
                  />
                </Field>
                <Field label="Exclusões" htmlFor="exclusions" className="sm:col-span-2">
                  <textarea
                    id="exclusions"
                    className="input min-h-[80px]"
                    value={budget.terms.exclusions}
                    onChange={(event) => patchTerms({ exclusions: event.target.value })}
                  />
                </Field>
                <Field label="Premissas e dependências" htmlFor="assumptions" className="sm:col-span-2">
                  <textarea
                    id="assumptions"
                    className="input min-h-[80px]"
                    value={budget.terms.assumptions}
                    onChange={(event) => patchTerms({ assumptions: event.target.value })}
                  />
                </Field>
                <Field label="Observações" htmlFor="notes" className="sm:col-span-2">
                  <textarea
                    id="notes"
                    className="input min-h-[70px]"
                    value={budget.terms.notes}
                    onChange={(event) => patchTerms({ notes: event.target.value })}
                  />
                </Field>
              </div>
            </Card>
          ) : null}

          {tab === "exportar" ? (
            <Card>
              <SectionHeader title="Visualização e exportação" description="Proposta do cliente e memória interna" />
              <div className="space-y-3 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary" onClick={() => setPreviewOpen(true)}>
                    <FileDown size={15} /> Visualizar e exportar PDF
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => exportProposalPdf(budget, settings)}>
                    <FileDown size={15} /> PDF rápido do cliente
                  </button>
                  <button type="button" className="btn-secondary" onClick={copyWhatsApp}>
                    <MessageCircle size={15} /> Copiar resumo para WhatsApp
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const copy = duplicate(budget.id);
                      if (copy) navigate(`/orcamentos/${copy.id}`);
                    }}
                    disabled={!existing}
                  >
                    <Copy size={15} /> Duplicar orçamento
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={!existing}
                    onClick={() => {
                      if (!existing) return;
                      if (window.confirm(`Excluir o orçamento ${budget.number}?`)) {
                        removeBudget(budget.id);
                        navigate("/orcamentos");
                      }
                    }}
                  >
                    <Trash2 size={15} /> Excluir
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  O PDF do cliente mostra o preço global e o escopo. A memória interna mostra horas, custos, fórmulas e
                  parâmetros usados.
                </p>
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="hidden xl:block">
          <SummaryCard result={result} issues={draftIssues} />
        </aside>
      </div>

      <ProposalPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        budget={budget}
        settings={settings}
        issues={proposalIssues}
      />
      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}
