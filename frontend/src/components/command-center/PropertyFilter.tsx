"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PropertyFilterState =
  | { mode: "all" }
  | { mode: "subset"; enabled: Set<string> };

type Props = {
  properties: string[];
  value: PropertyFilterState;
  onChange: (next: PropertyFilterState) => void;
  disabled?: boolean;
};

export function getActivePropertyNames(state: PropertyFilterState): string[] | undefined {
  if (state.mode === "all") return undefined;
  if (state.enabled.size === 0) return [];
  return [...state.enabled].sort();
}

export function propertyFilterLabel(
  properties: string[],
  state: PropertyFilterState,
): string {
  if (state.mode === "all" || state.enabled.size === properties.length) {
    return "All properties";
  }
  if (state.enabled.size === 0) return "No properties";
  if (state.enabled.size === 1) return [...state.enabled][0];
  return `${state.enabled.size} properties`;
}

export function PropertyFilter({ properties, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const enabledSet = value.mode === "all" ? new Set(properties) : value.enabled;
  const allSelected = enabledSet.size === properties.length;
  const label = propertyFilterLabel(properties, value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const sorted = useMemo(() => [...properties].sort((a, b) => a.localeCompare(b)), [properties]);

  const setAll = () => onChange({ mode: "all" });

  const toggleHotel = (name: string) => {
    const base = value.mode === "all" ? new Set(properties) : new Set(value.enabled);
    if (base.has(name)) {
      base.delete(name);
    } else {
      base.add(name);
    }
    if (base.size === properties.length) {
      onChange({ mode: "all" });
      return;
    }
    onChange({ mode: "subset", enabled: base });
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange({ mode: "subset", enabled: new Set() });
    } else {
      setAll();
    }
  };

  if (properties.length === 0) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-[10rem] max-w-[14rem] items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-left text-xs font-medium sh-heading dark:border-slate-600 dark:bg-slate-900 disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{label}</span>
        <span className="sh-subtext" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 z-50 mt-1 max-h-72 w-80 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          role="listbox"
        >
          <label className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-semibold sh-heading hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/80">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-indigo-600"
              checked={allSelected}
              onChange={toggleAll}
            />
            All properties
          </label>
          {sorted.map((name) => (
            <label
              key={name}
              className="flex cursor-pointer items-start gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <input
                type="checkbox"
                className="mt-0.5 shrink-0 rounded border-slate-300 text-indigo-600"
                checked={enabledSet.has(name)}
                onChange={() => toggleHotel(name)}
              />
              <span className="leading-snug sh-heading">{name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
