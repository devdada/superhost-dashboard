"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { fetchCurrentUser, type AuthUser } from "@/lib/auth";

type Props = {
  children: ReactNode;
};

type AuthState =
  | { status: "loading"; user: null; error: null }
  | { status: "authenticated"; user: AuthUser; error: null }
  | { status: "error"; user: null; error: string };

export function RequireAuth({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    error: null,
  });

  const next = useMemo(() => {
    if (!pathname || pathname === "/login") return "/";
    return pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const user = await fetchCurrentUser();
        if (cancelled) return;
        if (!user) {
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setState({ status: "authenticated", user, error: null });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          user: null,
          error: error instanceof Error ? error.message : "Failed to verify login",
        });
      }
    }

    void checkSession();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm sh-subtext dark:border-slate-700 dark:bg-slate-900">
          Checking session…
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="max-w-md rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {state.error}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
