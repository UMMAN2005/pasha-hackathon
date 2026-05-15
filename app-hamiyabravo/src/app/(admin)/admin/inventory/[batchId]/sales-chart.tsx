"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

interface SalesChartProps {
  data: { day: number; qty: number }[];
}

export function SalesChart({ data }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="day" stroke="#cbd5e1" />
        <YAxis stroke="#cbd5e1" />
        <Line
          type="monotone"
          dataKey="qty"
          stroke="#2563eb"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
