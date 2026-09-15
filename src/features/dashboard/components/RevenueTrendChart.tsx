import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { currenciesIn, formatCurrency } from "@/lib/currency"
import type { CurrencyCode } from "@/types/database"
import type { TrendPoint } from "../types"

function MiniChart({ data, code, height }: { data: TrendPoint[]; code: CurrencyCode; height: number }) {
  const points = data.map((t) => ({ label: t.label, revenue: t.revenue[code] ?? 0 }))
  const gradientId = `revenueFill-${code}`
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
          <Tooltip formatter={(value) => formatCurrency(Number(value), code)} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--chart-1)"
            fill={`url(#${gradientId})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  const codes = currenciesIn(...data.map((t) => t.revenue))
  const multi = codes.length > 1
  // No revenue logged yet anywhere — still render one empty USD chart rather than nothing.
  const shown = codes.length > 0 ? codes : (["USD"] as CurrencyCode[])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent className={multi ? "space-y-4" : undefined}>
        {shown.map((code) => (
          <div key={code}>
            {multi && <p className="mb-1 text-xs font-medium text-muted-foreground">{code}</p>}
            <MiniChart data={data} code={code} height={multi ? 288 / shown.length : 288} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
