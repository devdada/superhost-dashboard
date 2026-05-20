import { RISK_STATUS_STYLES, type PropertyIntelligence } from "@/lib/property";

import { HealthScoreGauge } from "@/components/kpi/HealthScoreGauge";

type Props = {
  data: PropertyIntelligence;
};

export function PropertyExecutiveSection({ data }: Props) {
  const riskStyle = RISK_STATUS_STYLES[data.risk_status] ?? RISK_STATUS_STYLES.unknown;

  return (
    <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
            Executive summary
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">{data.operational_summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${riskStyle.badge}`}>
              <span className={`h-2 w-2 rounded-full ${riskStyle.dot}`} />
              {data.risk_status_label}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              Rank {data.portfolio_rank} of {data.portfolio_total}
            </span>
            {data.consecutive_misses > 0 && (
              <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs text-rose-200">
                {data.consecutive_misses} consecutive misses
              </span>
            )}
            {data.consecutive_wins > 0 && (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                {data.consecutive_wins} consecutive wins
              </span>
            )}
          </div>
        </div>
        <HealthScoreGauge score={data.health_score} label={`${data.health_label} asset`} />
      </div>
    </section>
  );
}
