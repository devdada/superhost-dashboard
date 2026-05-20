"use client";

import { useState } from "react";

import { PortfolioOperationalSection } from "@/components/insights/PortfolioOperationalSection";
import { HistoricalTrendsSection } from "@/components/trends/HistoricalTrends";
import { UploadPanel } from "@/components/UploadPanel";

export function CommandCenter() {
  const [refreshKey, setRefreshKey] = useState(0);

  const onUploadSuccess = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-10">
      <PortfolioOperationalSection refreshKey={refreshKey} />
      <HistoricalTrendsSection refreshKey={refreshKey} />
      <UploadPanel onUploadSuccess={onUploadSuccess} />
    </div>
  );
}
