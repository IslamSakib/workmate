import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"

export function ProtectedRoute() {
  const { user, initialized, isClientPortal } = useAuthStore()

  if (!initialized) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (isClientPortal) {
    return <Navigate to="/portal" replace />
  }

  return <Outlet />
}

export function PortalRoute() {
  const { user, initialized, isClientPortal } = useAuthStore()

  if (!initialized) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isClientPortal) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { user, initialized, isClientPortal } = useAuthStore()

  if (initialized && user) {
    return <Navigate to={isClientPortal ? "/portal" : "/dashboard"} replace />
  }

  return <Outlet />
}
