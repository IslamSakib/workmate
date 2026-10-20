import { PasswordInput } from "@/components/shared/PasswordInput"
import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
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
import { preferencesSchema, profileSchema, RATE_FIELDS, type PreferencesInput, type ProfileInput } from "@/features/settings/schema"

const DATE_FORMATS = ["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)

  const profileForm = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) })
  const preferencesForm = useForm<PreferencesInput>({
    resolver: zodResolver(preferencesSchema) as Resolver<PreferencesInput>,
    defaultValues: {
      default_currency: "BDT",
      date_format: "MM/dd/yyyy",
      invoice_prefix: "INV-",
      tax_rate_pct: 0,
      payment_url: "",
    },
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
            tax_rate_pct: settings.tax_rate_pct,
            payment_url: settings.payment_url ?? "",
            rate_USD: settings.exchange_rates?.USD,
            rate_EUR: settings.exchange_rates?.EUR,
            rate_GBP: settings.exchange_rates?.GBP,
            rate_PHP: settings.exchange_rates?.PHP,
            rate_BDT: settings.exchange_rates?.BDT,
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
      <PageHeader title="Settings" description="Manage your account and preferences." />

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
              <Label>Default currency (totals are shown in this)</Label>
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
            <fieldset className="space-y-2 rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">Fallback exchange rates</legend>
              <p className="text-xs text-muted-foreground">
                How much one unit of each currency is worth in your default currency
                ({preferencesForm.watch("default_currency")}). Used only when a client or project has no
                contract rate of its own. Set contract rates on each client (and project).
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {RATE_FIELDS.filter((c) => c !== preferencesForm.watch("default_currency")).map((c) => (
                  <div key={c} className="space-y-1">
                    <Label htmlFor={`rate_${c}`}>
                      1 {c} = ? {preferencesForm.watch("default_currency")}
                    </Label>
                    <Input id={`rate_${c}`} type="number" step="any" min="0" inputMode="decimal" {...preferencesForm.register(`rate_${c}` as const)} />
                  </div>
                ))}
              </div>
            </fieldset>
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
            <div className="space-y-2">
              <Label htmlFor="tax_rate_pct">Tax set-aside rate (%)</Label>
              <Input
                id="tax_rate_pct"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...preferencesForm.register("tax_rate_pct")}
              />
              <p className="text-xs text-muted-foreground">
                Used to estimate how much of each period's revenue to set aside for taxes on the
                Dashboard. Not tax advice — check with an accountant for your actual rate.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_url">Payment link</Label>
              <Input
                id="payment_url"
                placeholder="e.g. your Stripe Payment Link or paypal.me/you"
                {...preferencesForm.register("payment_url")}
              />
              <p className="text-xs text-muted-foreground">
                Shown as a "Pay now" button on shareable invoice links (Invoices → ⋯ → Copy share
                link). Leave blank to hide the button.
              </p>
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
                <PasswordInput id="password" {...passwordForm.register("password")} />
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <PasswordInput id="confirmPassword" {...passwordForm.register("confirmPassword")} />
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
