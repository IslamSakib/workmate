import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export interface ClientOption {
  id: string
  client_name: string
}

export function useClientsList() {
  const [clients, setClients] = useState<ClientOption[]>([])

  useEffect(() => {
    supabase
      .from("clients")
      .select("id, client_name")
      .order("client_name")
      .then(({ data }) => setClients(data ?? []))
  }, [])

  return clients
}
