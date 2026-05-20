import type { HotelInsight, InsightCategory } from "@/lib/analytics";
import { HotelLink } from "@/components/ui/HotelLink";

import { INSIGHT_THEMES } from "./insightTheme";

type Props = {
  category: InsightCategory;
  insights: HotelInsight[];
};

export function InsightList({ category, insights }: Props) {
  const theme = INSIGHT_THEMES[category];

  return (
    <div
      className={`flex flex-col rounded-xl border ${theme.border} ${theme.bg} p-4 shadow-sm`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.dot}`} />
          <h3 className="text-sm font-semibold sh-heading">{theme.label}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${theme.badge}`}>
          {insights.length}
        </span>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm sh-subtext">{theme.emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {insights.map((insight) => (
            <li
              key={insight.hotel}
              className={`rounded-lg px-3 py-2.5 shadow-sm ${theme.itemCard}`}
            >
              <p className="text-sm font-medium">
                <HotelLink name={insight.hotel} />
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{insight.message}</p>
              <p className="mt-1.5 text-xs tabular-nums sh-label">
                Forecast vs budget variance:{" "}
                <span className="font-medium sh-subtext">
                  {insight.variance_percent >= 0 ? "+" : ""}
                  {insight.variance_percent.toFixed(1)}%
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
