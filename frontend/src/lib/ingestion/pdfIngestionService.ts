import type { AdminIngestionData, InboundEmailResponse } from "@/lib/ingestion/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "";

function adminHeaders(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (ADMIN_KEY) h["X-Admin-Key"] = ADMIN_KEY;
  return h;
}

export async function fetchDashboardRevision(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/dashboard/revision`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { revision: string | null };
  return data.revision ?? null;
}

export async function fetchAdminIngestion(): Promise<AdminIngestionData> {
  const res = await fetch(`${API_BASE}/admin/ingestion`, {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load ingestion panel");
  return res.json();
}

export async function reprocessReport(reportId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/ingestion/${reportId}/reprocess`, {
    method: "POST",
    headers: adminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? "Reprocess failed");
  }
}

export function pdfViewUrl(reportId: number): string {
  return `${API_BASE}/admin/ingestion/${reportId}/pdf`;
}

export type { InboundEmailResponse };
