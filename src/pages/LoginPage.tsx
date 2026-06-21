import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/features/auth/api"
import { loginSchema, type LoginInput } from "@/features/auth/schema"

export default function LoginPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginInput) => {
    setSubmitting(true)
    try {
      await login(values)
      navigate("/dashboard")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" description="Sign in to your account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-foreground hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
