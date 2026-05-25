import { apiFetch } from "@/lib/auth";

export type FlashMetricRow = {
  hotel: string;
  metric: string;
  forecast: number;
  budget: number;
  variance_percent: number;
};

export type UploadResponse = {
  report_id: number;
  report_date: string;
  filename: string;
  metric: string;
  rows: FlashMetricRow[];
};

export type SkippedDuplicate = {
  filename: string;
  report_date: string;
  reason: string;
};

export type FailedUpload = {
  filename: string;
  error: string;
};

export type BatchUploadResponse = {
  imported: UploadResponse[];
  skipped_duplicates: SkippedDuplicate[];
  failed: FailedUpload[];
  total_submitted: number;
};

function formatUploadError(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: string }).message);
  }
  return JSON.stringify(detail);
}

export async function uploadDailyFlash(file: File): Promise<UploadResponse> {
  const batch = await uploadDailyFlashBatch([file]);
  if (batch.imported.length === 1) {
    return batch.imported[0];
  }
  if (batch.skipped_duplicates.length === 1) {
    const skip = batch.skipped_duplicates[0];
    throw new Error(`${skip.filename}: ${skip.reason} (${skip.report_date})`);
  }
  if (batch.failed.length === 1) {
    throw new Error(batch.failed[0].error);
  }
  throw new Error("Upload failed");
}

export async function uploadDailyFlashBatch(
  files: File[],
  options?: { replaceExisting?: boolean },
): Promise<BatchUploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const replace = options?.replaceExisting ? "true" : "false";
  const response = await apiFetch(`/upload/batch?replace_existing=${replace}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail: unknown = "Batch upload failed";
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(formatUploadError(detail));
  }

  const data = await response.json();
  return {
    ...data,
    imported: data.imported.map((item: UploadResponse) => ({
      ...item,
      report_id: item.report_id,
    })),
  };
}
