import { useTheme } from "next-themes";

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return {
    isDark,
    grid: isDark ? "#334155" : "#e2e8f0",
    axis: isDark ? "#94a3b8" : "#64748b",
    reference: isDark ? "#64748b" : "#94a3b8",
    tooltip: {
      borderRadius: 8,
      borderColor: isDark ? "#475569" : "#e2e8f0",
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      color: isDark ? "#f1f5f9" : "#0f172a",
    },
  };
}
