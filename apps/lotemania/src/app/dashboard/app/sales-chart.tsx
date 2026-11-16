"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type SalesChartPoint = {
  time: string;
  pagos: number;
  reservados: number;
  expirados: number;
};

export function SalesChart({ data }: { data: SalesChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#242d3b" vertical={false} />
        <XAxis
          dataKey="time"
          stroke="#8b96a5"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis stroke="#8b96a5" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "#171e2b",
            border: "1px solid #242d3b",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#e6e9ee" }}
        />
        <Area
          type="monotone"
          dataKey="pagos"
          name="Pagos"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="reservados"
          name="Reservados"
          stroke="#eab308"
          fill="#eab308"
          fillOpacity={0.1}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expirados"
          name="Expirados"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
