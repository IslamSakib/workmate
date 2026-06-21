import { create } from "zustand"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"

interface AuthState {
  user: User | null
  session: Session | null
  initialized: boolean
  initialize: () => () => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,

  initialize: () => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        set({ session, user: session?.user ?? null, initialized: true })
      })
      .catch(() => set({ initialized: true }))

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({ session, user: session?.user ?? null, initialized: true })
      },
    )

    return () => subscription.subscription.unsubscribe()
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
