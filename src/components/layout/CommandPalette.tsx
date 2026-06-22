import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Users, FolderKanban, ListChecks, FileText, Repeat, CalendarSync, Receipt, Users2 } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { NAV_ITEMS } from "./nav-items"
import { listClients } from "@/features/clients/api"
import { listProjects } from "@/features/projects/api"
import { listTasks } from "@/features/tasks/api"
import { listInvoices } from "@/features/invoices/api"
import { listExpenses } from "@/features/expenses/api"
import { hasMinRole } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"

interface SearchResult {
  id: string
  label: string
  sublabel?: string
  to: string
}

const SEARCH_LIMIT = 25

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const setOpen = onOpenChange
  const role = useAuthStore((s) => s.role)
  const visibleNavItems = NAV_ITEMS.filter((item) => hasMinRole(role, item.minRole ?? "employee"))
  const [clients, setClients] = useState<SearchResult[]>([])
  const [projects, setProjects] = useState<SearchResult[]>([])
  const [tasks, setTasks] = useState<SearchResult[]>([])
  const [invoices, setInvoices] = useState<SearchResult[]>([])
  const [expenses, setExpenses] = useState<SearchResult[]>([])

  useEffect(() => {
    if (!open) return
    listClients()
      .then((rows) =>
        setClients(
          rows.slice(0, SEARCH_LIMIT).map((c) => ({ id: c.id, label: c.client_name, to: "/clients" })),
        ),
      )
      .catch(() => setClients([]))
    listProjects()
      .then((rows) =>
        setProjects(
          rows
            .slice(0, SEARCH_LIMIT)
            .map((p) => ({ id: p.id, label: p.project_name, sublabel: p.clients?.client_name, to: "/projects" })),
        ),
      )
      .catch(() => setProjects([]))
    listTasks()
      .then((rows) =>
        setTasks(
          rows.slice(0, SEARCH_LIMIT).map((t) => ({ id: t.id, label: t.task_name, sublabel: t.date, to: "/tasks" })),
        ),
      )
      .catch(() => setTasks([]))
    listInvoices()
      .then((rows) =>
        setInvoices(
          rows
            .slice(0, SEARCH_LIMIT)
            .map((i) => ({ id: i.id, label: i.invoice_number, sublabel: i.clients?.client_name, to: "/invoices" })),
        ),
      )
      .catch(() => setInvoices([]))
    listExpenses()
      .then((rows) =>
        setExpenses(
          rows
            .slice(0, SEARCH_LIMIT)
            .map((e) => ({ id: e.id, label: e.category, sublabel: e.clients?.client_name, to: "/expenses" })),
        ),
      )
      .catch(() => setExpenses([]))
  }, [open])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const create = (to: string) => {
    setOpen(false)
    navigate(`${to}?new=1`)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search clients, projects, tasks, invoices..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Create">
          {hasMinRole(role, "manager") && (
            <>
              <CommandItem onSelect={() => create("/clients")}>
                <Users />
                Create Client
              </CommandItem>
              <CommandItem onSelect={() => create("/projects")}>
                <FolderKanban />
                Create Project
              </CommandItem>
            </>
          )}
          <CommandItem onSelect={() => create("/tasks")}>
            <ListChecks />
            Create Task
          </CommandItem>
          {hasMinRole(role, "manager") && (
            <>
              <CommandItem onSelect={() => create("/invoices")}>
                <FileText />
                Create Invoice
              </CommandItem>
              <CommandItem onSelect={() => create("/retainers")}>
                <Repeat />
                Create Retainer
              </CommandItem>
              <CommandItem onSelect={() => create("/recurring-invoices")}>
                <CalendarSync />
                Create Recurring Invoice
              </CommandItem>
            </>
          )}
          {hasMinRole(role, "admin") && (
            <CommandItem onSelect={() => create("/expenses")}>
              <Receipt />
              Create Expense
            </CommandItem>
          )}
          {hasMinRole(role, "admin") && (
            <CommandItem onSelect={() => create("/team")}>
              <Users2 />
              Invite Team Member
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {visibleNavItems.map((item) => (
            <CommandItem key={item.to} onSelect={() => go(item.to)}>
              <item.icon />
              Go to {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {clients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clients">
              {clients.map((c) => (
                <CommandItem key={c.id} onSelect={() => go(c.to)}>
                  <Users />
                  {c.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem key={p.id} onSelect={() => go(p.to)}>
                  <FolderKanban />
                  {p.label}
                  {p.sublabel && <span className="text-muted-foreground">— {p.sublabel}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {tasks.map((t) => (
                <CommandItem key={t.id} onSelect={() => go(t.to)}>
                  <ListChecks />
                  {t.label}
                  {t.sublabel && <span className="text-muted-foreground">— {t.sublabel}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {invoices.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Invoices">
              {invoices.map((i) => (
                <CommandItem key={i.id} onSelect={() => go(i.to)}>
                  <FileText />
                  {i.label}
                  {i.sublabel && <span className="text-muted-foreground">— {i.sublabel}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {expenses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Expenses">
              {expenses.map((e) => (
                <CommandItem key={e.id} onSelect={() => go(e.to)}>
                  <Receipt />
                  {e.label}
                  {e.sublabel && <span className="text-muted-foreground">— {e.sublabel}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
