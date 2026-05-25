import Link from "next/link";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { DarkModeToggle } from "@/components/theme/DarkModeToggle";

type Props = {
  hotelName: string;
  children: React.ReactNode;
};

export function PropertyLayout({ hotelName, children }: Props) {
  return (
    <RequireAuth>
      <div className="sh-page">
        <header className="sh-header">
          <div className="mx-auto max-w-6xl px-6 py-4">
            <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm sh-label">
              <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                Analytics
              </Link>
              <span>/</span>
              <span>Properties</span>
              <span>/</span>
              <span className="font-medium sh-heading">{hotelName}</span>
            </nav>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Property intelligence
                </p>
                <h1 className="sh-heading text-2xl font-bold">{hotelName}</h1>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  ← Analytics
                </Link>
                <LogoutButton />
                <DarkModeToggle />
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] space-y-8 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </RequireAuth>
  );
}
