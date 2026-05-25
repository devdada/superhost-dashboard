import type { AdminIngestionData, InboundEmailResponse } from "@/lib/ingestion/types";
import { apiFetch, apiUrl } from "@/lib/auth";

export async function fetchDashboardRevision(): Promise<string | null> {
  const res = await apiFetch("/dashboard/revision", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { revision: string | null };
  return data.revision ?? null;
}

export async function fetchAdminIngestion(): Promise<AdminIngestionData> {
  const res = await apiFetch("/admin/ingestion", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load ingestion panel");
  return res.json();
}

export async function reprocessReport(reportId: number): Promise<void> {
  const res = await apiFetch(`/admin/ingestion/${reportId}/reprocess`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? "Reprocess failed");
  }
}

export function pdfViewUrl(reportId: number): string {
  return apiUrl(`/admin/ingestion/${reportId}/pdf`);
}

export type { InboundEmailResponse };
