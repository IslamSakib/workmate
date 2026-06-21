import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TrendPoint } from "../types"

export function HoursTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hours Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
            <Tooltip formatter={(value) => `${value}h`} />
            <Line type="monotone" dataKey="hours" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
