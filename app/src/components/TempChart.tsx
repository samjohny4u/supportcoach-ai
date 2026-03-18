"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type DataPoint = {
  date: string;
  empathy: number;
  clarity: number;
  ownership: number;
  resolution: number;
  professionalism: number;
};

function capitalizeLabel(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function TrendChart({
  data,
  title = "Support Quality Trends",
  subtitle,
}: {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#081225] p-6">
      <h2 className="mb-2 text-xl font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mb-6 text-sm text-gray-400">{subtitle}</p> : null}

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" stroke="#9ca3af" />
          <YAxis domain={[0, 10]} stroke="#9ca3af" />
          <Tooltip
            formatter={(value, name) => [
              typeof value === "number" ? value.toFixed(1) : String(value ?? ""),
              capitalizeLabel(String(name)),
            ]}
          />
          <Line type="monotone" dataKey="empathy" stroke="#60a5fa" strokeWidth={2} />
          <Line type="monotone" dataKey="clarity" stroke="#34d399" strokeWidth={2} />
          <Line type="monotone" dataKey="ownership" stroke="#f59e0b" strokeWidth={2} />
          <Line type="monotone" dataKey="resolution" stroke="#a78bfa" strokeWidth={2} />
          <Line
            type="monotone"
            dataKey="professionalism"
            stroke="#f472b6"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}