import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Calculator, FileText, LayoutDashboard, Menu, Moon, Settings, Sun, X } from "lucide-react";
import { useAppData } from "../../app/store";
import { BRAND_NAME, BRAND_SIMBOLO } from "../../assets/brand";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/orcamentos/novo", label: "Novo orçamento", icon: Calculator },
  { to: "/orcamentos", label: "Meus orçamentos", icon: FileText, end: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { settings, saveSettings } = useAppData();
  const location = useLocation();

  const toggleTheme = () => {
    saveSettings({ ...settings, theme: settings.theme === "dark" ? "light" : "dark" });
  };

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-brand-900 text-white dark:bg-brand-600"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
          >
            <Icon size={18} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
        <Brand />
        <div className="mt-6 flex-1">{nav}</div>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-200">{settings.company.name || "Sua empresa"}</p>
          <p className="mt-1">Dados salvos apenas neste navegador.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
          <button type="button" className="btn-ghost p-2" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <Brand compact />
          <button type="button" className="btn-ghost p-2" onClick={toggleTheme} aria-label="Alternar tema">
            {settings.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        {open ? (
          <div className="no-print fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-white p-4 shadow-xl dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <Brand />
                <button type="button" className="btn-ghost p-2" onClick={() => setOpen(false)} aria-label="Fechar menu">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6">{nav}</div>
              <button type="button" className="btn-secondary mt-6 w-full" onClick={toggleTheme}>
                {settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {settings.theme === "dark" ? "Tema claro" : "Tema escuro"}
              </button>
            </div>
          </div>
        ) : null}

        <main key={location.pathname} className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="no-print border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
          OrçaEng — orçamentos de engenharia elétrica. Cálculos de horas e precificação; não substitui memorial técnico.
        </footer>
      </div>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 dark:ring-slate-700">
        <img src={BRAND_SIMBOLO} alt={BRAND_NAME} className="h-8 w-8 object-contain" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">OrçaEng</p>
        {!compact ? (
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{BRAND_NAME}</p>
        ) : null}
      </div>
    </div>
  );
}
