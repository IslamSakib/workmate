import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AppShell } from "@/components/layout/AppShell"
import { ProtectedRoute, PublicOnlyRoute } from "@/components/layout/ProtectedRoute"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"
import { useAuthStore } from "@/store/authStore"

const LoginPage = lazy(() => import("@/pages/LoginPage"))
const RegisterPage = lazy(() => import("@/pages/RegisterPage"))
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"))
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"))
const PublicInvoicePage = lazy(() => import("@/pages/PublicInvoicePage"))
const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const ClientsPage = lazy(() => import("@/pages/ClientsPage"))
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"))
const TasksPage = lazy(() => import("@/pages/TasksPage"))
const TimerPage = lazy(() => import("@/pages/TimerPage"))
const ReportsPage = lazy(() => import("@/pages/ReportsPage"))
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage"))
const RecurringInvoicesPage = lazy(() => import("@/pages/RecurringInvoicesPage"))
const ExpensesPage = lazy(() => import("@/pages/ExpensesPage"))
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"))
const SettingsPage = lazy(() => import("@/pages/SettingsPage"))

function PageFallback() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <span className="text-sm text-muted-foreground">Loading</span>
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
    <ErrorBoundary>
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

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/timer" element={<TimerPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/recurring" element={<RecurringInvoicesPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
