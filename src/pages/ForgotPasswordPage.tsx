import { useState } from "react"
import { Link } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendPasswordReset } from "@/features/auth/api"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/features/auth/schema"

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (values: ForgotPasswordInput) => {
    setSubmitting(true)
    try {
      await sendPasswordReset(values)
      setSent(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reset email")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Reset your password" description="We'll email you a reset link">
      {sent ? (
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, a password reset link is on its way.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
