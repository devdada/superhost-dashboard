type Props = {
  score: number;
  label: string;
  size?: "sm" | "lg";
};

export function HealthScoreGauge({ score, label, size = "lg" }: Props) {
  const dim = size === "lg" ? 112 : 80;
  const r = size === "lg" ? 44 : 30;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  const stroke =
    score >= 80
      ? "stroke-emerald-500"
      : score >= 60
        ? "stroke-amber-500"
        : score >= 40
          ? "stroke-orange-500"
          : "stroke-rose-500";

  const text =
    score >= 80
      ? "text-emerald-600"
      : score >= 60
        ? "text-amber-600"
        : score >= 40
          ? "text-orange-600"
          : "text-rose-600";

  const cx = dim / 2;
  const fontSize = size === "lg" ? "text-3xl" : "text-xl";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            className="stroke-slate-200"
            strokeWidth={size === "lg" ? 10 : 8}
          />
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            className={stroke}
            strokeWidth={size === "lg" ? 10 : 8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ width: dim, height: dim }}
        >
          <span className={`font-bold tabular-nums ${fontSize} ${text}`}>{score}</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

