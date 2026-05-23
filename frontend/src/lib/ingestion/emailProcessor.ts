/** Validate inbound webhook payloads before proxying to the API. */

export function hasPdfAttachmentHint(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.Attachments)) {
    return p.Attachments.some((a) => {
      const att = a as Record<string, unknown>;
      const name = String(att.Name || "").toLowerCase();
      const type = String(att.ContentType || "");
      return type === "application/pdf" || name.endsWith(".pdf");
    });
  }
  const count = Number(p["attachment-count"] || 0);
  if (count > 0) return true;
  if (Array.isArray(p.attachments)) return true;
  return false;
}
