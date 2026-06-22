import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AppShell } from "@/components/layout/AppShell"
import { PortalShell } from "@/components/layout/PortalShell"
import { ProtectedRoute, PortalRoute, PublicOnlyRoute } from "@/components/layout/ProtectedRoute"
import { useAuthStore } from "@/store/authStore"

import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import ForgotPasswordPage from "@/pages/ForgotPasswordPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"
import DashboardPage from "@/pages/DashboardPage"
import ClientsPage from "@/pages/ClientsPage"
import ProjectsPage from "@/pages/ProjectsPage"
import TasksPage from "@/pages/TasksPage"
import TimerPage from "@/pages/TimerPage"
import ReportsPage from "@/pages/ReportsPage"
import InsightsPage from "@/pages/InsightsPage"
import InvoicesPage from "@/pages/InvoicesPage"
import RetainersPage from "@/pages/RetainersPage"
import RecurringInvoicesPage from "@/pages/RecurringInvoicesPage"
import ExpensesPage from "@/pages/ExpensesPage"
import AuditLogsPage from "@/pages/AuditLogsPage"
import TeamPage from "@/pages/TeamPage"
import SettingsPage from "@/pages/SettingsPage"
import ClientPortalPage from "@/pages/ClientPortalPage"

function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/timer" element={<TimerPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/recurring-invoices" element={<RecurringInvoicesPage />} />
            <Route path="/retainers" element={<RetainersPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/team" element={<TeamPage />} />
          </Route>
        </Route>

        <Route element={<PortalRoute />}>
          <Route element={<PortalShell />}>
            <Route path="/portal" element={<ClientPortalPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
