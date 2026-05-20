"use client";

import { useCallback, useEffect, useState } from "react";

import { ExecutiveRecommendations } from "@/components/executive/ExecutiveRecommendations";
import { fetchPropertyIntelligence, slugToHotel, type PropertyIntelligence } from "@/lib/property";

import { PropertyBenchmarks } from "./PropertyBenchmarks";
import { PropertyExecutiveSection } from "./PropertyExecutiveSection";
import { PropertyKpiSection } from "./PropertyKpiSection";
import { PropertyLayout } from "./PropertyLayout";
import { PropertyRiskDrivers } from "./PropertyRiskDrivers";

type Props = {
  hotelSlug: string;
};

export function PropertyPage({ hotelSlug }: Props) {
  const [data, setData] = useState<PropertyIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hotelName = slugToHotel(hotelSlug);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPropertyIntelligence(hotelSlug));
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load property");
    } finally {
      setLoading(false);
    }
  }, [hotelSlug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PropertyLayout hotelName={hotelName}>
      {loading && (
        <p className="sh-card px-4 py-12 text-center text-sm sh-subtext">
          Loading property intelligence…
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </p>
      )}

      {!loading && !error && data && (
        <>
          <PropertyExecutiveSection data={data} />

          <section className="sh-card p-6">
            <h2 className="text-lg font-bold sh-heading">Property health score</h2>
            <p className="mt-1 text-sm sh-subtext">
              0–100 composite based on variance history, streaks, volatility, and portfolio rank.
            </p>
            <p className="mt-4 text-4xl font-bold tabular-nums sh-heading">
              {data.health_score}
              <span className="ml-2 text-lg font-medium sh-label">/ 100 · {data.health_label}</span>
            </p>
          </section>

          <PropertyKpiSection data={data} />
          <PropertyRiskDrivers data={data} />
          <PropertyBenchmarks data={data} />

          {data.recommendations.length > 0 && (
            <section className="sh-card p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Action intelligence
              </p>
              <h2 className="text-xl font-bold sh-heading">Executive Recommendations</h2>
              <p className="mt-1 text-sm sh-subtext">
                Property-specific actions for {data.hotel_name} — priority, owner, and checklist.
              </p>
              <div className="mt-6">
                <ExecutiveRecommendations recommendations={data.recommendations} />
              </div>
            </section>
          )}
        </>
      )}
    </PropertyLayout>
  );
}
