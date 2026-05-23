"use client";

import { useEffect, useRef, useState } from "react";

import { fetchDashboardRevision } from "@/lib/ingestion/pdfIngestionService";

const POLL_MS = 30_000;

export function useDashboardRevision(onRevisionChange: () => void) {
  const revisionRef = useRef<string | null>(null);
  const [revision, setRevision] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      const next = await fetchDashboardRevision();
      if (!active) return;
      if (revisionRef.current && next && next !== revisionRef.current) {
        onRevisionChange();
      }
      revisionRef.current = next;
      setRevision(next);
    };

    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [onRevisionChange]);

  return revision;
}
