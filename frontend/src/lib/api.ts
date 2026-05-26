import { apiUrl } from "@/lib/auth";

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

export type BatchUploadProgress = {
  phase: "uploading" | "processing" | "complete";
  percent: number;
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
  options?: {
    replaceExisting?: boolean;
    onProgress?: (progress: BatchUploadProgress) => void;
  },
): Promise<BatchUploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const replace = options?.replaceExisting ? "true" : "false";
  const onProgress = options?.onProgress;

  return new Promise<BatchUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(`/upload/batch?replace_existing=${replace}`));
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.max(5, Math.min(80, Math.round((event.loaded / event.total) * 80)));
      onProgress?.({ phase: "uploading", percent });
    };

    xhr.upload.onload = () => {
      onProgress?.({ phase: "processing", percent: 82 });
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed"));
    };

    xhr.onload = () => {
      const responseText = xhr.responseText || "{}";

      if (xhr.status < 200 || xhr.status >= 300) {
        let detail: unknown = "Batch upload failed";
        try {
          const body = JSON.parse(responseText) as { detail?: unknown };
          detail = body.detail ?? detail;
        } catch {
          /* ignore */
        }
        reject(new Error(formatUploadError(detail)));
        return;
      }

      const data = JSON.parse(responseText) as BatchUploadResponse;
      onProgress?.({ phase: "complete", percent: 100 });
      resolve({
        ...data,
        imported: data.imported.map((item: UploadResponse) => ({
          ...item,
          report_id: item.report_id,
        })),
      });
    };

    onProgress?.({ phase: "uploading", percent: 0 });
    xhr.send(formData);
  });
}
