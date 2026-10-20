import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export interface ProjectOption {
  id: string
  project_name: string
  client_id: string | null
  hourly_rate: number | null
  currency: string
  fixed_price: number | null
}

export function useProjectsList() {
  const [projects, setProjects] = useState<ProjectOption[]>([])

  useEffect(() => {
    supabase
      .from("projects")
      .select("id, project_name, client_id, hourly_rate, currency, fixed_price")
      .order("project_name")
      .then(({ data }) => setProjects(data ?? []))
  }, [])

  return projects
}
