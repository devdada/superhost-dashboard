"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { logout } from "@/lib/auth";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await logout();
        } finally {
          router.replace("/login");
          router.refresh();
          setBusy(false);
        }
      }}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
