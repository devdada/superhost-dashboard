export type IngestionItemResult = {
  filename: string;
  status: string;
  report_id: number | null;
  report_date: string | null;
  duplicate: boolean;
  message: string | null;
  parse_confidence: number | null;
};

export type InboundEmailResponse = {
  ok: boolean;
  processed: number;
  duplicates: number;
  failed: number;
  results: IngestionItemResult[];
  dashboard_revision: string | null;
  errors: string[];
};

export type IngestionLogItem = {
  id: number;
  received_at: string;
  parse_started_at: string | null;
  parse_completed_at: string | null;
  sender: string | null;
  subject: string | null;
  attachment_filename: string | null;
  status: string;
  duplicate_detected: boolean;
  parse_confidence: number | null;
  report_id: number | null;
  error_messages: string[];
  provider: string | null;
};

export type IngestionReportItem = {
  id: number;
  report_date: string;
  file_name: string;
  uploaded_at: string;
  source_email: string | null;
  subject: string | null;
  pdf_url: string | null;
  ingestion_status: string;
  parse_confidence: number | null;
  source_type: string;
  metrics_count: number;
};

export type AdminIngestionData = {
  logs: IngestionLogItem[];
  reports: IngestionReportItem[];
  dashboard_revision: string | null;
  last_success_at: string | null;
};
