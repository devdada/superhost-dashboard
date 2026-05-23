import Link from "next/link";

import { DarkModeToggle } from "@/components/theme/DarkModeToggle";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const NAV = [
  { href: "/", label: "Analytics" },
  { href: "/reports", label: "Reports" },
  { href: "/admin/ingestion", label: "Ingestion" },
];

export function AppShell({ title, subtitle, children }: Props) {
  return (
    <div className="sh-page">
      <header className="sh-header">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-10">
            <Link href="/" className="group flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                Superhost
              </span>
              <span className="text-sm font-semibold sh-heading">Dashboard</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 md:inline">
              Live intelligence
            </span>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <div className="sh-shell">
        <div className="mb-10 sh-animate-in">
          <h1 className="text-3xl font-semibold tracking-tight sh-heading lg:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-base sh-subtext">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
