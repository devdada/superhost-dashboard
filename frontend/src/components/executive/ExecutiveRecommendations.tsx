import type { ExecutiveRecommendation } from "@/lib/executive";

import { RecommendationCard } from "./RecommendationCard";

type Props = {
  recommendations: ExecutiveRecommendation[];
};

export function ExecutiveRecommendations({ recommendations }: Props) {
  const actionItems = recommendations.filter((r) => r.trigger_type !== "strong_performer");
  const opportunities = recommendations.filter((r) => r.trigger_type === "strong_performer");

  if (recommendations.length === 0) {
    return (
      <p className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-8 text-center text-sm sh-subtext">
        No executive recommendations yet. Upload a Daily Flash report with variance outliers to
        generate action items.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {actionItems.length > 0 && (
        <div>
          <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Action required ({actionItems.length})
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {actionItems.map((rec) => (
              <RecommendationCard key={`${rec.hotel_name}-${rec.trigger_type}`} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {opportunities.length > 0 && (
        <div>
          <h3 className="mb-4 text-sm font-semibold text-emerald-800">
            Best practice opportunities ({opportunities.length})
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {opportunities.map((rec) => (
              <RecommendationCard key={`${rec.hotel_name}-win`} recommendation={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
