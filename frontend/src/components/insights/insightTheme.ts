import type { InsightCategory } from "@/lib/analytics";

export type InsightTheme = {
  label: string;
  border: string;
  bg: string;
  badge: string;
  dot: string;
  itemCard: string;
  emptyText: string;
};

export const INSIGHT_THEMES: Record<InsightCategory, InsightTheme> = {
  critical_risk: {
    label: "Critical Risks",
    border: "border-rose-200 dark:border-rose-900",
    bg: "bg-rose-50/80 dark:bg-rose-950/30",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    dot: "bg-rose-500",
    itemCard:
      "border border-rose-100 bg-white dark:border-rose-900/50 dark:bg-slate-900/90",
    emptyText: "No properties below -10% variance.",
  },
  strong_performer: {
    label: "Strong Performers",
    border: "border-emerald-200 dark:border-emerald-900",
    bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    dot: "bg-emerald-500",
    itemCard:
      "border border-emerald-100 bg-white dark:border-emerald-900/50 dark:bg-slate-900/90",
    emptyText: "No properties at or above +10% variance.",
  },
  watch_list: {
    label: "Watch List",
    border: "border-amber-200 dark:border-amber-900",
    bg: "bg-amber-50/80 dark:bg-amber-950/30",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200",
    dot: "bg-amber-500",
    itemCard:
      "border border-amber-100 bg-white dark:border-amber-900/50 dark:bg-slate-900/90",
    emptyText: "No properties in the -10% to -5% watch band.",
  },
};
