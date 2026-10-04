"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/lib/supabaseClient";
import { useProfileName } from "@/lib/useProfileName";

type Range = "Last 30 days" | "Last 90 days";

type Lead = {
  id: number;
  status: string | null;
  created_at: string;
};

type Deal = {
  id: number;
  client_name: string | null;
  property_name: string | null;
  deal_value: number | null;
  status: string | null;
  deal_date: string | null;
  created_at: string;
};

type Visit = {
  id: number;
  visit_date: string | null;
  status: string | null;
};

type Property = {
  id: number;
  status: string | null;
};

type MonthlyTarget = {
  month: string;
  expected_revenue: number | null;
};

const DAY = 86400000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return isNaN(d.getTime()) ? null : d;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d: Date) {
  return ymd(d).slice(0, 7);
}

function formatMoney(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function pctChange(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Metric({
  title,
  value,
  change,
  positive,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  positive?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-5 transition hover:border-white/20 hover:bg-[#10141a]">
      <div className="flex items-start justify-between">
        <p className="text-sm text-zinc-400">{title}</p>

        <span className="rounded-xl bg-white/[0.06] p-2 text-zinc-400 transition group-hover:text-white">
          {icon}
        </span>
      </div>

      <p className="mt-5 text-[30px] font-semibold tracking-tight text-white">
        {value}
      </p>

      <div
        className={`mt-2 flex items-center gap-1 text-xs font-medium ${
          positive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {positive ? (
          <ArrowUpRight size={14} />
        ) : (
          <ArrowDownRight size={14} />
        )}

        <span>{change}</span>

        <span className="ml-1 text-zinc-600">vs previous period</span>
      </div>
    </div>
  );
}

function MiniCard({
  icon,
  title,
  value,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-5 transition hover:border-white/20">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-sm">{title}</span>
      </div>

      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>

      <p className="mt-1 text-xs text-zinc-600">{note}</p>
    </div>
  );
}

export default function RealEstateDashboard() {
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<Range>("Last 30 days");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [targets, setTargets] = useState<MonthlyTarget[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const profileName = useProfileName();
  const firstName = profileName.trim().split(/\s+/)[0] || "there";

  useEffect(() => {
    let active = true;

    async function load() {
      const [leadsRes, dealsRes, visitsRes, propsRes, targetsRes] =
        await Promise.all([
          supabase.from("leads").select("id,status,created_at"),
          supabase
            .from("deals")
            .select(
              "id,client_name,property_name,deal_value,status,deal_date,created_at"
            ),
          supabase.from("site_visits").select("id,visit_date,status"),
          supabase.from("properties").select("id,status"),
          supabase.from("monthly_targets").select("*"),
        ]);

      if (!active) return;

      const firstError =
        leadsRes.error || dealsRes.error || visitsRes.error || propsRes.error;

      if (firstError) {
        console.error(firstError);
        setError(firstError.message);
      }

      setLeads((leadsRes.data as Lead[]) ?? []);
      setDeals((dealsRes.data as Deal[]) ?? []);
      setVisits((visitsRes.data as Visit[]) ?? []);
      setProperties((propsRes.data as Property[]) ?? []);
      setTargets(
        targetsRes.error ? [] : ((targetsRes.data as MonthlyTarget[]) ?? [])
      );
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const data = useMemo(() => {
    const days = range === "Last 30 days" ? 30 : 90;
    const end = startOfToday().getTime() + DAY;
    const start = end - days * DAY;
    const prevStart = start - days * DAY;

    const inRange = (d: Date | null, a: number, b: number) =>
      !!d && d.getTime() >= a && d.getTime() < b;

    const dealDate = (d: Deal) => toDate(d.deal_date ?? d.created_at);
    const value = (d: Deal) => Number(d.deal_value ?? 0);

    // Leads
    const leadsCur = leads.filter((l) =>
      inRange(toDate(l.created_at), start, end)
    );
    const leadsPrev = leads.filter((l) =>
      inRange(toDate(l.created_at), prevStart, start)
    );

    const convCur = leadsCur.length
      ? (leadsCur.filter((l) => l.status === "converted").length /
          leadsCur.length) *
        100
      : 0;
    const convPrev = leadsPrev.length
      ? (leadsPrev.filter((l) => l.status === "converted").length /
          leadsPrev.length) *
        100
      : 0;

    // Revenue (closed deals)
    const closedCur = deals.filter(
      (d) => d.status === "closed" && inRange(dealDate(d), start, end)
    );
    const closedPrev = deals.filter(
      (d) => d.status === "closed" && inRange(dealDate(d), prevStart, start)
    );
    const revCur = closedCur.reduce((s, d) => s + value(d), 0);
    const revPrev = closedPrev.reduce((s, d) => s + value(d), 0);

    // Active deals
    const activeCur = deals.filter(
      (d) => d.status === "active" && inRange(dealDate(d), start, end)
    ).length;
    const activePrev = deals.filter(
      (d) => d.status === "active" && inRange(dealDate(d), prevStart, start)
    ).length;

    const activeAll = deals.filter((d) => d.status === "active");
    const pipelineValue = activeAll.reduce((s, d) => s + value(d), 0);

    // Chart buckets
    const buckets = days === 30 ? 4 : 3;
    const size = (days * DAY) / buckets;

    const targetMap = new Map<string, number>();
    targets.forEach((t) => {
      const raw = String(t.month ?? "");
      let key = /^\d{4}-\d{2}/.test(raw) ? raw.slice(0, 7) : "";
      if (!key) {
        const d = toDate(raw);
        if (d) key = monthKey(d);
      }
      if (key) targetMap.set(key, Number(t.expected_revenue ?? 0));
    });

    const chart = Array.from({ length: buckets }, (_, i) => {
      const bStart = start + i * size;
      const bEnd = bStart + size;
      const endDate = new Date(bEnd - DAY);

      const revenue = closedCur
        .filter((d) => {
          const t = dealDate(d)?.getTime() ?? 0;
          return t >= bStart && t < bEnd;
        })
        .reduce((s, d) => s + value(d), 0);

      const monthlyTarget = targetMap.get(monthKey(endDate)) ?? 0;
      const target = days === 30 ? monthlyTarget / 4 : monthlyTarget;

      return {
        month:
          days === 30
            ? `Week ${i + 1}`
            : endDate.toLocaleDateString("en-IN", { month: "short" }),
        revenue: Math.round((revenue / 100000) * 10) / 10,
        target: Math.round((target / 100000) * 10) / 10,
      };
    });

    // Pipeline stages from leads.status
    const stageDefs = [
      { key: "new", name: "New Lead", color: "#06b6d4" },
      { key: "contacted", name: "Contacted", color: "#22c55e" },
      { key: "site_visit", name: "Site Visit", color: "#f59e0b" },
      { key: "converted", name: "Converted", color: "#8b5cf6" },
    ];

    const stages = stageDefs.map((s) => {
      const count = leadsCur.filter((l) => l.status === s.key).length;
      return {
        name: s.name,
        color: s.color,
        count,
        percent: leadsCur.length
          ? Math.round((count / leadsCur.length) * 100)
          : 0,
      };
    });

    // Quick stats
    const todayStr = ymd(startOfToday());
    const visitsToday = visits.filter(
      (v) => String(v.visit_date ?? "").slice(0, 10) === todayStr
    );
    const visitsPending = visitsToday.filter(
      (v) => v.status === "scheduled"
    ).length;

    const availableProps = properties.filter(
      (p) => p.status === "available"
    ).length;

    return {
      revenue: formatMoney(revCur),
      revenueChangeNum: pctChange(revCur, revPrev),
      conversion: `${convCur.toFixed(1)}%`,
      conversionDiff: convCur - convPrev,
      activeDeals: String(activeCur),
      activeDiff: activeCur - activePrev,
      newLeads: String(leadsCur.length),
      leadsChangeNum: pctChange(leadsCur.length, leadsPrev.length),
      pipeline: formatMoney(pipelineValue),
      chart,
      stages,
      visitsToday: visitsToday.length,
      visitsPending,
      availableProps,
      totalProps: properties.length,
      closedCount: closedCur.length,
      activeAllCount: activeAll.length,
    };
  }, [range, leads, deals, visits, properties, targets]);

  const filteredDeals = useMemo(() => {
    const query = search.toLowerCase().trim();

    const sorted = [...deals].sort((a, b) => {
      const ta = toDate(a.deal_date ?? a.created_at)?.getTime() ?? 0;
      const tb = toDate(b.deal_date ?? b.created_at)?.getTime() ?? 0;
      return tb - ta;
    });

    const matched = query
      ? sorted.filter((deal) =>
          `${deal.client_name ?? ""} ${deal.property_name ?? ""} ${
            deal.status ?? ""
          }`
            .toLowerCase()
            .includes(query)
        )
      : sorted;

    return matched.slice(0, 8);
  }, [search, deals]);

  function toggleRange() {
    setRange((current) =>
      current === "Last 30 days" ? "Last 90 days" : "Last 30 days"
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[1500px]">
        {/* Page heading */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {greeting()}, {firstName}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Here&apos;s what&apos;s happening with your real-estate business.
            </p>
          </div>

          <button
            onClick={toggleRange}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            <CalendarDays size={15} />
            {range}
            <ChevronDown size={14} />
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            Data load error: {error}
          </div>
        )}

        {loading ? (
          <p className="py-20 text-center text-sm text-zinc-500">
            Loading dashboard...
          </p>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                title="Total Revenue"
                value={data.revenue}
                change={`${Math.abs(data.revenueChangeNum).toFixed(1)}%`}
                positive={data.revenueChangeNum >= 0}
                icon={<CircleDollarSign size={18} />}
              />

              <Metric
                title="Conversion Rate"
                value={data.conversion}
                change={`${Math.abs(data.conversionDiff).toFixed(1)}%`}
                positive={data.conversionDiff >= 0}
                icon={<TrendingUp size={18} />}
              />

              <Metric
                title="Active Deals"
                value={data.activeDeals}
                change={`${Math.abs(data.activeDiff)}`}
                positive={data.activeDiff >= 0}
                icon={<Target size={18} />}
              />

              <Metric
                title="New Leads"
                value={data.newLeads}
                change={`${Math.abs(data.leadsChangeNum).toFixed(1)}%`}
                positive={data.leadsChangeNum >= 0}
                icon={<Users size={18} />}
              />
            </div>

            {/* Revenue + Pipeline */}
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
              {/* Revenue chart */}
              <section className="rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-5 md:p-6">
                <div className="mb-7 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      Revenue Trend
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {range} performance vs target
                    </p>
                  </div>

                  <div className="hidden items-center gap-4 text-xs text-zinc-500 sm:flex">
                    <span className="flex items-center gap-1.5">
                      <i className="h-2 w-2 rounded-full bg-cyan-400" />
                      Revenue
                    </span>

                    <span className="flex items-center gap-1.5">
                      <i className="h-2 w-2 rounded-full bg-emerald-400" />
                      Target
                    </span>
                  </div>
                </div>

                <div className="h-[275px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chart}>
                      <defs>
                        <linearGradient
                          id="revenueGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#06b6d4"
                            stopOpacity={0.3}
                          />

                          <stop
                            offset="100%"
                            stopColor="#06b6d4"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        stroke="rgba(255,255,255,.06)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="month"
                        stroke="#52525b"
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        stroke="#52525b"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${value}L`}
                      />

                      <Tooltip
                        contentStyle={{
                          background: "#11161b",
                          border: "1px solid rgba(255,255,255,.1)",
                          borderRadius: 12,
                          color: "white",
                        }}
                        formatter={(value, name) => [
                          `₹${value}L`,
                          name === "revenue" ? "Revenue" : "Target",
                        ]}
                      />

                      <Area
                        type="monotone"
                        dataKey="target"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="none"
                      />

                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        fill="url(#revenueGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Lead Pipeline */}
              <section className="rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-5 md:p-6">
                <h3 className="font-semibold text-white">Lead Pipeline</h3>

                <p className="mt-1 text-sm text-zinc-500">
                  Distribution by stage · {range}
                </p>

                <div className="mt-7 space-y-6">
                  {data.stages.map((stage) => (
                    <div key={stage.name}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.name}</span>

                        <span className="text-xs text-zinc-500">
                          {stage.count}

                          <b className="ml-2 font-medium text-zinc-300">
                            {stage.percent}%
                          </b>
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${stage.percent}%`,
                            background: stage.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex items-end justify-between border-t border-white/[0.08] pt-5">
                  <span className="text-sm text-zinc-500">
                    Active deals value
                  </span>

                  <span className="text-2xl font-semibold">
                    {data.pipeline}
                  </span>
                </div>
              </section>
            </div>

            {/* Recent Deals */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0e12]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-5 md:px-6">
                <div>
                  <h3 className="font-semibold text-white">Recent Deals</h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    Latest activity across your pipeline
                  </p>
                </div>

                <a
                  href="/real-estate/deals"
                  className="text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
                >
                  View all <ArrowUpRight size={14} className="inline" />
                </a>
              </div>

              {/* Search */}
              <div className="border-b border-white/[0.06] px-5 py-4 md:px-6">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search deals..."
                  className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">
                    <tr>
                      <th className="px-5 py-4 font-medium md:px-6">Client</th>
                      <th className="px-5 py-4 font-medium">Property</th>
                      <th className="px-5 py-4 font-medium">Value</th>
                      <th className="px-5 py-4 font-medium">Stage</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredDeals.map((deal) => (
                      <tr
                        key={deal.id}
                        className="border-t border-white/[0.06] transition hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4 md:px-6">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-300">
                              {initialsOf(deal.client_name ?? "")}
                            </span>

                            <span className="text-sm font-medium">
                              {deal.client_name ?? "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-zinc-400">
                          {deal.property_name ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium">
                          {formatMoney(Number(deal.deal_value ?? 0))}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-zinc-300">
                            {capitalize(deal.status ?? "")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredDeals.length === 0 && (
                  <p className="px-6 py-12 text-center text-sm text-zinc-500">
                    No matching deals found.
                  </p>
                )}
              </div>
            </section>

            {/* Quick Stats */}
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <MiniCard
                icon={<CalendarDays size={18} />}
                title="Site visits today"
                value={String(data.visitsToday)}
                note={`${data.visitsPending} still scheduled`}
              />

              <MiniCard
                icon={<Building2 size={18} />}
                title="Available properties"
                value={String(data.availableProps)}
                note={`Out of ${data.totalProps} total properties`}
              />

              <MiniCard
                icon={<FileText size={18} />}
                title="Deals closed"
                value={String(data.closedCount)}
                note={`${data.activeAllCount} deals still active`}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}