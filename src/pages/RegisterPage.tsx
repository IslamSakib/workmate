import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { register as registerUser } from "@/features/auth/api"
import { registerSchema, type RegisterInput } from "@/features/auth/schema"

export default function RegisterPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (values: RegisterInput) => {
    setSubmitting(true)
    try {
      await registerUser(values)
      toast.success("Account created. Check your email to confirm your address.")
      navigate("/login")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create account")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create your account" description="Start tracking your freelance work">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Full name</Label>
          <Input id="displayName" {...register("displayName")} />
          {errors.displayName && (
            <p className="text-sm text-destructive">{errors.displayName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
