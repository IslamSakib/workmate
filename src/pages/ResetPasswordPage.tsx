import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePassword } from "@/features/auth/api"
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schema"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  const onSubmit = async (values: ResetPasswordInput) => {
    setSubmitting(true)
    try {
      await updatePassword(values)
      toast.success("Password updated. Please sign in again.")
      navigate("/login")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Set a new password" description="Enter a new password for your account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Updating..." : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  )
}
