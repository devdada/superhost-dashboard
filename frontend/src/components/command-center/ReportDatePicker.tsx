"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type CustomDateRange = {
  start: string | null;
  end: string | null;
};

type Props = {
  value: CustomDateRange;
  availableDates: string[];
  onChange: (next: CustomDateRange) => void;
  onClear: () => void;
  disabled?: boolean;
};

function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isCustomRangeActive(value: CustomDateRange): boolean {
  return Boolean(value.start);
}

function sortedReportDates(availableDates: string[]): string[] {
  return [...availableDates].sort();
}

function currentReportIndex(sorted: string[], value: CustomDateRange): number {
  if (sorted.length === 0) return -1;
  if (value.start) {
    const idx = sorted.indexOf(value.start);
    if (idx >= 0) return idx;
  }
  return sorted.length - 1;
}

export function ReportDatePicker({
  value,
  availableDates,
  onChange,
  onClear,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rangeMode, setRangeMode] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => sortedReportDates(availableDates), [availableDates]);

  const bounds = useMemo(() => {
    if (sorted.length === 0) return { min: "", max: "" };
    return { min: sorted[0], max: sorted[sorted.length - 1] };
  }, [sorted]);

  const activeIndex = currentReportIndex(sorted, value);
  const canStepBack = activeIndex > 0;
  const canStepForward = activeIndex >= 0 && activeIndex < sorted.length - 1;

  const stepDay = (direction: -1 | 1) => {
    if (sorted.length === 0) return;
    const idx = activeIndex < 0 ? sorted.length - 1 : activeIndex + direction;
    if (idx < 0 || idx >= sorted.length) return;
    const day = sorted[idx];
    onChange({ start: day, end: day });
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (value.start && value.end && value.start !== value.end) {
      setRangeMode(true);
    }
  }, [value.start, value.end]);

  const label = useMemo(() => {
    if (!value.start) return "Calendar";
    if (!rangeMode || !value.end || value.end === value.start) {
      return formatDisplay(value.start);
    }
    return `${formatDisplay(value.start)} – ${formatDisplay(value.end)}`;
  }, [value.start, value.end, rangeMode]);

  const active = isCustomRangeActive(value);

  const navBtnClass =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <div ref={rootRef} className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled || !canStepBack}
        onClick={() => stepDay(-1)}
        className={navBtnClass}
        aria-label="Previous report day"
        title="Previous report day"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            active
              ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
              : "border-slate-300 bg-white sh-heading dark:border-slate-600 dark:bg-slate-900"
          } disabled:opacity-50`}
          aria-expanded={open}
          title="Filter by report date"
        >
          <svg
            className="h-4 w-4 shrink-0 opacity-80"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="max-w-[10rem] truncate">{label}</span>
        </button>

        {open && (
          <div className="absolute left-0 z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider sh-label">
                Report date
              </p>
              <label className="flex items-center gap-1.5 text-[10px] sh-subtext">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600"
                  checked={rangeMode}
                  onChange={(e) => {
                    setRangeMode(e.target.checked);
                    if (!e.target.checked && value.start) {
                      onChange({ start: value.start, end: value.start });
                    }
                  }}
                />
                Range
              </label>
            </div>

            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-[10px] sh-subtext">
                  {rangeMode ? "Start" : "Day"}
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-950"
                  min={bounds.min}
                  max={bounds.max}
                  value={value.start ?? ""}
                  onChange={(e) => {
                    const start = e.target.value || null;
                    onChange({
                      start,
                      end: rangeMode ? value.end ?? start : start,
                    });
                  }}
                />
              </div>
              {rangeMode && (
                <div>
                  <label className="mb-1 block text-[10px] sh-subtext">End</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-950"
                    min={value.start ?? bounds.min}
                    max={bounds.max}
                    value={value.end ?? ""}
                    onChange={(e) => {
                      onChange({
                        start: value.start,
                        end: e.target.value || value.start,
                      });
                    }}
                  />
                </div>
              )}
            </div>

            {sorted.length > 0 && (
              <p className="mt-2 text-[10px] sh-subtext">
                Reports available {bounds.min} – {bounds.max}
              </p>
            )}

            <div className="mt-3 flex justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              <button
                type="button"
                className="text-[10px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                Clear · use timeline
              </button>
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-indigo-500"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={disabled || !canStepForward}
        onClick={() => stepDay(1)}
        className={navBtnClass}
        aria-label="Next report day"
        title="Next report day"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
