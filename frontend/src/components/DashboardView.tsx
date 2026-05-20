"use client";

import type { UploadResponse } from "@/lib/api";

import { FlashDataTable } from "./FlashDataTable";

type Props = {
  result: UploadResponse;
};

export function DashboardView({ result }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm sh-subtext">
        Just imported:{" "}
        <span className="font-medium sh-heading">{result.report_date}</span>
        {" · "}
        {result.filename}
      </p>
      <FlashDataTable rows={result.rows} metric={result.metric} filename={result.filename} />
    </div>
  );
}
