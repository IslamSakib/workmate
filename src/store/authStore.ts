import { create } from "zustand"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"

interface AuthState {
  user: User | null
  session: Session | null
  /** Single-user app: always the signed-in user's own id. */
  accountId: string | null
  initialized: boolean
  initialize: () => () => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  accountId: null,
  initialized: false,

  initialize: () => {
    function applySession(session: Session | null) {
      set({
        session,
        user: session?.user ?? null,
        accountId: session?.user.id ?? null,
        initialized: true,
      })
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(() => set({ initialized: true }))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    return () => subscription.subscription.unsubscribe()
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, accountId: null })
  },
}))
