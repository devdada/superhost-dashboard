import { DarkModeToggle } from "@/components/theme/DarkModeToggle";

type Props = {
  eyebrow?: string;
  title: string;
  badge?: string;
  children?: React.ReactNode;
};

export function AppHeader({ eyebrow = "Superhost", title, badge = "Local MVP", children }: Props) {
  return (
    <header className="sh-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {eyebrow}
          </p>
          <h1 className="sh-heading text-2xl font-bold">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {children}
          {badge && (
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:inline">
              {badge}
            </span>
          )}
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
}
