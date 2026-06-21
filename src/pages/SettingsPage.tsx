import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENCIES } from "@/lib/currency"
import { useAuthStore } from "@/store/authStore"
import { updatePassword } from "@/features/auth/api"
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schema"
import { getProfile, getSettings, updateProfile, updateSettings } from "@/features/settings/api"
import { preferencesSchema, profileSchema, type PreferencesInput, type ProfileInput } from "@/features/settings/schema"

const DATE_FORMATS = ["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)

  const profileForm = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) })
  const preferencesForm = useForm<PreferencesInput>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: { default_currency: "USD", date_format: "MM/dd/yyyy", invoice_prefix: "INV-" },
  })
  const passwordForm = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  useEffect(() => {
    if (!user) return
    Promise.all([getProfile(user.id), getSettings(user.id)])
      .then(([profile, settings]) => {
        if (profile) profileForm.reset({ display_name: profile.display_name ?? "" })
        if (settings) {
          preferencesForm.reset({
            default_currency: settings.default_currency,
            date_format: settings.date_format,
            invoice_prefix: settings.invoice_prefix,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  const onSaveProfile = async (values: ProfileInput) => {
    if (!user) return
    try {
      await updateProfile(user.id, values)
      toast.success("Profile updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile")
    }
  }

  const onSavePreferences = async (values: PreferencesInput) => {
    if (!user) return
    try {
      await updateSettings(user.id, values)
      toast.success("Preferences updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update preferences")
    }
  }

  const onChangePassword = async (values: ResetPasswordInput) => {
    try {
      await updatePassword(values)
      toast.success("Password updated")
      passwordForm.reset({ password: "", confirmPassword: "" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password")
    }
  }

  if (loading) return null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your basic account information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Full name</Label>
              <Input id="display_name" {...profileForm.register("display_name")} />
              {profileForm.formState.errors.display_name && (
                <p className="text-sm text-destructive">{profileForm.formState.errors.display_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>Default currency, date format, and invoice numbering.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={preferencesForm.handleSubmit(onSavePreferences)} className="space-y-4">
            <div className="space-y-2">
              <Label>Default currency</Label>
              <Select
                value={preferencesForm.watch("default_currency")}
                onValueChange={(v) => preferencesForm.setValue("default_currency", v as PreferencesInput["default_currency"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date format</Label>
              <Select
                value={preferencesForm.watch("date_format")}
                onValueChange={(v) => preferencesForm.setValue("date_format", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_prefix">Invoice prefix</Label>
              <Input id="invoice_prefix" {...preferencesForm.register("invoice_prefix")} />
            </div>
            <Button type="submit" disabled={preferencesForm.formState.isSubmitting}>
              Save preferences
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" {...passwordForm.register("password")} />
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword")} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
