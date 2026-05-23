"use client";

import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ReportsInventoryTable } from "@/components/reports/ReportsInventoryTable";
import { UploadPanel } from "@/components/UploadPanel";

export default function ReportsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AppShell
      title="Reports"
      subtitle="Ingest Daily Flash rollups. Enable replace existing dates to re-import all metrics per report date."
    >
      <div className="space-y-10">
        <ReportsInventoryTable refreshKey={refreshKey} />
        <UploadPanel onUploadSuccess={() => setRefreshKey((k) => k + 1)} key={refreshKey} />
      </div>
    </AppShell>
  );
}
