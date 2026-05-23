"""Executive command center dashboard aggregation."""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from statistics import mean
from types import SimpleNamespace

from sqlalchemy.orm import Session

from app.formatters import (
    fmt_currency,
    fmt_executive_currency_delta,
    fmt_level_percent,
    fmt_points_delta,
    fmt_variance_percent,
)
from app.insight_validation import (
    ALERT_METRICS,
    alert_confidence,
    forecast_accuracy_is_meaningful,
    is_valid_metric_row,
    is_valid_variance,
    passes_alert_threshold,
    safe_incremental_variance,
)
from app.query_filters import normalize_period
from app.repositories.report_repository import (
    filter_metrics_by_name,
    get_baseline_report_for_range,
    list_distinct_hotel_names,
    list_distinct_metrics,
    get_report_before_date,
    list_reports_in_period,
)
from app.schemas.command_center import (
    ActionAlert,
    CommandCenterResponse,
    ExecutiveKpiCard,
    HeatmapRow,
    KpiSparklinePoint,
    OccupancyAdrBubble,
    PerformerCard,
    RevenueTrendPoint,
    RevparTrendPoint,
)
from app.query_filters import resolve_filter_range
from app.repositories.report_repository import list_report_dates

CRITICAL = -10.0
WATCH_HIGH = -5.0
STRONG = 10.0

METRIC_KEYS = {
    "Revenue": "revenue",
    "Room Revenue": "room_revenue",
    "Occupancy": "occupancy",
    "ADR": "adr",
    "RevPAR": "revpar",
    "F&B": "fnb",
}


def _fmt_pct(v: float, signed: bool = True) -> str:
    if signed:
        return fmt_variance_percent(v)
    return fmt_level_percent(v)


def _direction(delta: float | None) -> str | None:
    if delta is None:
        return None
    if delta > 0.05:
        return "up"
    if delta < -0.05:
        return "down"
    return "flat"


def _filter_reports_by_hotels(reports: list, hotels: frozenset[str] | None) -> list:
    """Return lightweight report views containing only selected hotel metrics."""
    if hotels is None:
        return reports
    if len(hotels) == 0:
        return []
    filtered: list = []
    for report in reports:
        metrics = [m for m in report.metrics if m.hotel_name in hotels]
        if metrics:
            filtered.append(
                SimpleNamespace(
                    report_date=report.report_date,
                    metrics=metrics,
                    uploaded_at=getattr(report, "uploaded_at", None),
                )
            )
    return filtered


def _metrics_map(report) -> dict[str, list]:
    by_hotel: dict[str, dict[str, object]] = defaultdict(dict)
    for m in report.metrics:
        by_hotel[m.hotel_name][m.metric] = m
    return by_hotel


def _portfolio_sums(report, metric: str) -> tuple[float, float, float, float]:
    rows = filter_metrics_by_name(report.metrics, metric)
    if not rows:
        return 0.0, 0.0, 0.0, 0.0
    forecast = sum(m.forecast for m in rows)
    budget = sum(m.budget for m in rows)
    avg_var = mean(m.variance_percent for m in rows)
    return forecast, budget, avg_var, float(len(rows))


INCREMENTAL_METRICS = frozenset({"Revenue", "Room Revenue", "F&B"})


def _portfolio_total(report, metric: str) -> float | None:
    forecast, _, _, n = _portfolio_sums(report, metric)
    return forecast if n else None


def _portfolio_variance(report, metric: str) -> float | None:
    _, _, avg_var, n = _portfolio_sums(report, metric)
    return avg_var if n else None


def _hotel_mean(report, metric: str) -> float | None:
    rows = filter_metrics_by_name(report.metrics, metric)
    return mean(m.forecast for m in rows) if rows else None


def _hotel_increment(end_row, start_row) -> SimpleNamespace | None:
    if not is_valid_metric_row(end_row):
        return None
    e_f = end_row.forecast
    s_f = start_row.forecast if start_row else 0.0
    e_b = end_row.budget
    s_b = start_row.budget if start_row else 0.0
    delta_f = e_f - s_f
    delta_b = e_b - s_b
    variance = safe_incremental_variance(delta_f, delta_b)
    if variance is None and is_valid_variance(end_row.variance_percent):
        if abs(delta_f) >= 1e-6 and abs(e_b) >= 1e-6:
            variance = end_row.variance_percent
        else:
            return None
    if variance is None:
        return None
    return SimpleNamespace(forecast=delta_f, budget=delta_b, variance_percent=variance)


def _hotel_period_average(rows: list) -> SimpleNamespace:
    return SimpleNamespace(
        forecast=mean(m.forecast for m in rows),
        budget=mean(m.budget for m in rows),
        variance_percent=mean(m.variance_percent for m in rows),
    )


def _prior_chain_report(
    session: Session,
    reports: list,
    baseline,
    comparison_prior,
):
    """Report whose PTD anchors the prior day's daily increment."""
    if len(reports) >= 2 and comparison_prior.report_date == reports[-2].report_date:
        idx = len(reports) - 2
        if idx > 0:
            return reports[idx - 1]
        return baseline
    return get_report_before_date(session, comparison_prior.report_date)


def _delta_of_daily_increments(
    session: Session,
    *,
    latest,
    comparison_prior,
    reports: list,
    baseline,
    metric: str,
) -> float | None:
    """Change in one day's actual vs the previous report day's actual (not raw daily PTD delta)."""
    last_inc = _daily_portfolio_increment(latest, comparison_prior, metric)
    if last_inc is None:
        return None
    prior_chain = _prior_chain_report(session, reports, baseline, comparison_prior)
    prior_inc = _daily_portfolio_increment(comparison_prior, prior_chain, metric)
    if prior_inc is None:
        return None
    return last_inc - prior_inc


def _daily_portfolio_increment(
    report,
    prev_report,
    metric: str,
) -> float | None:
    cur = _portfolio_total(report, metric)
    if cur is None:
        return None
    if prev_report is None:
        return None
    if prev_report.report_date.month != report.report_date.month:
        return cur
    prev = _portfolio_total(prev_report, metric) or 0.0
    return cur - prev


def _daily_portfolio_budget_increment(
    report,
    prev_report,
    metric: str,
) -> float | None:
    _, cur_b, _, n = _portfolio_sums(report, metric)
    if not n:
        return None
    if prev_report is None:
        return None
    _, prev_b, _, _ = _portfolio_sums(prev_report, metric)
    if prev_report.report_date.month != report.report_date.month:
        return cur_b
    return cur_b - (prev_b or 0.0)


def _period_incremental_actual_and_budget(
    reports: list,
    baseline,
    metric: str,
) -> tuple[float, float] | None:
    """
    Sum daily actual and budget increments across the period.

    PTD values reset each month — never subtract end-of-period PTD from start-of-period
    when the range crosses a month boundary.
    """
    if not reports:
        return None
    if len(reports) == 1 and baseline is None:
        total = _portfolio_total(reports[0], metric)
        _, budget, _, n = _portfolio_sums(reports[0], metric)
        if total is None or not n:
            return None
        return total, budget

    total_a = 0.0
    total_b = 0.0
    any_inc = False
    prev = baseline
    for report in reports:
        inc_a = _daily_portfolio_increment(report, prev, metric)
        inc_b = _daily_portfolio_budget_increment(report, prev, metric)
        if inc_a is not None and inc_b is not None:
            total_a += inc_a
            total_b += inc_b
            any_inc = True
        prev = report
    if any_inc:
        return total_a, total_b
    return None


def _incremental_portfolio_total(reports: list, baseline, metric: str) -> float | None:
    """Revenue (etc.) earned in the selected period from PTD deltas."""
    totals = _period_incremental_actual_and_budget(reports, baseline, metric)
    return totals[0] if totals else None


def _incremental_portfolio_variance(reports: list, baseline, metric: str) -> float | None:
    totals = _period_incremental_actual_and_budget(reports, baseline, metric)
    if not totals:
        return _portfolio_variance(reports[-1], metric) if reports else None
    total_a, total_b = totals
    variance = safe_incremental_variance(total_a, total_b)
    if variance is not None:
        return variance
    return _portfolio_variance(reports[-1], metric) if reports else None


def _period_avg_hotel_mean(reports: list, metric: str) -> float | None:
    vals = [_hotel_mean(r, metric) for r in reports]
    vals = [v for v in vals if v is not None]
    return mean(vals) if vals else None


def _build_period_hotel_metrics(reports: list, baseline) -> dict[str, dict[str, object]]:
    """Per-hotel metrics scoped to the timeline (incremental $, averaged levels)."""
    if not reports:
        return {}
    end_map = _metrics_map(reports[-1])
    if baseline is not None:
        start_map = _metrics_map(baseline)
    elif len(reports) > 1:
        start_map = _metrics_map(reports[0])
    else:
        start_map = {}

    accum: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
    for report in reports:
        for m in report.metrics:
            accum[m.hotel_name][m.metric].append(m)

    result: dict[str, dict[str, object]] = defaultdict(dict)
    for hotel, by_metric in accum.items():
        for metric, rows in by_metric.items():
            if metric in INCREMENTAL_METRICS:
                end_row = end_map.get(hotel, {}).get(metric)
                if end_row:
                    start_row = start_map.get(hotel, {}).get(metric)
                    inc = _hotel_increment(end_row, start_row)
                    if inc is not None:
                        result[hotel][metric] = inc
            else:
                avg = _hotel_period_average(rows)
                if is_valid_metric_row(avg):
                    result[hotel][metric] = avg
    return result


def _sparkline_daily_increments(
    reports: list, baseline, metric: str, *, portfolio: bool = True
) -> list[KpiSparklinePoint]:
    points: list[KpiSparklinePoint] = []
    prev_report = baseline
    for report in reports:
        if portfolio:
            inc = _daily_portfolio_increment(report, prev_report, metric)
        else:
            cur = _period_sparkline_hotel_mean(report, metric)
            prev_val = (
                _period_sparkline_hotel_mean(prev_report, metric) if prev_report else None
            )
            inc = (cur - prev_val) if cur is not None and prev_val is not None else None
        if inc is not None:
            points.append(
                KpiSparklinePoint(
                    report_date=report.report_date.isoformat(),
                    value=round(inc, 2),
                )
            )
        prev_report = report
    return points[-8:]


def _status_from_variance(v: float | None) -> tuple[int, str]:
    if v is None:
        return 50, "neutral"
    if v <= CRITICAL:
        return max(0, int(40 + v)), "critical"
    if v <= WATCH_HIGH:
        return 55, "watch"
    if v >= STRONG:
        return min(100, int(70 + min(v, 30))), "outperforming"
    return 60, "neutral"


def _explanation(hotel: str, metric: str, variance: float, occ_var: float | None) -> str:
    parts = [f"{metric} is {abs(variance):.1f}% {'below' if variance < 0 else 'above'} budget."]
    if occ_var is not None and metric != "Occupancy":
        if occ_var <= WATCH_HIGH:
            parts.append("Occupancy deterioration may be weighing on topline.")
        elif occ_var >= STRONG:
            parts.append("Occupancy strength is supporting performance.")
    if metric == "Occupancy" and variance <= CRITICAL:
        parts.append("Demand pacing is materially behind plan — review group and transient pace.")
    if metric == "ADR" and variance <= CRITICAL:
        parts.append("Rate realization is soft — evaluate comp set positioning and discounting.")
    if metric == "RevPAR" and variance <= CRITICAL:
        parts.append("RevPAR compression signals combined rate and occupancy pressure.")
    return " ".join(parts)


def _recommended_action(metric: str, variance: float) -> str:
    if variance <= CRITICAL:
        actions = {
            "Revenue": "Immediate revenue meeting: reset weekly pace targets and sales deployment.",
            "Occupancy": "Audit channel mix, group pickup, and cancellation trends with the GM.",
            "ADR": "Pricing war-room: align BAR/LRA strategy with comp set for next 14 days.",
            "RevPAR": "Cross-functional recovery plan across RM and operations within 48 hours.",
            "F&B": "Review outlet covers, menu mix, and banquet pipeline vs forecast.",
        }
        return actions.get(metric, "Escalate to regional leadership for operational review.")
    if variance <= WATCH_HIGH:
        return "Weekly checkpoint with property leadership until variance stabilizes."
    if variance >= STRONG:
        return "Capture best practices and monitor for sustainability — avoid complacency."
    return "Continue monitoring; no immediate intervention required."


def _severity_for_variance(v: float) -> str | None:
    if v <= CRITICAL:
        return "critical"
    if v >= STRONG:
        return "strong"
    if WATCH_HIGH <= v < 0:
        return "watch"
    return None


def _build_action_alerts(
    by_hotel_period: dict,
    *,
    reports_in_period: int,
) -> list[ActionAlert]:
    alerts: list[ActionAlert] = []
    idx = 0
    for hotel, metrics in sorted(by_hotel_period.items()):
        for metric_name, row in metrics.items():
            if metric_name not in ALERT_METRICS:
                continue
            if not is_valid_metric_row(row):
                continue
            v = row.variance_percent
            if not is_valid_variance(v):
                continue
            confidence = alert_confidence(
                metric=metric_name,
                row=row,
                reports_in_period=reports_in_period,
            )
            if not passes_alert_threshold(confidence):
                continue
            severity = _severity_for_variance(v)
            if not severity:
                continue

            occ = metrics.get("Occupancy")
            occ_var = occ.variance_percent if occ and is_valid_variance(occ.variance_percent) else None
            idx += 1
            alerts.append(
                ActionAlert(
                    id=f"alert-{idx}",
                    severity=severity,
                    hotel_name=hotel,
                    metric=metric_name,
                    variance_percent=round(v, 2),
                    confidence=round(confidence, 2),
                    headline=f"{metric_name} {fmt_variance_percent(v)} vs budget",
                    explanation=_explanation(hotel, metric_name, v, occ_var),
                    recommended_action=_recommended_action(metric_name, v),
                )
            )

    order = {"critical": 0, "watch": 1, "strong": 2}
    alerts.sort(key=lambda a: (order.get(a.severity, 9), a.variance_percent))
    return alerts[:24]


def _build_heatmap(by_hotel: dict) -> list[HeatmapRow]:
    rows: list[HeatmapRow] = []
    for hotel, metrics in sorted(by_hotel.items()):
        rev = metrics.get("Revenue")
        occ = metrics.get("Occupancy")
        adr = metrics.get("ADR")
        revpar = metrics.get("RevPAR")
        fnb = metrics.get("F&B")

        rev_var = rev.variance_percent if rev and is_valid_variance(rev.variance_percent) else None
        rp_var = (
            revpar.variance_percent
            if revpar and is_valid_variance(revpar.variance_percent)
            else None
        )
        score, status = _status_from_variance(rev_var)
        if occ and is_valid_variance(occ.variance_percent) and occ.variance_percent <= CRITICAL:
            score = min(score, 35)
            status = "critical"
        elif rp_var is not None and rp_var <= CRITICAL:
            score = min(score, 40)
            status = "critical"

        rows.append(
            HeatmapRow(
                hotel_name=hotel,
                revenue=rev.forecast if rev else None,
                occupancy=occ.forecast if occ else None,
                adr=adr.forecast if adr else None,
                revpar=revpar.forecast if revpar else None,
                fnb_variance=(
                    fnb.variance_percent
                    if fnb and is_valid_variance(fnb.variance_percent)
                    else None
                ),
                variance_vs_budget=rev_var,
                variance_vs_forecast=rp_var,
                status_score=score,
                status=status,
            )
        )
    rows.sort(key=lambda r: (r.variance_vs_budget if r.variance_vs_budget is not None else 0))
    return rows


def _period_sparkline_hotel_mean(report, metric: str) -> float | None:
    rows = filter_metrics_by_name(report.metrics, metric)
    return mean(m.forecast for m in rows) if rows else None


def _sparkline(reports: list, metric: str, aggregator) -> list[KpiSparklinePoint]:
    points: list[KpiSparklinePoint] = []
    for report in reports[-8:]:
        value = aggregator(report, metric)
        if value is not None:
            points.append(
                KpiSparklinePoint(report_date=report.report_date.isoformat(), value=round(value, 2))
            )
    return points


def build_command_center(
    session: Session,
    *,
    period: str | None = None,
    reference: date | None = None,
    properties: frozenset[str] | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> CommandCenterResponse:
    period_name, range_start, range_end = resolve_filter_range(
        period,
        reference=reference,
        start_date=start_date,
        end_date=end_date,
    )
    report_dates = [d.isoformat() for d in list_report_dates(session)]
    available_properties = list_distinct_hotel_names(session)
    active_properties: frozenset[str] | None = None
    selected_list: list[str] = []
    if properties is not None:
        valid = frozenset(available_properties) & properties
        active_properties = valid
        selected_list = sorted(valid)

    reports = _filter_reports_by_hotels(
        list_reports_in_period(
            session,
            period_name,
            reference=reference,
            range_start=range_start,
            range_end=range_end,
        ),
        active_properties,
    )
    stored = list_distinct_metrics(session)

    latest = reports[-1] if reports else None
    prior = reports[-2] if len(reports) >= 2 else None
    comparison_prior = (
        prior
        if len(reports) >= 2
        else (get_report_before_date(session, latest.report_date) if latest else None)
    )
    baseline_raw = (
        get_baseline_report_for_range(
            session,
            range_start=range_start,
            period_end=latest.report_date,
        )
        if latest and range_start
        else None
    )
    baseline = (
        _filter_reports_by_hotels([baseline_raw], properties)[0]
        if baseline_raw and active_properties
        else baseline_raw
    )

    empty = CommandCenterResponse(
        period=period_name,
        range_start=range_start,
        range_end=range_end,
        reports_in_period=0,
        latest_report_date=None,
        prior_report_date=None,
        available_properties=available_properties,
        selected_properties=selected_list,
        available_report_dates=report_dates,
        stored_metrics=stored,
        kpis=[],
        action_alerts=[],
        heatmap=[],
        revenue_trend=[],
        revpar_trend=[],
        occupancy_adr_scatter=[],
        top_performers=[],
        worst_performers=[],
    )

    if not latest:
        return empty

    by_hotel_period = _build_period_hotel_metrics(reports, baseline)
    alerts = _build_action_alerts(by_hotel_period, reports_in_period=len(reports))
    heatmap = _build_heatmap(by_hotel_period)

    # Flash PDFs are month-to-date cumulative; scope KPIs to the selected window.
    rev_f = _incremental_portfolio_total(reports, baseline, "Revenue") or 0.0
    rev_var = _incremental_portfolio_variance(reports, baseline, "Revenue") or 0.0
    occ_level = _period_avg_hotel_mean(reports, "Occupancy")
    adr_avg = _period_avg_hotel_mean(reports, "ADR")
    revpar_avg = _period_avg_hotel_mean(reports, "RevPAR")
    fnb_incremental_var = (
        _incremental_portfolio_variance(reports, baseline, "F&B") if "F&B" in stored else None
    )
    fnb_ptd_var = _portfolio_variance(latest, "F&B") if "F&B" in stored else None

    single_day_view = len(reports) == 1

    first_snapshot_var = _portfolio_variance(reports[0], "Revenue") if reports else None
    last_snapshot_var = _portfolio_variance(latest, "Revenue")
    # Calendar day view should match the flash PDF PTD variance columns, not derived daily %.
    rev_var_kpi = (
        last_snapshot_var
        if single_day_view and last_snapshot_var is not None
        else rev_var
    )
    fnb_var_kpi = fnb_ptd_var if single_day_view else fnb_incremental_var
    period_rev_var_delta = None
    if (
        first_snapshot_var is not None
        and last_snapshot_var is not None
        and len(reports) >= 2
    ):
        period_rev_var_delta = last_snapshot_var - first_snapshot_var
    elif comparison_prior and last_snapshot_var is not None:
        prior_var = _portfolio_variance(comparison_prior, "Revenue")
        if prior_var is not None:
            period_rev_var_delta = last_snapshot_var - prior_var

    rev_delta_vs_prior = None
    if latest and comparison_prior:
        rev_delta_vs_prior = _delta_of_daily_increments(
            session,
            latest=latest,
            comparison_prior=comparison_prior,
            reports=reports,
            baseline=baseline,
            metric="Revenue",
        )

    occ_delta = None
    if occ_level is not None and latest and comparison_prior and "Occupancy" in stored:
        prior_occ = _hotel_mean(comparison_prior, "Occupancy")
        last_occ = _hotel_mean(latest, "Occupancy")
        if prior_occ is not None and last_occ is not None:
            occ_delta = last_occ - prior_occ

    comparison_label = (
        "vs prior report day"
        if len(reports) == 1 and comparison_prior
        else "vs prior calendar day in range"
    )

    at_risk = sum(1 for r in heatmap if r.status in ("critical", "watch"))
    show_forecast_accuracy = forecast_accuracy_is_meaningful(
        reports_in_period=len(reports),
        revenue_variance=rev_var_kpi if is_valid_variance(rev_var_kpi) else None,
    )
    forecast_accuracy = (
        max(0.0, min(100.0, 100.0 - abs(rev_var_kpi))) if show_forecast_accuracy else None
    )

    kpis: list[ExecutiveKpiCard] = [
        ExecutiveKpiCard(
            id="portfolio_revenue",
            label="Daily Revenue" if single_day_view else "Revenue in Period",
            value=fmt_currency(rev_f),
            raw_value=rev_f,
            unit="currency",
            delta=rev_delta_vs_prior,
            delta_display=fmt_executive_currency_delta(rev_delta_vs_prior),
            delta_label=comparison_label,
            trend=_sparkline_daily_increments(reports, baseline, "Revenue"),
            direction=_direction(rev_delta_vs_prior),
        ),
        ExecutiveKpiCard(
            id="rev_vs_budget",
            label="Revenue vs Budget",
            value=fmt_variance_percent(rev_var_kpi),
            raw_value=rev_var_kpi,
            unit="variance_percent",
            delta=period_rev_var_delta,
            delta_display=(
                fmt_points_delta(
                    period_rev_var_delta,
                    label="prior day" if single_day_view else "start of period",
                )
                if period_rev_var_delta is not None
                else None
            ),
            delta_label=(
                "PTD variance pts vs prior day"
                if single_day_view
                else "PTD variance pts: end vs start of range"
            ),
            trend=_sparkline_daily_increments(reports, baseline, "Revenue"),
            direction=_direction(rev_var_kpi),
        ),
        ExecutiveKpiCard(
            id="occupancy",
            label="Portfolio Occupancy",
            value=fmt_level_percent(occ_level)
            if occ_level is not None and "Occupancy" in stored
            else "—",
            raw_value=occ_level,
            unit="level_percent",
            delta=occ_delta,
            delta_display=fmt_points_delta(
                occ_delta,
                label="prior day" if len(reports) == 1 else "start of period",
            ),
            delta_label=comparison_label if len(reports) == 1 else "",
            trend=_sparkline(reports, "Occupancy", _period_sparkline_hotel_mean),
            direction=_direction(occ_delta),
        ),
        ExecutiveKpiCard(
            id="adr",
            label="ADR",
            value=fmt_currency(adr_avg) if adr_avg is not None and "ADR" in stored else "—",
            raw_value=adr_avg,
            unit="currency",
            delta=None,
            delta_display=None,
            delta_label="avg in period",
            trend=_sparkline(reports, "ADR", _period_sparkline_hotel_mean),
            direction=None,
        ),
        ExecutiveKpiCard(
            id="revpar",
            label="RevPAR",
            value=fmt_currency(revpar_avg) if revpar_avg is not None and "RevPAR" in stored else "—",
            raw_value=revpar_avg,
            unit="currency",
            delta=None,
            delta_display=None,
            delta_label="avg in period",
            trend=_sparkline(reports, "RevPAR", _period_sparkline_hotel_mean),
            direction=None,
        ),
        ExecutiveKpiCard(
            id="at_risk",
            label="Hotels in Risk",
            value=str(at_risk),
            raw_value=float(at_risk),
            unit="count",
            delta=None,
            delta_display=None,
            delta_label="watch + critical",
            trend=[],
            direction="down" if at_risk == 0 else "up",
        ),
    ]

    if not single_day_view and last_snapshot_var is not None:
        kpis.insert(
            2,
            ExecutiveKpiCard(
                id="rev_vs_forecast",
                label="Revenue vs Budget (latest)",
                value=fmt_variance_percent(last_snapshot_var),
                raw_value=last_snapshot_var,
                unit="variance_percent",
                delta=None,
                delta_display=None,
                delta_label="latest report PTD vs budget",
                trend=_sparkline_daily_increments(reports, baseline, "Revenue"),
                direction=_direction(rev_var),
            ),
        )

    if fnb_var_kpi is not None and is_valid_variance(fnb_var_kpi):
        kpis.insert(
            -1,
            ExecutiveKpiCard(
                id="fnb",
                label="F&B Variance",
                value=fmt_variance_percent(fnb_var_kpi),
                raw_value=fnb_var_kpi,
                unit="variance_percent",
                delta=None,
                delta_display=None,
                delta_label=(
                    "PTD vs budget (flash report)"
                    if single_day_view
                    else "incremental vs budget in period"
                ),
                trend=_sparkline_daily_increments(reports, baseline, "F&B"),
                direction=_direction(fnb_var_kpi),
            ),
        )

    if show_forecast_accuracy and forecast_accuracy is not None:
        kpis.append(
            ExecutiveKpiCard(
                id="forecast_accuracy",
                label="Forecast Accuracy",
                value=f"{forecast_accuracy:.0f}%",
                raw_value=forecast_accuracy,
                unit="variance_percent",
                delta=None,
                delta_display=None,
                delta_label="revenue alignment",
                trend=_sparkline_daily_increments(reports, baseline, "Revenue"),
                direction=_direction(forecast_accuracy - 50),
            ),
        )

    revenue_trend: list[RevenueTrendPoint] = []
    revpar_trend: list[RevparTrendPoint] = []
    prev_report = baseline
    for report in reports:
        rf, rb, _, _ = _portfolio_sums(report, "Revenue")
        inc = _daily_portfolio_increment(report, prev_report, "Revenue")
        if inc is not None:
            prev_rf = _portfolio_total(prev_report, "Revenue") if prev_report else 0.0
            prev_rb = _portfolio_sums(prev_report, "Revenue")[1] if prev_report else 0.0
            if prev_report and prev_report.report_date.month != report.report_date.month:
                prev_rf, prev_rb = 0.0, 0.0
            revenue_trend.append(
                RevenueTrendPoint(
                    report_date=report.report_date.isoformat(),
                    actual=round(inc, 0),
                    budget=round(rb - prev_rb, 0),
                    forecast=round(inc, 0),
                )
            )
        prev_report = report

        rp_rows = filter_metrics_by_name(report.metrics, "RevPAR")
        if rp_rows:
            cur = mean(m.forecast for m in rp_rows)
            bud = mean(m.budget for m in rp_rows)
            prior_val = None
            idx = reports.index(report)
            if idx > 0:
                prev_rows = filter_metrics_by_name(reports[idx - 1].metrics, "RevPAR")
                if prev_rows:
                    prior_val = mean(m.forecast for m in prev_rows)
            revpar_trend.append(
                RevparTrendPoint(
                    report_date=report.report_date.isoformat(),
                    current=round(cur, 2),
                    budget=round(bud, 2),
                    prior_period=round(prior_val, 2) if prior_val is not None else None,
                )
            )

    scatter: list[OccupancyAdrBubble] = []
    for hotel, metrics in by_hotel_period.items():
        occ = metrics.get("Occupancy")
        adr = metrics.get("ADR")
        rev = metrics.get("Revenue")
        if occ and adr:
            scatter.append(
                OccupancyAdrBubble(
                    hotel_name=hotel,
                    occupancy=round(occ.forecast, 2),
                    adr=round(adr.forecast, 2),
                    revenue=round(rev.forecast, 0) if rev else 0,
                    variance_percent=round(
                        rev.variance_percent if rev else occ.variance_percent,
                        2,
                    ),
                )
            )

    performers: list[tuple[str, float, float | None, list[float]]] = []
    for hotel, metrics in by_hotel_period.items():
        rev = metrics.get("Revenue")
        rp = metrics.get("RevPAR")
        rev_var = rev.variance_percent if rev else 0
        rp_val = rp.forecast if rp else 0
        history = []
        for report in reports[-6:]:
            hm = _metrics_map(report)
            if hotel in hm and "RevPAR" in hm[hotel]:
                history.append(hm[hotel]["RevPAR"].forecast)
        performers.append((hotel, rev_var, rp_val, history))

    top_sorted = sorted(performers, key=lambda x: (x[1], x[2] or 0), reverse=True)[:6]
    worst_sorted = sorted(performers, key=lambda x: (x[1], -(x[2] or 0)))[:6]

    def to_performer(rank: int, item, badge: str) -> PerformerCard:
        hotel, rev_var, rp, hist = item
        change = hist[-1] - hist[0] if len(hist) >= 2 else None
        return PerformerCard(
            rank=rank,
            hotel_name=hotel,
            revpar=rp,
            revenue_variance=rev_var,
            revpar_change=round(change, 2) if change is not None else None,
            badge=badge,
            trend_direction=_direction(change),
            sparkline=hist,
        )

    return CommandCenterResponse(
        period=period_name,
        range_start=range_start,
        range_end=range_end,
        reports_in_period=len(reports),
        latest_report_date=latest.report_date,
        prior_report_date=prior.report_date if prior else None,
        available_properties=available_properties,
        selected_properties=selected_list,
        available_report_dates=report_dates,
        stored_metrics=stored,
        kpis=kpis,
        action_alerts=alerts,
        heatmap=heatmap,
        revenue_trend=revenue_trend,
        revpar_trend=revpar_trend,
        occupancy_adr_scatter=scatter,
        top_performers=[
            to_performer(i + 1, p, "Outperformer") for i, p in enumerate(top_sorted)
        ],
        worst_performers=[
            to_performer(i + 1, p, "At risk") for i, p in enumerate(worst_sorted)
        ],
    )
