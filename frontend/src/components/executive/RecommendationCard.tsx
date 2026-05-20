"use client";

import { useState } from "react";

import {
  PRIORITY_STYLES,
  TRIGGER_LABELS,
  type ExecutiveRecommendation,
} from "@/lib/executive";
import { HotelLink } from "@/components/ui/HotelLink";

type Props = {
  recommendation: ExecutiveRecommendation;
};

const SEVERITY_STYLES = {
  critical: "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50",
  high: "text-orange-800 bg-orange-50 dark:text-orange-300 dark:bg-orange-950/50",
  moderate: "text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50",
  low: "text-emerald-800 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50",
};

export function RecommendationCard({ recommendation }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const styles = PRIORITY_STYLES[recommendation.priority];

  const toggleCheck = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <article
      className={`sh-card flex flex-col p-5 ${styles.border}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold sh-heading">
            <HotelLink name={recommendation.hotel_name} />
          </h3>
          <p className="mt-0.5 text-xs sh-label">
            {TRIGGER_LABELS[recommendation.trigger_type]}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}>
            {styles.label} priority
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${SEVERITY_STYLES[recommendation.risk_severity]}`}
          >
            {recommendation.risk_severity} severity
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{recommendation.issue_summary}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {recommendation.operational_categories.map((cat) => (
          <span
            key={cat}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {cat}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs sh-label">
        Suggested owner:{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-200">{recommendation.suggested_owner}</span>
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide sh-label">
          Recommended actions
        </p>
        <ul className="mt-2 space-y-1.5">
          {recommendation.recommended_actions.map((action) => (
            <li key={action} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="text-indigo-500">→</span>
              {action}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide sh-label">
          Action checklist
        </p>
        <ul className="mt-2 space-y-2">
          {recommendation.action_checklist.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(checked[item.id])}
                  onChange={() => toggleCheck(item.id)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={checked[item.id] ? "line-through text-slate-400" : ""}>
                  {item.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
