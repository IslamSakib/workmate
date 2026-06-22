import { create } from "zustand"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"
import type { TeamRole } from "@/types/database"

interface AuthState {
  user: User | null
  session: Session | null
  /** The account this session operates under — the user's own id if they're
   * an Owner, or the inviting Owner's id if they're an active team member
   * or portal client. */
  accountId: string | null
  /** null means Owner; otherwise the team role resolved from team_members.
   * Always null for a portal client too — check isClientPortal first,
   * since hasMinRole(null, ...) treats null as "Owner, always passes". */
  role: TeamRole | null
  /** True for a client logged into their own read-only portal — a separate,
   * client_id-scoped access path independent of role/team_members. */
  isClientPortal: boolean
  /** The single client_id a portal session is scoped to; null otherwise. */
  portalClientId: string | null
  initialized: boolean
  initialize: () => () => void
  signOut: () => Promise<void>
}

interface ResolvedAccount {
  accountId: string
  role: TeamRole | null
  isClientPortal: boolean
  portalClientId: string | null
}

async function resolveAccount(userId: string): Promise<ResolvedAccount> {
  const { data: membership } = await supabase
    .from("team_members")
    .select("account_id, role")
    .eq("member_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (membership) {
    return { accountId: membership.account_id, role: membership.role, isClientPortal: false, portalClientId: null }
  }

  const { data: portalAccess } = await supabase
    .from("client_portal_access")
    .select("account_id, client_id")
    .eq("member_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (portalAccess) {
    return {
      accountId: portalAccess.account_id,
      role: null,
      isClientPortal: true,
      portalClientId: portalAccess.client_id,
    }
  }

  return { accountId: userId, role: null, isClientPortal: false, portalClientId: null }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  accountId: null,
  role: null,
  isClientPortal: false,
  portalClientId: null,
  initialized: false,

  initialize: () => {
    async function applySession(session: Session | null) {
      if (!session?.user) {
        set({
          session: null,
          user: null,
          accountId: null,
          role: null,
          isClientPortal: false,
          portalClientId: null,
          initialized: true,
        })
        return
      }
      const resolved = await resolveAccount(session.user.id)
      set({ session, user: session.user, ...resolved, initialized: true })
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
    set({ user: null, session: null, accountId: null, role: null, isClientPortal: false, portalClientId: null })
  },
}))
