"use client";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { useChartTheme } from "@/lib/chartTheme";
import type {
  OccupancyAdrBubble,
  RevenueTrendPoint,
  RevparTrendPoint,
} from "@/lib/command-center";
import { formatReportDate } from "@/lib/trends";

function varianceColor(v: number): string {
  if (v <= -10) return "#dc2626";
  if (v >= 10) return "#059669";
  return "#6366f1";
}

export function TrendVisualization({
  revenueTrend,
  revparTrend,
  scatter,
}: {
  revenueTrend: RevenueTrendPoint[];
  revparTrend: RevparTrendPoint[];
  scatter: OccupancyAdrBubble[];
}) {
  const chart = useChartTheme();

  const revenueData = revenueTrend.map((p) => ({
    ...p,
    label: formatReportDate(p.report_date),
  }));
  const revparData = revparTrend.map((p) => ({
    ...p,
    label: formatReportDate(p.report_date),
  }));

  return (
    <section className="sh-animate-in sh-stagger-4 space-y-6">
      <div>
        <p className="sh-label">Trend signals</p>
        <h2 className="sh-section-title">High-value trends</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="sh-card p-6">
          <h3 className="font-semibold sh-heading">Portfolio revenue trend</h3>
          <p className="mt-1 text-xs sh-subtext">Daily revenue in selected period</p>
          {revenueData.length < 2 ? (
            <p className="py-16 text-center text-sm sh-subtext">Need 2+ reports in range</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: chart.axis }} />
                <YAxis tick={{ fontSize: 11, fill: chart.axis }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={chart.tooltip} />
                <Legend />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="budget" name="Budget" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="sh-card p-6">
          <h3 className="font-semibold sh-heading">RevPAR trend</h3>
          <p className="mt-1 text-xs sh-subtext">RevPAR by day in selected period</p>
          {revparData.length < 2 ? (
            <p className="py-16 text-center text-sm sh-subtext">Need 2+ reports with RevPAR data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revparData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: chart.axis }} />
                <YAxis tick={{ fontSize: 11, fill: chart.axis }} />
                <Tooltip contentStyle={chart.tooltip} />
                <Legend />
                <Line type="monotone" dataKey="current" name="Current" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="budget" name="Budget" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                <Line type="monotone" dataKey="prior_period" name="Prior" stroke="#d97706" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="sh-card p-6">
        <h3 className="font-semibold sh-heading">Occupancy vs ADR · pricing power map</h3>
        <p className="mt-1 text-xs sh-subtext">
          Bubble size = revenue · Color = variance vs budget
        </p>
        {scatter.length === 0 ? (
          <p className="py-16 text-center text-sm sh-subtext">
            Requires Occupancy and ADR in this period — re-upload with replace dates
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis type="number" dataKey="occupancy" name="Occupancy" unit="%" tick={{ fill: chart.axis }} />
              <YAxis type="number" dataKey="adr" name="ADR" tick={{ fill: chart.axis }} />
              <ZAxis type="number" dataKey="revenue" range={[80, 800]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const p = payload[0].payload as OccupancyAdrBubble;
                  return (
                    <div className="rounded-lg border bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <p className="font-semibold">{p.hotel_name}</p>
                      <p>Occ {p.occupancy}% · ADR ${p.adr}</p>
                      <p>Var {p.variance_percent}%</p>
                    </div>
                  );
                }}
              />
              <Scatter data={scatter} name="Hotels">
                {scatter.map((entry) => (
                  <Cell key={entry.hotel_name} fill={varianceColor(entry.variance_percent)} fillOpacity={0.75} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
