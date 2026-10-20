import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { currenciesIn, formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type { CurrencyCode } from "@/types/database"
import type { TrendPoint } from "../types"

const AXIS = { tickLine: false, axisLine: false, fontSize: 12 } as const

export function TrendCharts({ data }: { data: TrendPoint[] }) {
  const codes = currenciesIn(...data.map((t) => t.revenue))
  const [picked, setPicked] = useState<CurrencyCode | null>(null)
  const code: CurrencyCode = picked && codes.includes(picked) ? picked : (codes[0] ?? "USD")
  const revenue = data.map((t) => ({ label: t.label, revenue: t.revenue[code] ?? 0 }))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-label="Revenue by month">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Revenue, last 12 months</h2>
          {codes.length > 1 && (
            <div className="flex gap-1">
              {codes.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPicked(c)}
                  className={cn(
                    "rounded-sm border px-2 py-0.5 text-xs",
                    c === code ? "border-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" />
              <YAxis {...AXIS} width={48} />
              <Tooltip formatter={(v) => formatCurrency(Number(v), code)} />
              <Bar dataKey="revenue" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section aria-label="Hours by month">
        <h2 className="mb-2 text-sm font-semibold">Hours, last 12 months</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" />
              <YAxis {...AXIS} width={32} />
              <Tooltip formatter={(v) => `${v}h`} />
              <Line type="monotone" dataKey="hours" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
