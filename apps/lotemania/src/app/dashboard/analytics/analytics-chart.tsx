"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function AnalyticsChart({ data }: { data: { day: string; views: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#242d3b" vertical={false} />
        <XAxis dataKey="day" stroke="#8b96a5" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#8b96a5" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#171e2b", border: "1px solid #242d3b", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#e6e9ee" }}
        />
        <Bar dataKey="views" name="Visitas" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
