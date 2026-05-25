import { apiFetch } from "@/lib/auth";

export type ReportInventoryItem = {
  report_id: number;
  report_date: string;
  file_name: string;
  uploaded_at: string;
  hotel_count: number;
  metrics_present: string[];
  metric_row_counts: Record<string, number>;
  parse_status: "full" | "partial" | "revenue_only" | "empty";
  parse_label: string;
  is_complete: boolean;
};

export type ReportInventoryResponse = {
  total: number;
  full_parse_count: number;
  reports: ReportInventoryItem[];
};

export async function fetchReportsInventory(): Promise<ReportInventoryResponse> {
  const response = await apiFetch("/reports/inventory", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load reports inventory");
  }
  return response.json();
}

export function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
