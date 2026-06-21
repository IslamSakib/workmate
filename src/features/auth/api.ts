import { supabase } from "@/lib/supabaseClient"
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./schema"

export async function login({ email, password }: LoginInput) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function register({ email, password, displayName }: RegisterInput) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
}

export async function sendPasswordReset({ email }: ForgotPasswordInput) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword({ password }: ResetPasswordInput) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}
