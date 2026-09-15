import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Toaster } from "@/components/ui/sonner"
import { AppShell } from "@/components/layout/AppShell"
import { ProtectedRoute, PublicOnlyRoute } from "@/components/layout/ProtectedRoute"
import { useAuthStore } from "@/store/authStore"

const LoginPage = lazy(() => import("@/pages/LoginPage"))
const RegisterPage = lazy(() => import("@/pages/RegisterPage"))
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"))
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"))
const PublicInvoicePage = lazy(() => import("@/pages/PublicInvoicePage"))
const PublicProposalPage = lazy(() => import("@/pages/PublicProposalPage"))
const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const ClientsPage = lazy(() => import("@/pages/ClientsPage"))
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"))
const TasksPage = lazy(() => import("@/pages/TasksPage"))
const TimerPage = lazy(() => import("@/pages/TimerPage"))
const CalendarPage = lazy(() => import("@/pages/CalendarPage"))
const ReportsPage = lazy(() => import("@/pages/ReportsPage"))
const InsightsPage = lazy(() => import("@/pages/InsightsPage"))
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage"))
const ProposalsPage = lazy(() => import("@/pages/ProposalsPage"))
const RetainersPage = lazy(() => import("@/pages/RetainersPage"))
const RecurringInvoicesPage = lazy(() => import("@/pages/RecurringInvoicesPage"))
const ExpensesPage = lazy(() => import("@/pages/ExpensesPage"))
const SettingsPage = lazy(() => import("@/pages/SettingsPage"))

function PageFallback() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/i/:token" element={<PublicInvoicePage />} />
          <Route path="/p/:token" element={<PublicProposalPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/timer" element={<TimerPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="/recurring-invoices" element={<RecurringInvoicesPage />} />
              <Route path="/retainers" element={<RetainersPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
