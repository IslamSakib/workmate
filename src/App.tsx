import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AppShell } from "@/components/layout/AppShell"
import { ProtectedRoute, PublicOnlyRoute } from "@/components/layout/ProtectedRoute"
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
import InvoicesPage from "@/pages/InvoicesPage"
import SettingsPage from "@/pages/SettingsPage"

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
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
