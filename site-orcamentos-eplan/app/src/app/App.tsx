import { Navigate, Route, Routes } from "react-router-dom";
import { AppDataProvider } from "./store";
import AppLayout from "../components/layout/AppLayout";
import DashboardPage from "../pages/DashboardPage";
import BudgetEditorPage from "../pages/BudgetEditorPage";
import BudgetsPage from "../pages/BudgetsPage";
import SettingsPage from "../pages/SettingsPage";

export default function App() {
  return (
    <AppDataProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orcamentos" element={<BudgetsPage />} />
          <Route path="/orcamentos/novo" element={<BudgetEditorPage />} />
          <Route path="/orcamentos/:id" element={<BudgetEditorPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppDataProvider>
  );
}
