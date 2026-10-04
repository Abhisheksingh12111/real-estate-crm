"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  TrendingUp,
  TrendingDown,
  Target,
  IndianRupee,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/*
  How the forecast is calculated (all from your Supabase data):
  - Actual revenue  = sum of deal_value for deals with status "closed", grouped by deal_date month.
  - Expected revenue = amount set for that month in the monthly_targets table (click a month in the chart to edit it);
    months with no row fall back to the total monthly target of all active agents.
  - Forecast revenue card = open deals weighted by stage probability (edit below), spread over the next 3 months.
  - Expected deals   = open deals count weighted by the same probabilities.
*/
const STAGE_PROBABILITY: Record<string, number> = {
  active: 0.5,
  negotiation: 0.6,
  pending: 0.3,
};

const PAST_MONTHS = 6;
const FUTURE_MONTHS = 3;

type MonthPoint = {
  key: string;
  label: string;
  year: number;
  actual: number;
  expected: number;
  isCustom: boolean;
  isFuture: boolean;
  closedDeals: number;
};

type PropertyForecast = {
  id: number;
  property: string;
  demand: "High" | "Medium" | "Low";
  visits: number;
  expectedDeals: number;
  expectedRevenue: number;
  change: number | null;
};

type Summary = {
  forecastRevenue: number;
  expectedDeals: number;
  revenueTrend: number | null;
  openDeals: number;
  openValue: number;
  demandChange: number | null;
  periodLabel: string;
};

const demandStyles = {
  High: "bg-emerald-400/10 text-emerald-400",
  Medium: "bg-amber-400/10 text-amber-400",
  Low: "bg-zinc-400/10 text-zinc-500",
};

function formatRevenue(value: number) {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  }

  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} Lakh`;
  }

  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous > 0) return ((current - previous) / previous) * 100;
  return current > 0 ? null : 0;
}

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export default function ForecastingPage() {
  const [months, setMonths] = useState<MonthPoint[]>([]);
  const [properties, setProperties] = useState<PropertyForecast[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingExpected, setSavingExpected] = useState(false);

  useEffect(() => {
    async function load() {
      const [dealsRes, leadsRes, visitsRes, propsRes, agentsRes, targetsRes] =
        await Promise.all([
        supabase
          .from("deals")
          .select("property_id, deal_value, status, deal_date"),
        supabase.from("leads").select("created_at"),
        supabase.from("site_visits").select("property_id, visit_date"),
        supabase.from("properties").select("id, title"),
        supabase.from("agents").select("monthly_target, status"),
        supabase.from("monthly_targets").select("month, expected_revenue"),
      ]);

      const firstError =
        dealsRes.error ||
        leadsRes.error ||
        visitsRes.error ||
        propsRes.error ||
        agentsRes.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const deals = dealsRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const visits = visitsRes.data ?? [];
      const props = propsRes.data ?? [];

      const teamTarget = (agentsRes.data ?? []).reduce(
        (total, agent) =>
          String(agent.status).toLowerCase() === "active"
            ? total + (Number(agent.monthly_target) || 0)
            : total,
        0
      );

      // If the monthly_targets table is missing or empty, expected falls back to teamTarget
      const expectedByMonth = new Map<string, number>();

      (targetsRes.data ?? []).forEach((row) => {
        expectedByMonth.set(
          String(row.month).slice(0, 7),
          Number(row.expected_revenue) || 0
        );
      });

      const now = new Date();

      /* ---------- Open pipeline (weighted) ---------- */
      let weightedRevenue = 0;
      let weightedDeals = 0;
      let openDeals = 0;
      let openValue = 0;

      const propWeightedRevenue = new Map<number, number>();
      const propWeightedDeals = new Map<number, number>();

      deals.forEach((deal) => {
        const status = String(deal.status).toLowerCase();
        const probability = STAGE_PROBABILITY[status];

        if (probability === undefined) return;

        const value = Number(deal.deal_value) || 0;

        openDeals += 1;
        openValue += value;
        weightedRevenue += value * probability;
        weightedDeals += probability;

        if (deal.property_id != null) {
          propWeightedRevenue.set(
            deal.property_id,
            (propWeightedRevenue.get(deal.property_id) ?? 0) +
              value * probability
          );
          propWeightedDeals.set(
            deal.property_id,
            (propWeightedDeals.get(deal.property_id) ?? 0) + probability
          );
        }
      });

      /* ---------- Closed revenue per month ---------- */
      const closedByMonth = new Map<string, number>();
      const closedCountByMonth = new Map<string, number>();

      deals.forEach((deal) => {
        if (String(deal.status).toLowerCase() !== "closed") return;
        if (!deal.deal_date) return;

        const key = String(deal.deal_date).slice(0, 7);

        closedByMonth.set(
          key,
          (closedByMonth.get(key) ?? 0) + (Number(deal.deal_value) || 0)
        );
        closedCountByMonth.set(key, (closedCountByMonth.get(key) ?? 0) + 1);
      });

      const points: MonthPoint[] = [];

      for (let offset = -(PAST_MONTHS - 1); offset <= FUTURE_MONTHS; offset++) {
        const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const key = monthKey(date);
        const isFuture = offset > 0;

        points.push({
          key,
          label: date.toLocaleDateString("en-IN", { month: "short" }),
          year: date.getFullYear(),
          actual: closedByMonth.get(key) ?? 0,
          expected: expectedByMonth.get(key) ?? teamTarget,
          isCustom: expectedByMonth.has(key),
          isFuture,
          closedDeals: closedCountByMonth.get(key) ?? 0,
        });
      }

      /* ---------- Revenue trend: last 3 months vs previous 3 ---------- */
      const past = points.filter((point) => !point.isFuture);
      const lastThree = past
        .slice(-3)
        .reduce((total, point) => total + point.actual, 0);
      const prevThree = past
        .slice(-6, -3)
        .reduce((total, point) => total + point.actual, 0);

      /* ---------- Demand change: leads last 30 days vs previous 30 ---------- */
      const DAY = 24 * 60 * 60 * 1000;
      const last30Start = now.getTime() - 30 * DAY;
      const prev30Start = now.getTime() - 60 * DAY;

      let leadsLast30 = 0;
      let leadsPrev30 = 0;

      leads.forEach((lead) => {
        if (!lead.created_at) return;
        const time = new Date(lead.created_at).getTime();

        if (time >= last30Start) leadsLast30 += 1;
        else if (time >= prev30Start) leadsPrev30 += 1;
      });

      /* ---------- Property level ---------- */
      const visitsTotal = new Map<number, number>();
      const visitsLast30 = new Map<number, number>();
      const visitsPrev30 = new Map<number, number>();

      visits.forEach((visit) => {
        if (visit.property_id == null) return;

        visitsTotal.set(
          visit.property_id,
          (visitsTotal.get(visit.property_id) ?? 0) + 1
        );

        if (!visit.visit_date) return;
        const time = new Date(visit.visit_date).getTime();

        if (time >= last30Start) {
          visitsLast30.set(
            visit.property_id,
            (visitsLast30.get(visit.property_id) ?? 0) + 1
          );
        } else if (time >= prev30Start) {
          visitsPrev30.set(
            visit.property_id,
            (visitsPrev30.get(visit.property_id) ?? 0) + 1
          );
        }
      });

      const rows = props.map((property) => {
        const visitsCount = visitsTotal.get(property.id) ?? 0;
        const expectedDeals = propWeightedDeals.get(property.id) ?? 0;

        return {
          id: property.id as number,
          property: (property.title as string) ?? "Untitled",
          visits: visitsCount,
          expectedDeals,
          expectedRevenue: propWeightedRevenue.get(property.id) ?? 0,
          score: visitsCount + expectedDeals,
          change: pctChange(
            visitsLast30.get(property.id) ?? 0,
            visitsPrev30.get(property.id) ?? 0
          ),
        };
      });

      const maxScore = Math.max(...rows.map((row) => row.score), 0);

      const propertyRows: PropertyForecast[] = rows
        .map((row) => {
          let demand: PropertyForecast["demand"] = "Low";

          if (maxScore > 0) {
            if (row.score >= maxScore * 0.66) demand = "High";
            else if (row.score >= maxScore * 0.33) demand = "Medium";
          }

          return {
            id: row.id,
            property: row.property,
            demand,
            visits: row.visits,
            expectedDeals: row.expectedDeals,
            expectedRevenue: row.expectedRevenue,
            change: row.change,
          };
        })
        .sort(
          (a, b) =>
            b.expectedRevenue - a.expectedRevenue || b.visits - a.visits
        )
        .slice(0, 10);

      const firstFuture = points.find((point) => point.isFuture);
      const lastFuture = points[points.length - 1];

      setSummary({
        forecastRevenue: weightedRevenue,
        expectedDeals: weightedDeals,
        revenueTrend: pctChange(lastThree, prevThree),
        openDeals,
        openValue,
        demandChange: pctChange(leadsLast30, leadsPrev30),
        periodLabel: `${firstFuture?.label} ${firstFuture?.year} – ${lastFuture.label} ${lastFuture.year}`,
      });

      setMonths(points);
      setProperties(propertyRows);
      setError("");
      setLoading(false);
    }

    load();
  }, []);

  const values = months.flatMap((item) => [item.actual, item.expected]);
  const maxValue = Math.max(...values, 1);

  const selectedData = months.find((item) => item.key === selectedKey);

  function selectMonth(item: MonthPoint) {
    setSelectedKey(item.key);
    setEditValue(String(Math.round(item.expected)));
  }

  async function saveExpected() {
    if (!selectedData) return;

    const amount = Number(editValue);

    if (Number.isNaN(amount) || amount < 0) {
      alert("Enter a valid amount in rupees.");
      return;
    }

    setSavingExpected(true);

    const { error: saveError } = await supabase
      .from("monthly_targets")
      .upsert(
        { month: `${selectedData.key}-01`, expected_revenue: amount },
        { onConflict: "month" }
      );

    setSavingExpected(false);

    if (saveError) {
      alert(`Could not save expected amount: ${saveError.message}`);
      return;
    }

    setMonths((current) =>
      current.map((item) =>
        item.key === selectedData.key
          ? { ...item, expected: amount, isCustom: true }
          : item
      )
    );
  }

  return (
    <div className="min-h-screen bg-[#07090c] text-white">
      <div className="mx-auto max-w-[1500px] p-5 md:p-8">
        {/* Header */}
        <div>
          <p className="text-sm text-cyan-400">Business Intelligence</p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Forecasting
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Predict future sales, revenue and property demand.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Could not load data: {error}
          </div>
        )}

        {loading && (
          <p className="mt-10 text-center text-sm text-zinc-500">
            Loading forecast...
          </p>
        )}

        {!loading && summary && (
          <>
            {/* Forecast Stats */}
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={<IndianRupee size={18} />}
                title="Forecast Revenue"
                value={formatRevenue(summary.forecastRevenue)}
                note="Weighted open pipeline, next 3 months"
                positive={summary.forecastRevenue > 0}
              />

              <StatCard
                icon={<Target size={18} />}
                title="Expected Deals"
                value={String(Math.round(summary.expectedDeals))}
                note={`From ${summary.openDeals} open deals`}
                positive={summary.expectedDeals > 0}
              />

              <StatCard
                icon={<TrendingUp size={18} />}
                title="Revenue Trend"
                value={formatPct(summary.revenueTrend)}
                note="Last 3 months vs previous 3"
                positive={(summary.revenueTrend ?? 0) > 0}
              />

              <StatCard
                icon={<CalendarDays size={18} />}
                title="Forecast Period"
                value="3 Months"
                note={summary.periodLabel}
              />
            </div>

            {/* Main Forecast Chart */}
            <div className="mt-7 rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Revenue Forecast</h2>

                  <p className="mt-1 text-xs text-zinc-600">
                    Closed revenue vs expected revenue (team monthly target)
                  </p>
                </div>

                <div className="flex items-center gap-5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    Actual
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-zinc-600" />
                    Expected
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="mt-8">
                <div className="relative h-[280px]">
                  {/* Grid */}
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
                      <div key={fraction} className="flex items-center gap-3">
                        <span className="w-16 text-right text-[10px] text-zinc-700">
                          {fraction === 0
                            ? "0"
                            : formatRevenue(maxValue * fraction)}
                        </span>

                        <div className="h-px flex-1 bg-white/[0.05]" />
                      </div>
                    ))}
                  </div>

                  {/* Bars */}
                  <div className="absolute inset-0 ml-[76px] flex items-end justify-around gap-3 pb-1">
                    {months.map((item) => {
                      const selected = selectedKey === item.key;

                      return (
                        <div
                          key={item.key}
                          className="flex h-full flex-1 items-end justify-center gap-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => selectMonth(item)}
                            aria-label={`View actual revenue for ${item.label} ${item.year}`}
                            className={`min-h-[4px] w-5 rounded-t-md transition ${
                              selected
                                ? "bg-cyan-300"
                                : "bg-cyan-400/70 hover:bg-cyan-400"
                            }`}
                            style={{
                              height: `${(item.actual / maxValue) * 100}%`,
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => selectMonth(item)}
                            aria-label={`View expected revenue for ${item.label} ${item.year}`}
                            className={`min-h-[4px] w-5 rounded-t-md transition ${
                              selected
                                ? "bg-zinc-500"
                                : "bg-zinc-700 hover:bg-zinc-600"
                            }`}
                            style={{
                              height: `${(item.expected / maxValue) * 100}%`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Months */}
                <div className="ml-[76px] mt-2 flex justify-around">
                  {months.map((item) => (
                    <span
                      key={item.key}
                      className="flex-1 text-center text-[11px] text-zinc-600"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>

                {/* Selected Revenue */}
                {selectedData && (
                  <div className="ml-[76px] mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-zinc-500">
                          {selectedData.label} {selectedData.year}
                          {selectedData.isFuture ? " (upcoming)" : ""}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] p-3">
                            <p className="text-[10px] text-zinc-600">
                              Actual earned
                            </p>

                            <p className="mt-1 text-sm font-medium text-cyan-400">
                              {formatRevenue(selectedData.actual)}
                            </p>

                            <p className="mt-1 text-[10px] text-zinc-600">
                              From {selectedData.closedDeals} closed{" "}
                              {selectedData.closedDeals === 1
                                ? "deal"
                                : "deals"}
                            </p>
                          </div>

                          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                            <p className="text-[10px] text-zinc-600">
                              Expected
                            </p>

                            <p className="mt-1 text-sm font-medium text-zinc-300">
                              {formatRevenue(selectedData.expected)}
                            </p>

                            <p className="mt-1 text-[10px] text-zinc-600">
                              {selectedData.expected > 0
                                ? `${Math.round(
                                    (selectedData.actual /
                                      selectedData.expected) *
                                      100
                                  )}% achieved`
                                : "No target set"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <label className="text-[11px] text-zinc-500">
                            Expected for {selectedData.label} (₹)
                          </label>

                          <input
                            type="number"
                            min="0"
                            value={editValue}
                            onChange={(event) => setEditValue(event.target.value)}
                            placeholder="e.g. 15000000"
                            className="w-40 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white outline-none focus:border-white/20"
                          />

                          <button
                            type="button"
                            onClick={saveExpected}
                            disabled={savingExpected}
                            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
                          >
                            {savingExpected ? "Saving..." : "Save"}
                          </button>

                          <span className="text-[10px] text-zinc-600">
                            {selectedData.isCustom
                              ? "Custom amount"
                              : "Using team target"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedKey(null)}
                        className="text-xs text-zinc-500 transition hover:text-white"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Forecast Insights */}
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <InsightCard
                title="Revenue Trend"
                value={formatPct(summary.revenueTrend)}
                description="Closed revenue over the last 3 months compared with the 3 months before."
                positive={(summary.revenueTrend ?? 0) >= 0}
              />

              <InsightCard
                title="Deal Pipeline"
                value={`${summary.openDeals} Open ${
                  summary.openDeals === 1 ? "Deal" : "Deals"
                }`}
                description={`Total value of open deals (active, negotiation or pending) is ${formatRevenue(
                  summary.openValue
                )}.`}
                positive={summary.openDeals > 0}
              />

              <InsightCard
                title="Demand Change"
                value={formatPct(summary.demandChange)}
                description="New leads in the last 30 days compared with the 30 days before."
                positive={(summary.demandChange ?? 0) >= 0}
              />
            </div>

            {/* Property Forecast */}
            <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0e12]">
              <div className="border-b border-white/[0.07] p-5">
                <h2 className="font-semibold">Property Demand Forecast</h2>

                <p className="mt-1 text-xs text-zinc-600">
                  Expected demand and deal potential by property
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-xs text-zinc-500">
                      <th className="px-5 py-4 font-medium">Property</th>
                      <th className="px-5 py-4 font-medium">Demand</th>
                      <th className="px-5 py-4 font-medium">Site Visits</th>
                      <th className="px-5 py-4 font-medium">
                        Expected Deals
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Expected Revenue
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Visits (30 days)
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {properties.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4">
                          <span className="font-medium text-white">
                            {item.property}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${demandStyles[item.demand]}`}
                          >
                            {item.demand}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-zinc-300">
                          {item.visits}
                        </td>

                        <td className="px-5 py-4 text-zinc-300">
                          {item.expectedDeals.toFixed(1)}
                        </td>

                        <td className="px-5 py-4 font-medium text-zinc-200">
                          {formatRevenue(item.expectedRevenue)}
                        </td>

                        <td className="px-5 py-4">
                          {item.change === null ? (
                            <span className="text-xs text-emerald-400">
                              New
                            </span>
                          ) : (
                            <span
                              className={`flex items-center gap-1 text-xs ${
                                item.change < 0
                                  ? "text-red-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {item.change < 0 ? (
                                <ArrowDownRight size={14} />
                              ) : (
                                <ArrowUpRight size={14} />
                              )}

                              {formatPct(item.change)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {properties.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-sm text-zinc-500"
                        >
                          No properties found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Note */}
            <div className="mt-5 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] p-5">
              <div className="flex items-start gap-3">
                <TrendingUp
                  size={18}
                  className="mt-0.5 shrink-0 text-cyan-400"
                />

                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    How this forecast works
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    Open deals are weighted by stage: active counts at{" "}
                    {Math.round(STAGE_PROBABILITY.active * 100)}%, negotiation
                    at {Math.round(STAGE_PROBABILITY.negotiation * 100)}% and
                    pending at {Math.round(STAGE_PROBABILITY.pending * 100)}%.
                    The weighted total is spread evenly over the next 3 months
                    for the Forecast Revenue card. In the chart, Expected is
                    the amount set for that month (click a month to change it,
                    otherwise the combined target of all active agents is used)
                    and Actual is the revenue from closed deals. Demand level is based on site visits plus expected deals
                    for each property.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  note,
  positive = false,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  note: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{title}</p>

        <div className="text-cyan-400">{icon}</div>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>

        {positive && (
          <span className="mb-1 flex items-center text-[11px] text-emerald-400">
            <ArrowUpRight size={12} />
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-zinc-600">{note}</p>
    </div>
  );
}

function InsightCard({
  title,
  value,
  description,
  positive,
}: {
  title: string;
  value: string;
  description: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{title}</p>

        {positive ? (
          <TrendingUp size={17} className="text-emerald-400" />
        ) : (
          <TrendingDown size={17} className="text-red-400" />
        )}
      </div>

      <p className="mt-4 text-2xl font-semibold">{value}</p>

      <p className="mt-2 text-xs leading-5 text-zinc-600">{description}</p>
    </div>
  );
}