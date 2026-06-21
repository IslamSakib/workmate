import type { ReactNode } from "react"

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <div className="text-xl font-semibold tracking-tight">WorkMate</div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  )
}
