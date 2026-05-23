import { NextRequest, NextResponse } from "next/server";

import { hasPdfAttachmentHint } from "@/lib/ingestion/emailProcessor";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const WEBHOOK_SECRET = process.env.INBOUND_EMAIL_WEBHOOK_SECRET ?? "";

/**
 * Postmark / SendGrid / Mailgun inbound webhook → FastAPI ingestion pipeline.
 */
export async function POST(request: NextRequest) {
  const body = await request.arrayBuffer();
  if (!body.byteLength) {
    return NextResponse.json({ ok: false, errors: ["Empty body"] }, { status: 400 });
  }

  let payload: unknown = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      payload = JSON.parse(new TextDecoder().decode(body));
    } catch {
      return NextResponse.json({ ok: false, errors: ["Invalid JSON"] }, { status: 422 });
    }
    if (!hasPdfAttachmentHint(payload)) {
      return NextResponse.json(
        { ok: false, errors: ["No PDF attachment in payload"] },
        { status: 422 },
      );
    }
  }

  const headers: HeadersInit = {
    "Content-Type": contentType || "application/json",
  };
  if (WEBHOOK_SECRET) {
    headers["X-Webhook-Secret"] = WEBHOOK_SECRET;
  }

  const upstream = await fetch(`${API_BASE}/inbound-email`, {
    method: "POST",
    headers,
    body,
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
