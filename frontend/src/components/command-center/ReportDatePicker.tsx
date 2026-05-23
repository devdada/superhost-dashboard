"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MobilePopover } from "@/components/ui/MobilePopover";

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

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function compareIso(a: string, b: string): number {
  return a.localeCompare(b);
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

function monthStart(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

type CalendarCell = {
  iso: string;
  day: number;
  inMonth: boolean;
};

function buildMonthGrid(viewDate: Date): CalendarCell[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, -startPad + i + 1);
    cells.push({ iso: toIso(d), day: d.getDate(), inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    cells.push({ iso: toIso(d), day, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = parseIso(cells[cells.length - 1].iso);
    const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({ iso: toIso(d), day: d.getDate(), inMonth: false });
  }
  return cells;
}

function ReportCalendar({
  value,
  rangeMode,
  onRangeModeChange,
  availableSet,
  bounds,
  sorted,
  onChange,
  onClear,
  onClose,
}: {
  value: CustomDateRange;
  rangeMode: boolean;
  onRangeModeChange: (next: boolean) => void;
  availableSet: Set<string>;
  bounds: { min: string; max: string };
  sorted: string[];
  onChange: (next: CustomDateRange) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const initialView = value.start
    ? parseIso(value.start)
    : sorted.length > 0
      ? parseIso(sorted[sorted.length - 1])
      : new Date();

  const [viewDate, setViewDate] = useState(initialView);
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);

  const cells = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const minMonth = bounds.min ? monthStart(parseIso(bounds.min).getFullYear(), parseIso(bounds.min).getMonth()) : null;
  const maxMonth = bounds.max ? monthStart(parseIso(bounds.max).getFullYear(), parseIso(bounds.max).getMonth()) : null;
  const viewMonth = monthStart(viewDate.getFullYear(), viewDate.getMonth());
  const canPrev = !minMonth || viewMonth > minMonth;
  const canNext = !maxMonth || viewMonth < maxMonth;

  const start = value.start;
  const end = value.end ?? value.start;

  const pickDay = (iso: string) => {
    if (!availableSet.has(iso)) return;
    if (!rangeMode) {
      onChange({ start: iso, end: iso });
      setRangeAnchor(null);
      return;
    }
    const hasSpan = start && end && start !== end;
    if (!rangeAnchor || hasSpan) {
      setRangeAnchor(iso);
      onChange({ start: iso, end: iso });
      return;
    }
    const [lo, hi] =
      compareIso(rangeAnchor, iso) <= 0 ? [rangeAnchor, iso] : [iso, rangeAnchor];
    onChange({ start: lo, end: hi });
    setRangeAnchor(null);
  };

  const dayClass = (iso: string, inMonth: boolean) => {
    const hasReport = availableSet.has(iso);
    const inRange =
      start &&
      end &&
      compareIso(iso, start) >= 0 &&
      compareIso(iso, end) <= 0;
    const isStart = iso === start;
    const isEnd = iso === end;
    const isEdge = isStart || isEnd;

    let cls =
      "relative flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition ";
    if (!inMonth) cls += "text-slate-300 dark:text-slate-600 ";
    else if (!hasReport) cls += "cursor-not-allowed text-slate-300 dark:text-slate-600 ";
    else cls += "cursor-pointer text-slate-800 hover:bg-indigo-500/15 dark:text-slate-100 dark:hover:bg-indigo-500/25 ";
    if (hasReport && inRange && rangeMode && start !== end) {
      cls += "bg-indigo-500/15 dark:bg-indigo-500/20 ";
    }
    if (hasReport && isEdge) {
      cls += "bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 ";
    }
    return cls;
  };

  return (
    <div className="w-full max-w-[18.5rem]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setViewDate((d) => addMonths(d, -1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
            aria-label="Previous month"
          >
            ‹
          </button>
          <p className="min-w-[7.5rem] text-center text-sm font-semibold sh-heading">{monthLabel}</p>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium sh-subtext">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-indigo-600"
            checked={rangeMode}
            onChange={(e) => {
              onRangeModeChange(e.target.checked);
              setRangeAnchor(null);
              if (!e.target.checked && value.start) {
                onChange({ start: value.start, end: value.start });
              }
            }}
          />
          Range
        </label>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-[10px] font-semibold uppercase tracking-wide sh-label">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => (
          <button
            key={`${cell.iso}-${i}`}
            type="button"
            disabled={!cell.inMonth || !availableSet.has(cell.iso)}
            onClick={() => pickDay(cell.iso)}
            className={dayClass(cell.iso, cell.inMonth)}
          >
            {cell.day}
          </button>
        ))}
      </div>

      {sorted.length > 0 && (
        <p className="mt-3 text-[10px] sh-subtext">
          Selectable dates have flash reports · {bounds.min} – {bounds.max}
        </p>
      )}

      <div className="mt-3 flex justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        <button
          type="button"
          className="text-[10px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          onClick={() => {
            onClear();
            setRangeAnchor(null);
            onClose();
          }}
        >
          Clear · use timeline
        </button>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-1 text-[10px] font-semibold text-white hover:bg-indigo-500"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
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
  const availableSet = useMemo(() => new Set(sorted), [sorted]);

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
    if (!value.start) return "Select dates";
    if (!rangeMode || !value.end || value.end === value.start) {
      return formatDisplay(value.start);
    }
    return `${formatDisplay(value.start)} – ${formatDisplay(value.end)}`;
  }, [value.start, value.end, rangeMode]);

  const active = isCustomRangeActive(value);

  const navBtnClass =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <div ref={rootRef} className="flex min-w-0 max-w-full items-center gap-1">
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

      <div className="relative min-w-0 flex-1 sm:flex-none">
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
          title="Select report date range"
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
          <span className="min-w-0 flex-1 truncate sm:max-w-[11rem]">{label}</span>
        </button>

        <MobilePopover
          open={open}
          onClose={() => setOpen(false)}
          desktopPanelClassName="absolute left-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <ReportCalendar
            value={value}
            rangeMode={rangeMode}
            onRangeModeChange={setRangeMode}
            availableSet={availableSet}
            bounds={bounds}
            sorted={sorted}
            onChange={onChange}
            onClear={onClear}
            onClose={() => setOpen(false)}
          />
        </MobilePopover>
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
