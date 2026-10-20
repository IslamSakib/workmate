export interface NavItem {
  label: string
  to: string
}

export interface NavGroup {
  heading: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Work",
    items: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Timer", to: "/timer" },
      { label: "Tasks", to: "/tasks" },
      { label: "Projects", to: "/projects" },
    ],
  },
  {
    heading: "Money",
    items: [
      { label: "Invoices", to: "/invoices" },
      { label: "Jobs & recurring", to: "/recurring" },
      { label: "Expenses", to: "/expenses" },
      { label: "Reports", to: "/reports" },
    ],
  },
  { heading: "People", items: [{ label: "Clients", to: "/clients" }] },
  { heading: "Account", items: [{ label: "Settings", to: "/settings" }] },
]

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

// Primary mobile tabs; every other page lives under "More".
export const MOBILE_TABS: NavItem[] = [
  { label: "Today", to: "/dashboard" },
  { label: "Timer", to: "/timer" },
  { label: "Invoices", to: "/invoices" },
  { label: "Clients", to: "/clients" },
]
