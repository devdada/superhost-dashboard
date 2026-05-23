/** Client-side helpers for ingestion UX (server enforces real duplicate checks). */

export function isDuplicateResult(status: string, duplicate: boolean): boolean {
  return duplicate || status === "duplicate";
}

export function statusTone(status: string): string {
  if (status === "parsed" || status === "success") return "text-emerald-600";
  if (status === "duplicate") return "text-amber-600";
  if (status === "partial") return "text-amber-500";
  if (status === "failed") return "text-rose-600";
  return "text-slate-500";
}
