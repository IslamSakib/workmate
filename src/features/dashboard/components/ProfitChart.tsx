import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { currenciesIn, formatCurrency } from "@/lib/currency"
import type { CurrencyCode } from "@/types/database"
import type { TrendPoint } from "../types"

function MiniChart({ data, code, height }: { data: TrendPoint[]; code: CurrencyCode; height: number }) {
  const points = data.map((t) => ({
    label: t.label,
    revenue: t.revenue[code] ?? 0,
    expenses: t.expenses?.[code] ?? 0,
    profit: t.profit?.[code] ?? 0,
  }))
  const gradientId = `profitFill-${code}`
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--success)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
          <Tooltip formatter={(value) => formatCurrency(Number(value), code)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-1)" fill="none" strokeWidth={2} />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="var(--destructive)"
            fill="none"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke="var(--success)"
            fill={`url(#${gradientId})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProfitChart({ data }: { data: TrendPoint[] }) {
  const codes = currenciesIn(...data.map((t) => t.revenue), ...data.map((t) => t.expenses ?? {}))
  const multi = codes.length > 1
  const shown = codes.length > 0 ? codes : (["USD"] as CurrencyCode[])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profit Trend</CardTitle>
      </CardHeader>
      <CardContent className={multi ? "space-y-6" : undefined}>
        {shown.map((code) => (
          <div key={code}>
            {multi && <p className="mb-1 text-xs font-medium text-muted-foreground">{code}</p>}
            <MiniChart data={data} code={code} height={multi ? 260 : 288} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
