import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, ImageUp, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { useAppData } from "../app/store";
import { settingsSchema } from "../lib/validation";
import { DEFAULT_SETTINGS } from "../lib/defaults";
import { Card, Field, SectionHeader, Toast } from "../components/ui";
import { exportBackup, parseBackup } from "../services/dataBackup";
import type { BudgetSettings } from "../types/budget";

export default function SettingsPage() {
  const { settings, budgets, saveSettings, replaceAll, clearAll } = useAppData();
  const [toast, setToast] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<BudgetSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  const logo = watch("company.logoDataUrl");
  const categories = watch("categories");
  const onSubmit = (values: BudgetSettings) => {
    saveSettings(values);
    reset(values);
    setToast("Configurações salvas");
  };

  const handleLogo = (file: File) => {
    if (file.size > 300_000) {
      setToast("Logo muito grande (máx. 300 KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setValue("company.logoDataUrl", String(reader.result ?? ""), { shouldDirty: true });
    reader.readAsDataURL(file);
  };

  const handleImport = async (file: File) => {
    const parsed = parseBackup(await file.text());
    if (!parsed.ok || !parsed.data) {
      setToast(parsed.error ?? "Falha ao importar");
      return;
    }
    if (!window.confirm(`Substituir os dados atuais por ${parsed.data.budgets.length} orçamento(s) do backup?`)) return;
    replaceAll(parsed.data.budgets, parsed.data.settings);
    reset(parsed.data.settings);
    setToast("Backup restaurado");
  };

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">Preferências</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dados da empresa, parâmetros padrão e backup local.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <SectionHeader title="Dados da empresa" description="Aparecem no cabeçalho das propostas em PDF" />
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
            <Field label="Nome / razão social" error={errors.company?.name?.message}>
              <input className="input" {...register("company.name")} placeholder="DC Elétrica" />
            </Field>
            <Field label="CNPJ / CPF">
              <input className="input" {...register("company.document")} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Telefone">
              <input className="input" {...register("company.phone")} placeholder="(00) 00000-0000" />
            </Field>
            <Field label="E-mail">
              <input className="input" {...register("company.email")} placeholder="contato@empresa.com.br" />
            </Field>
            <Field label="Endereço" className="sm:col-span-2">
              <input className="input" {...register("company.address")} placeholder="Rua, número, cidade/UF" />
            </Field>
            <div className="sm:col-span-2">
              <p className="label">Logo</p>
              <div className="flex flex-wrap items-center gap-3">
                {logo ? (
                  <img src={logo} alt="Logo da empresa" className="h-14 w-14 rounded-xl border border-slate-200 object-contain p-1 dark:border-slate-700" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">
                    sem logo
                  </div>
                )}
                <button type="button" className="btn-secondary" onClick={() => logoRef.current?.click()}>
                  <ImageUp size={15} /> Enviar imagem
                </button>
                {logo ? (
                  <button type="button" className="btn-ghost text-red-600" onClick={() => setValue("company.logoDataUrl", "", { shouldDirty: true })}>
                    Remover
                  </button>
                ) : null}
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleLogo(file);
                    event.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Parâmetros padrão" description="Aplicados a cada novo orçamento" />
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3 sm:px-5">
            <Field label="Valor da hora técnica (R$)" error={errors.defaults?.hourlyRate?.message}>
              <input type="number" min={0} step={5} className="input" {...register("defaults.hourlyRate", { valueAsNumber: true })} />
            </Field>
            <Field label="Reserva (%)" error={errors.defaults?.reservePercent?.message}>
              <input type="number" min={0} max={100} step={1} className="input" {...register("defaults.reservePercent", { valueAsNumber: true })} />
            </Field>
            <Field label="Tributos (%)" error={errors.defaults?.taxPercent?.message}>
              <input type="number" min={0} max={100} step={0.5} className="input" {...register("defaults.taxPercent", { valueAsNumber: true })} />
            </Field>
            <Field label="Margem desejada (%)" error={errors.defaults?.marginPercent?.message}>
              <input type="number" min={0} max={100} step={1} className="input" {...register("defaults.marginPercent", { valueAsNumber: true })} />
            </Field>
            <Field label="Desconto padrão (%)" error={errors.defaults?.discountPercent?.message}>
              <input type="number" min={0} max={100} step={1} className="input" {...register("defaults.discountPercent", { valueAsNumber: true })} />
            </Field>
            <Field label="Validade da proposta (dias)" error={errors.defaults?.validityDays?.message}>
              <input type="number" min={0} step={1} className="input" {...register("defaults.validityDays", { valueAsNumber: true })} />
            </Field>
            <Field label="Condições de pagamento" className="sm:col-span-2">
              <input className="input" {...register("defaults.paymentTerms")} />
            </Field>
            <Field label="Prazo de execução">
              <input className="input" {...register("defaults.deliveryTerm")} />
            </Field>
            <Field label="Observações padrão" className="sm:col-span-2 lg:col-span-3">
              <textarea className="input min-h-[70px]" {...register("defaults.notes")} />
            </Field>
            <Field label="Rodapé das propostas" className="sm:col-span-2 lg:col-span-3">
              <input className="input" {...register("defaults.footer")} />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Numeração e categorias" description="Prefixo do código e categorias de atividade" />
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
            <Field label="Prefixo da numeração" error={errors.numberPrefix?.message} hint="Ex.: ORC gera ORC-2026-001">
              <input className="input" {...register("numberPrefix")} />
            </Field>
            <Field label="Tema">
              <select className="input" {...register("theme")}>
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <p className="label">Categorias de atividade</p>
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <div key={`${category}-${index}`} className="flex gap-2">
                    <input
                      className="input"
                      value={category}
                      onChange={(event) =>
                        setValue(
                          "categories",
                          categories.map((entry, entryIndex) => (entryIndex === index ? event.target.value : entry)),
                          { shouldDirty: true },
                        )
                      }
                    />
                    <button
                      type="button"
                      className="btn-ghost p-2 text-red-600"
                      onClick={() =>
                        setValue(
                          "categories",
                          categories.filter((_, entryIndex) => entryIndex !== index),
                          { shouldDirty: true },
                        )
                      }
                      aria-label="Remover categoria"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-secondary mt-2"
                onClick={() => setValue("categories", [...categories, "Nova categoria"], { shouldDirty: true })}
              >
                <Plus size={15} /> Adicionar categoria
              </button>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isDirty ? "Alterações não salvas." : "Tudo salvo."}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => reset(settings)} disabled={!isDirty}>
              Descartar
            </button>
            <button type="submit" className="btn-primary">
              <Save size={15} /> Salvar configurações
            </button>
          </div>
        </div>
      </form>

      <Card>
        <SectionHeader title="Backup e dados" description="Os dados ficam apenas neste navegador" />
        <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
          <button type="button" className="btn-secondary" onClick={() => exportBackup(settings, budgets)}>
            <Download size={15} /> Exportar backup
          </button>
          <button type="button" className="btn-secondary" onClick={() => backupRef.current?.click()}>
            <Upload size={15} /> Importar backup
          </button>
          <input
            ref={backupRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (!window.confirm("Restaurar os parâmetros padrão de fábrica? Os orçamentos não serão apagados.")) return;
              reset(structuredClone(DEFAULT_SETTINGS));
              saveSettings(structuredClone(DEFAULT_SETTINGS));
              setToast("Parâmetros padrão restaurados");
            }}
          >
            <RotateCcw size={15} /> Padrões de fábrica
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (!window.confirm("Apagar TODOS os orçamentos e configurações deste navegador? Esta ação não pode ser desfeita.")) return;
              clearAll();
              reset(structuredClone(DEFAULT_SETTINGS));
              setToast("Todos os dados foram apagados");
            }}
          >
            <Trash2 size={15} /> Apagar todos os dados
          </button>
        </div>
      </Card>

      {toast ? <Toast message={toast} tone={toast.includes("grande") || toast.includes("Falha") || toast.includes("inválido") ? "error" : "success"} /> : null}
    </div>
  );
}
