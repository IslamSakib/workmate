import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TrendPoint } from "../types"

export function MonthlyPerformanceChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Performance</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
            <Tooltip />
            <Bar dataKey="hours" fill="var(--chart-3)" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
