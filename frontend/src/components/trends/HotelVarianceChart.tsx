"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartTheme } from "@/lib/chartTheme";
import { formatReportDate, type HotelTrendSeries } from "@/lib/trends";

const LINE_COLORS = [
  "#4f46e5",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

type Props = {
  series: HotelTrendSeries[];
};

export function HotelVarianceChart({ series }: Props) {
  const chart = useChartTheme();

  if (series.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">
        Hotel trend lines appear after multiple uploads.
      </p>
    );
  }

  const dateSet = new Set<string>();
  series.forEach((s) => s.points.forEach((p) => dateSet.add(p.report_date)));
  const sortedDates = [...dateSet].sort();

  const chartData = sortedDates.map((report_date) => {
    const row: Record<string, string | number> = {
      report_date,
      label: formatReportDate(report_date),
    };
    for (const s of series) {
      const point = s.points.find((p) => p.report_date === report_date);
      if (point) {
        row[s.hotel_name] = point.variance_percent;
      }
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: chart.axis }} stroke={chart.axis} />
        <YAxis tick={{ fontSize: 11, fill: chart.axis }} stroke={chart.axis} tickFormatter={(v) => `${v}%`} />
        <ReferenceLine y={0} stroke={chart.reference} strokeDasharray="4 4" />
        <Tooltip
          formatter={(value) =>
            typeof value === "number" ? `${value.toFixed(1)}%` : String(value ?? "")
          }
          contentStyle={chart.tooltip}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: chart.axis }} />
        {series.map((s, index) => (
          <Line
            key={s.hotel_name}
            type="monotone"
            dataKey={s.hotel_name}
            stroke={LINE_COLORS[index % LINE_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
