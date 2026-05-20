import type { PropertyIntelligence } from "@/lib/property";

const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-l-rose-500",
  high: "border-l-orange-500",
  moderate: "border-l-amber-500",
  low: "border-l-emerald-500",
};

type Props = {
  data: PropertyIntelligence;
};

export function PropertyRiskDrivers({ data }: Props) {
  return (
    <section className="sh-card p-6">
      <h2 className="text-lg font-bold sh-heading">Risk drivers</h2>
      <p className="mt-1 text-sm sh-subtext">
        Deterministic signals explaining performance pressure on this asset.
      </p>
      {data.risk_drivers.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No material risk drivers flagged.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.risk_drivers.map((driver) => (
            <li
              key={driver.code}
              className={`rounded-lg border border-slate-100 dark:border-slate-800 border-l-4 bg-slate-50/80 px-4 py-3 ${SEVERITY_BORDER[driver.severity] ?? "border-l-slate-400"}`}
            >
              <p className="text-sm font-semibold sh-heading">{driver.label}</p>
              <p className="mt-1 text-sm sh-subtext">{driver.description}</p>
              <span className="mt-2 inline-block text-xs font-medium capitalize text-slate-500">
                {driver.severity} severity
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
