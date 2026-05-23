"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

type Props = {
  data: { value: number }[];
  color?: string;
  positive?: boolean;
};

export function KpiSparkline({ data, color, positive }: Props) {
  if (data.length < 2) {
    return <div className="h-7 w-full opacity-30" />;
  }

  const stroke =
    color ?? (positive === undefined ? "#6366f1" : positive ? "#059669" : "#dc2626");

  return (
    <div className="h-7 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
