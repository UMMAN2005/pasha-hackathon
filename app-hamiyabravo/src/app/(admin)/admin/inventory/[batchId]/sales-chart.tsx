"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface SalesChartProps {
  data: { day: number; qty: number }[];
}

export function SalesChart({ data }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="day"
          stroke="rgba(255,255,255,0.4)"
          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
        />
        <YAxis
          stroke="rgba(255,255,255,0.4)"
          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="qty"
          stroke="url(#gradient)"
          dot={{ fill: "rgb(251,146,60)", r: 4 }}
          strokeWidth={3}
          isAnimationActive={true}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(251,146,60)" stopOpacity={1} />
            <stop offset="100%" stopColor="rgb(216,67,107)" stopOpacity={1} />
          </linearGradient>
        </defs>
      </LineChart>
    </ResponsiveContainer>
  );
}
