export type ProjectStatus = "active" | "paused" | "completed" | "cancelled"
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "scheduled" | "partial"
export type RecurringInvoiceFrequency = "weekly" | "monthly" | "quarterly"
export type CurrencyCode = "USD" | "BDT" | "EUR" | "GBP" | "PHP"
export type TeamRole = "admin" | "manager" | "employee"
export type TaskApprovalStatus = "draft" | "submitted" | "approved" | "rejected"
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          user_id: string
          actor_id: string | null
          table_name: string
          record_id: string | null
          action: string
          old_values: Json | null
          new_values: Json | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          table_name: string
          action: string
        }
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>
        Relationships: []
      }
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
          created_by: string | null
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
      expenses: {
        Row: {
          id: string
          user_id: string
          created_by: string | null
          client_id: string | null
          project_id: string | null
          category: string
          amount: number
          currency: CurrencyCode
          date: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["expenses"]["Row"]> & {
          category: string
          amount: number
        }
        Update: Partial<Database["public"]["Tables"]["expenses"]["Row"]>
        Relationships: []
      }
      retainers: {
        Row: {
          id: string
          user_id: string
          created_by: string | null
          client_id: string
          monthly_fee: number
          included_hours: number
          overage_rate: number
          currency: CurrencyCode
          next_billing_date: string
          active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["retainers"]["Row"]> & {
          client_id: string
        }
        Update: Partial<Database["public"]["Tables"]["retainers"]["Row"]>
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          user_id: string
          created_by: string | null
          client_id: string | null
          project_name: string
          hourly_rate: number | null
          fixed_price: number | null
          currency: CurrencyCode
          status: ProjectStatus
          start_date: string | null
          due_date: string | null
          notes: string | null
          client_approval_status: "pending" | "approved" | null
          client_approved_at: string | null
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
          created_by: string | null
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
          approval_status: TaskApprovalStatus
          submitted_at: string | null
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
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
          created_by: string | null
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
          created_by: string | null
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
          notes: string | null
          scheduled_date: string | null
          last_reminder_sent_at: string | null
          reminder_count: number
          amount_paid: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & {
          invoice_number: string
        }
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>
        Relationships: []
      }
      invoice_payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          paid_date: string
          method: string | null
          notes: string | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["invoice_payments"]["Row"]> & {
          invoice_id: string
          amount: number
        }
        Update: Partial<Database["public"]["Tables"]["invoice_payments"]["Row"]>
        Relationships: []
      }
      recurring_invoices: {
        Row: {
          id: string
          user_id: string
          created_by: string | null
          client_id: string | null
          project_id: string | null
          currency: CurrencyCode
          frequency: RecurringInvoiceFrequency
          next_run_date: string
          active: boolean
          last_generated_invoice_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["recurring_invoices"]["Row"]> & {
          frequency: RecurringInvoiceFrequency
        }
        Update: Partial<Database["public"]["Tables"]["recurring_invoices"]["Row"]>
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
      team_members: {
        Row: {
          id: string
          account_id: string
          member_id: string | null
          invited_email: string
          role: TeamRole
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["team_members"]["Row"]> & {
          account_id: string
          invited_email: string
        }
        Update: Partial<Database["public"]["Tables"]["team_members"]["Row"]>
        Relationships: []
      }
      client_portal_access: {
        Row: {
          id: string
          account_id: string
          client_id: string
          member_id: string | null
          invited_email: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["client_portal_access"]["Row"]> & {
          account_id: string
          client_id: string
          invited_email: string
        }
        Update: Partial<Database["public"]["Tables"]["client_portal_access"]["Row"]>
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
    Functions: {
      approve_project_deliverable: {
        Args: { target_project_id: string }
        Returns: undefined
      }
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
