"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_PERIOD,
  formatPeriodRange,
  type DashboardPeriod,
} from "@/lib/dashboard-filters";
import { useDashboardRevision } from "@/hooks/useDashboardRevision";
import { fetchCommandCenter, type CommandCenterData } from "@/lib/command-center";

import { ActionIntelligence } from "./ActionIntelligence";
import { ExecutiveKpiHeader } from "./ExecutiveKpiHeader";
import { PerformerRankings } from "./PerformerRankings";
import { PortfolioHeatmap } from "./PortfolioHeatmap";
import {
  getActivePropertyNames,
  PropertyFilter,
  type PropertyFilterState,
} from "./PropertyFilter";
import {
  isCustomRangeActive,
  ReportDatePicker,
  type CustomDateRange,
} from "./ReportDatePicker";
import { TimelineControl } from "./TimelineControl";
import { TrendVisualization } from "./TrendVisualization";

export function CommandCenterView() {
  const [period, setPeriod] = useState<DashboardPeriod>(DEFAULT_PERIOD);
  const [customDates, setCustomDates] = useState<CustomDateRange>({
    start: null,
    end: null,
  });
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilterState>({ mode: "all" });
  const [knownProperties, setKnownProperties] = useState<string[]>([]);
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (propertyFilter.mode === "subset" && propertyFilter.enabled.size === 0) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    setError(null);
    const active = getActivePropertyNames(propertyFilter);
    try {
      const result = await fetchCommandCenter(period, active, {
        startDate: customDates.start,
        endDate: customDates.end,
      });
      setData(result);
      if (result.available_properties.length > 0) {
        setKnownProperties(result.available_properties);
      }
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, propertyFilter, customDates]);

  useEffect(() => {
    load();
  }, [load]);

  useDashboardRevision(load);

  const customActive = isCustomRangeActive(customDates);
  const periodLabel = data
    ? formatPeriodRange(period, data.range_start, data.range_end, { customActive })
    : "";

  const reportDates =
    data?.available_report_dates?.length
      ? data.available_report_dates
      : data?.latest_report_date
        ? [data.latest_report_date]
        : [];

  const propertiesForUi = knownProperties.length > 0 ? knownProperties : data?.available_properties ?? [];
  const subsetActive =
    propertyFilter.mode === "subset" && propertyFilter.enabled.size > 0;

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex flex-wrap items-center gap-3">
          <span className="sh-label text-[10px]">Timeline</span>
          <TimelineControl
            value={period}
            onChange={(p) => {
              setPeriod(p);
              setCustomDates({ start: null, end: null });
            }}
            disabled={refreshing}
            dimmed={customActive}
          />
          <span className="hidden h-5 w-px bg-slate-300 dark:bg-slate-700 sm:block" aria-hidden />
          <span className="sh-label text-[10px]">Date range</span>
          <ReportDatePicker
            value={customDates}
            availableDates={reportDates}
            onChange={setCustomDates}
            onClear={() => setCustomDates({ start: null, end: null })}
            disabled={refreshing}
          />
          <span className="hidden h-5 w-px bg-slate-300 dark:bg-slate-700 sm:block" aria-hidden />
          <span className="sh-label text-[10px]">Properties</span>
          <PropertyFilter
            properties={propertiesForUi}
            value={propertyFilter}
            onChange={setPropertyFilter}
            disabled={refreshing || propertiesForUi.length === 0}
          />
          {data?.latest_report_date && periodLabel && (
            <span className="text-[11px] sh-subtext">
              <strong className="sh-heading">{data.reports_in_period}</strong> reports through{" "}
              <strong className="sh-heading">{data.latest_report_date}</strong>
              <span className="mx-1 text-slate-400">·</span>
              {periodLabel}
              {subsetActive && (
                <>
                  <span className="mx-1 text-slate-400">·</span>
                  {data.selected_properties.length}{" "}
                  {data.selected_properties.length === 1 ? "property" : "properties"}
                </>
              )}
            </span>
          )}
        </div>
        {data && data.stored_metrics.length <= 1 && (
          <a
            href="/reports"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Re-import for all metrics →
          </a>
        )}
      </div>

      {propertyFilter.mode === "subset" && propertyFilter.enabled.size === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          Select at least one property to view analytics.
        </p>
      )}

      {loading && !data && propertyFilter.mode === "all" && (
        <p className="py-16 text-center text-sm sh-subtext">Loading operational intelligence…</p>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </p>
      )}

      {!loading &&
        !error &&
        data &&
        data.reports_in_period === 0 &&
        (propertyFilter.mode === "all" || propertyFilter.enabled.size > 0) && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            {customActive
              ? "No report for this date. Pick another day from the calendar or use a timeline preset (7D, 30D, …)."
              : "No reports in this range."}
          </p>
        )}

      {!loading &&
        !error &&
        data &&
        data.reports_in_period > 0 &&
        (propertyFilter.mode === "all" || propertyFilter.enabled.size > 0) && (
        <>
          {data.kpis.length > 0 && (
            <ExecutiveKpiHeader
              kpis={data.kpis}
              reportsInPeriod={data.reports_in_period}
              periodLabel={periodLabel}
              isLoading={refreshing}
            />
          )}
          <PortfolioHeatmap rows={data.heatmap} />
          <ActionIntelligence alerts={data.action_alerts} />
          <TrendVisualization
            revenueTrend={data.revenue_trend}
            revparTrend={data.revpar_trend}
            scatter={data.occupancy_adr_scatter}
          />
          <PerformerRankings top={data.top_performers} worst={data.worst_performers} />
        </>
      )}
    </div>
  );
}
