"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartTheme } from "@/lib/chartTheme";
import { formatReportDate, type PortfolioVariancePoint } from "@/lib/trends";

type Props = {
  data: PortfolioVariancePoint[];
};

export function PortfolioVarianceChart({ data }: Props) {
  const chart = useChartTheme();
  const chartData = data.map((point) => ({
    ...point,
    label: formatReportDate(point.report_date),
  }));

  if (chartData.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">
        Upload multiple reports to see portfolio variance over time.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: chart.axis }} stroke={chart.axis} />
        <YAxis
          tick={{ fontSize: 11, fill: chart.axis }}
          stroke={chart.axis}
          tickFormatter={(v) => `${v}%`}
        />
        <ReferenceLine y={0} stroke={chart.reference} strokeDasharray="4 4" />
        <Tooltip
          formatter={(value) => [
            typeof value === "number" ? `${value.toFixed(1)}%` : String(value ?? ""),
            "Avg variance",
          ]}
          labelFormatter={(_, payload) => {
            const row = payload?.[0]?.payload as { label?: string; file_name?: string } | undefined;
            return row?.file_name ? `${row.label} · ${row.file_name}` : "";
          }}
          contentStyle={chart.tooltip}
        />
        <Line
          type="monotone"
          dataKey="average_variance_percent"
          stroke="#4f46e5"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#4f46e5" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
