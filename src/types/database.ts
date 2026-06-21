export type ProjectStatus = "active" | "paused" | "completed" | "cancelled"
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue"
export type CurrencyCode = "USD" | "BDT" | "EUR" | "GBP" | "PHP"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          default_currency: CurrencyCode
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          user_id: string
          client_name: string
          company_name: string | null
          email: string | null
          phone: string | null
          currency: CurrencyCode
          country: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["clients"]["Row"]> & {
          client_name: string
        }
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          project_name: string
          hourly_rate: number | null
          fixed_price: number | null
          currency: CurrencyCode
          status: ProjectStatus
          start_date: string | null
          due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          project_name: string
        }
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          client_id: string | null
          task_name: string
          date: string
          start_time: string | null
          end_time: string | null
          duration_seconds: number
          billable: boolean
          notes: string | null
          invoice_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          task_name: string
        }
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>
        Relationships: []
      }
      time_entries: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          client_id: string | null
          task_id: string | null
          started_at: string
          ended_at: string | null
          duration_seconds: number
          is_running: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["time_entries"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["time_entries"]["Row"]>
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          project_id: string | null
          invoice_number: string
          total: number
          currency: CurrencyCode
          status: InvoiceStatus
          issue_date: string
          due_date: string | null
          period_start: string | null
          period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & {
          invoice_number: string
        }
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>
        Relationships: []
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          task_id: string | null
          task_name: string
          task_date: string
          duration_seconds: number
          rate: number
          amount: number
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["invoice_items"]["Row"]> & {
          invoice_id: string
          task_name: string
          task_date: string
        }
        Update: Partial<Database["public"]["Tables"]["invoice_items"]["Row"]>
        Relationships: []
      }
      attachments: {
        Row: {
          id: string
          user_id: string
          owner_type: string
          owner_id: string
          file_path: string
          file_name: string
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["attachments"]["Row"]> & {
          owner_type: string
          owner_id: string
          file_path: string
          file_name: string
        }
        Update: Partial<Database["public"]["Tables"]["attachments"]["Row"]>
        Relationships: []
      }
      settings: {
        Row: {
          user_id: string
          default_currency: CurrencyCode
          date_format: string
          theme: string
          invoice_prefix: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]> & {
          user_id: string
        }
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
