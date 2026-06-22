import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import { Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/shared/DataTable"
import { formatCurrency } from "@/lib/currency"
import { formatDuration } from "@/lib/duration"
import { generateInvoicePdf } from "@/lib/pdf/invoicePdf"
import {
  approveProjectDeliverable,
  getPortalInvoiceItems,
  getPortalInvoices,
  getPortalProjects,
  getPortalTasks,
} from "@/features/client-portal/api"
import type { PortalProject, PortalTask } from "@/features/client-portal/types"
import type { InvoiceWithRelations } from "@/features/invoices/types"

const taskColumns: ColumnDef<PortalTask, unknown>[] = [
  { accessorKey: "task_name", header: "Task" },
  { accessorKey: "date", header: "Date" },
  {
    accessorKey: "duration_seconds",
    header: "Duration",
    cell: ({ row }) => formatDuration(row.original.duration_seconds),
  },
  {
    accessorKey: "billable",
    header: "Billable",
    cell: ({ row }) => (
      <Badge variant={row.original.billable ? "default" : "secondary"}>
        {row.original.billable ? "Billable" : "Non-billable"}
      </Badge>
    ),
  },
]

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  scheduled: "outline",
  sent: "outline",
  partial: "outline",
  paid: "default",
  overdue: "destructive",
}

export default function ClientPortalPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<PortalProject[]>([])
  const [tasks, setTasks] = useState<PortalTask[]>([])
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const [projectsRes, tasksRes, invoicesRes] = await Promise.all([
        getPortalProjects(),
        getPortalTasks(),
        getPortalInvoices(),
      ])
      setProjects(projectsRes)
      setTasks(tasksRes)
      setInvoices(invoicesRes)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load your data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleApprove = async (project: PortalProject) => {
    try {
      await approveProjectDeliverable(project.id)
      toast.success(`${project.project_name} approved`)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve project")
    }
  }

  const handleDownload = async (invoice: InvoiceWithRelations) => {
    try {
      const items = await getPortalInvoiceItems(invoice.id)
      await generateInvoicePdf({
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        currency: invoice.currency,
        client_name: invoice.clients?.client_name ?? "—",
        client_email: invoice.clients?.email,
        project_name: invoice.projects?.project_name,
        items: items.map((i) => ({
          task_name: i.task_name,
          task_date: i.task_date,
          duration_seconds: i.duration_seconds,
          rate: Number(i.rate),
          amount: Number(i.amount),
        })),
        total: Number(invoice.total),
        notes: invoice.notes,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export PDF")
    }
  }

  const invoiceColumns: ColumnDef<InvoiceWithRelations, unknown>[] = [
    { accessorKey: "invoice_number", header: "Invoice #" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => formatCurrency(row.original.total, row.original.currency),
    },
    { accessorKey: "due_date", header: "Due", cell: ({ row }) => row.original.due_date || "—" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => handleDownload(row.original)}>
          <Download className="size-4" />
          PDF
        </Button>
      ),
    },
  ]

  if (loading) {
    return <Skeleton className="h-64" />
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your Portal</h1>
        <p className="text-sm text-muted-foreground">Project status, tracked hours, and invoices.</p>
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-3 pt-3">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div>
                  <div className="font-medium">{project.project_name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {project.status}
                    {project.due_date ? ` · Due ${project.due_date}` : ""}
                  </div>
                </div>
                {project.client_approval_status === "approved" ? (
                  <Badge className="bg-success text-success-foreground">Approved</Badge>
                ) : (
                  <Button size="sm" onClick={() => handleApprove(project)}>
                    Approve
                  </Button>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="hours" className="pt-3">
          <DataTable
            columns={taskColumns}
            data={tasks}
            searchKey="task_name"
            searchPlaceholder="Search tasks..."
            emptyMessage="No hours logged yet."
          />
        </TabsContent>

        <TabsContent value="invoices" className="pt-3">
          <DataTable
            columns={invoiceColumns}
            data={invoices}
            searchKey="invoice_number"
            searchPlaceholder="Search invoices..."
            emptyMessage="No invoices yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
