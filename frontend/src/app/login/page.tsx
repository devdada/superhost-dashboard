"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DarkModeToggle } from "@/components/theme/DarkModeToggle";
import { fetchCurrentUser, login } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      try {
        const user = await fetchCurrentUser();
        if (cancelled) return;
        if (user) {
          router.replace(next);
          return;
        }
      } catch {
        /* ignore and show login form */
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void checkExistingSession();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <p className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
          Checking session…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
            Superhost
          </p>
          <h1 className="text-lg font-semibold">Admin login</h1>
        </div>
        <DarkModeToggle />
      </div>

      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
        <h2 className="text-2xl font-semibold">Sign in</h2>
        <p className="mt-2 text-sm text-slate-400">
          Use the seeded admin credentials configured on the API service.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await login(email, password);
              const user = await fetchCurrentUser();
              if (!user) {
                throw new Error(
                  "Login succeeded, but the session cookie was not accepted. Redeploy the API with the latest auth cookie settings and confirm CORS_ORIGINS matches your frontend URL exactly.",
                );
              }
              router.replace(next);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-300">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
              placeholder="admin@superhost.local"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-300">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
              placeholder="Password"
              required
            />
          </label>

          {error && (
            <p className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
          <p className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            Loading login…
          </p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
