"use client";

import { useChartTheme } from "@/lib/chartTheme";
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

import { formatReportDate } from "@/lib/trends";
import type { TrendPoint } from "@/lib/property";

type Props = {
  title: string;
  subtitle?: string;
  data: TrendPoint[];
  valueKey: "variance_percent" | "forecast" | "budget";
  yFormat?: (v: number) => string;
  stroke?: string;
  emptyMessage?: string;
};

export function KpiLineChart({
  title,
  subtitle,
  data,
  valueKey,
  yFormat = (v) => `${v.toFixed(1)}%`,
  stroke = "#4f46e5",
  emptyMessage = "No trend data available.",
}: Props) {
  const chart = useChartTheme();

  const chartData = data.map((p) => ({
    ...p,
    label: formatReportDate(p.report_date),
  }));

  return (
    <div className="sh-card p-4">
      <h3 className="text-sm font-semibold sh-heading">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs sh-label">{subtitle}</p>}
      {chartData.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: chart.axis }} stroke={chart.axis} />
              <YAxis tick={{ fontSize: 10, fill: chart.axis }} stroke={chart.axis} tickFormatter={yFormat} />
              {valueKey === "variance_percent" && (
                <ReferenceLine y={0} stroke={chart.reference} strokeDasharray="4 4" />
              )}
              <Tooltip
                formatter={(value) =>
                  typeof value === "number" ? yFormat(value) : String(value ?? "")
                }
                contentStyle={chart.tooltip}
              />
              <Line
                type="monotone"
                dataKey={valueKey}
                stroke={stroke}
                strokeWidth={2}
                dot={{ r: 3, fill: stroke }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

