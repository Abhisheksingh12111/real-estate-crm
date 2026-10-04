"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
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

type Id = number | string;
type Range = "Last 30 days" | "Last 90 days";

const ranges: Range[] = ["Last 30 days", "Last 90 days"];
const rangeDays: Record<Range, number> = {
  "Last 30 days": 30,
  "Last 90 days": 90,
};

const DAY = 24 * 60 * 60 * 1000;

type LeadRow = {
  id: Id;
  created_at: string | null;
  name: string | null;
  status: string | null;
};

type DealRow = {
  id: Id;
  created_at: string | null;
  client_name: string | null;
  property_name: string | null;
  deal_value: number | null;
  status: string | null;
  deal_date: string | null;
};

type VisitRow = {
  id: Id;
  created_at: string | null;
  customer_name: string | null;
  property_name: string | null;
  visit_date: string | null;
  status: string | null;
};

type PropertyRow = {
  id: Id;
  created_at: string | null;
  title: string | null;
  property_type: string | null;
};

type Change = { label: string; up: boolean };

type Activity = {
  key: string;
  icon: React.ElementType;
  title: string;
  description: string;
  at: number;
};

function ts(value: string | null) {
  if (!value) return NaN;
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).getTime();
}

function between(value: string | null, from: number, to: number) {
  const t = ts(value);
  return !Number.isNaN(t) && t >= from && t < to;
}

function formatValue(value: number) {
  if (!value) return "₹0";
  if (value >= 10000000) return `₹${+(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${+(value / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function pctChange(cur: number, prev: number): Change {
  if (prev === 0) return { label: cur === 0 ? "0%" : "New", up: true };
  const delta = ((cur - prev) / prev) * 100;
  return { label: `${Math.abs(delta).toFixed(1)}%`, up: delta >= 0 };
}

function countChange(cur: number, prev: number): Change {
  const d = cur - prev;
  return { label: String(Math.abs(d)), up: d >= 0 };
}

function ptsChange(cur: number, prev: number): Change {
  const d = cur - prev;
  return { label: `${Math.abs(d).toFixed(1)} pts`, up: d >= 0 };
}

function timeAgo(at: number) {
  const diff = Date.now() - at;
  if (diff < 0) return "Upcoming";

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk${days >= 14 ? "s" : ""} ago`;

  return `${Math.floor(days / 30)} mo ago`;
}

export default function OverviewPage() {
  const [range, setRange] = useState<Range>("Last 30 days");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [greeting, setGreeting] = useState("Welcome back");

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  useEffect(() => {
    async function load() {
      const [l, d, v, p] = await Promise.all([
        supabase.from("leads").select("id, created_at, name, status"),
        supabase
          .from("deals")
          .select("id, created_at, client_name, property_name, deal_value, status, deal_date"),
        supabase
          .from("site_visits")
          .select("id, created_at, customer_name, property_name, visit_date, status"),
        supabase.from("properties").select("id, created_at, title, property_type"),
      ]);

      const firstError = l.error ?? d.error ?? v.error ?? p.error;

      if (firstError) {
        setError(firstError.message);
      } else {
        setError(null);
        setLeads((l.data ?? []) as LeadRow[]);
        setDeals((d.data ?? []) as DealRow[]);
        setVisits((v.data ?? []) as VisitRow[]);
        setProperties((p.data ?? []) as PropertyRow[]);
      }
      setLoading(false);
    }

    load();
  }, []);

  // close dropdown when clicking outside of it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectRange(value: Range) {
    setRange(value);
    setDropdownOpen(false);
  }

  const stats = useMemo(() => {
    const days = rangeDays[range];
    const now = Date.now();
    const start = now - days * DAY;
    const prevStart = now - 2 * days * DAY;

    const closed = deals.filter((d) => (d.status ?? "").toLowerCase() === "closed");
    const active = deals.filter((d) => (d.status ?? "").toLowerCase() === "active");

    const sumValue = (rows: DealRow[]) =>
      rows.reduce((total, d) => total + Number(d.deal_value ?? 0), 0);

    // Revenue = closed deals ki value (deal_date ke hisaab se)
    const revenue = sumValue(closed.filter((d) => between(d.deal_date, start, now)));
    const prevRevenue = sumValue(closed.filter((d) => between(d.deal_date, prevStart, start)));

    // New leads + conversion
    const leadsNow = leads.filter((l) => between(l.created_at, start, now));
    const leadsPrev = leads.filter((l) => between(l.created_at, prevStart, start));

    const convRate = (rows: LeadRow[]) =>
      rows.length
        ? (rows.filter((l) => (l.status ?? "").toLowerCase() === "converted").length /
            rows.length) *
          100
        : 0;

    const conversion = convRate(leadsNow);
    const prevConversion = convRate(leadsPrev);

    // Active deals
    const activeNow = active.filter((d) => between(d.deal_date, start, now)).length;
    const activePrev = active.filter((d) => between(d.deal_date, prevStart, start)).length;

    // Revenue chart: 6 buckets
    const buckets = 6;
    const bucketMs = (days * DAY) / buckets;

    const chart = Array.from({ length: buckets }, (_, i) => {
      const from = start + i * bucketMs;
      const to = i === buckets - 1 ? now : from + bucketMs;
      const value = sumValue(closed.filter((d) => between(d.deal_date, from, to)));

      return {
        name: new Date(from).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        revenue: Math.round((value / 100000) * 10) / 10,
      };
    });

    // Pipeline: leads.status se funnel (all leads)
    const stageOf = (l: LeadRow) => (l.status ?? "new").toLowerCase();
    const total = leads.length;

    const counts = [
      total,
      leads.filter((l) => ["contacted", "site_visit", "converted"].includes(stageOf(l))).length,
      leads.filter((l) => ["site_visit", "converted"].includes(stageOf(l))).length,
      leads.filter((l) => stageOf(l) === "converted").length,
    ];

    const names = ["Total Leads", "Contacted", "Site Visit", "Converted"];

    const stages = names.map((name, i) => ({
      name,
      value: counts[i],
      percentage: total ? Math.round((counts[i] / total) * 100) : 0,
    }));

    return {
      revenue,
      revenueChange: pctChange(revenue, prevRevenue),
      conversion,
      conversionChange: ptsChange(conversion, prevConversion),
      activeDeals: activeNow,
      dealsChange: countChange(activeNow, activePrev),
      newLeads: leadsNow.length,
      leadsChange: pctChange(leadsNow.length, leadsPrev.length),
      pipelineValue: sumValue(active),
      pipelineDeals: active.length,
      chart,
      stages,
      closedDeals: closed.filter((d) => between(d.deal_date, start, now)).length,
      siteVisits: visits.filter((v) => between(v.visit_date, start, now)).length,
    };
  }, [range, leads, deals, visits]);

  const activities = useMemo<Activity[]>(() => {
    const items: Activity[] = [
      ...leads.map((l) => ({
        key: `lead-${l.id}`,
        icon: Users,
        title: "New lead added",
        description: `${l.name ?? "A lead"} was added to the lead pipeline`,
        at: ts(l.created_at),
      })),
      ...visits.map((v) => ({
        key: `visit-${v.id}`,
        icon: CalendarDays,
        title: "Site visit scheduled",
        description: `${v.customer_name ?? "Client"} · ${v.property_name ?? "Property"}`,
        at: ts(v.created_at),
      })),
      ...deals.map((d) => {
        const status = (d.status ?? "").toLowerCase();
        return {
          key: `deal-${d.id}`,
          icon: CircleDollarSign,
          title:
            status === "closed"
              ? "Deal closed"
              : status === "cancelled"
              ? "Deal cancelled"
              : "Deal created",
          description: `${d.property_name ?? "Property"} · ${formatValue(Number(d.deal_value ?? 0))}`,
          at: ts(d.created_at),
        };
      }),
      ...properties.map((p) => ({
        key: `property-${p.id}`,
        icon: Building2,
        title: "Property added",
        description: `${p.title ?? "Property"} · ${p.property_type ?? ""}`,
        at: ts(p.created_at),
      })),
    ];

    return items
      .filter((a) => !Number.isNaN(a.at))
      .sort((a, b) => b.at - a.at)
      .slice(0, 5);
  }, [leads, visits, deals, properties]);

  const growth = stats.revenueChange;

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Dashboard Overview
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {greeting}, Abhishek
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            {loading
              ? "Loading your data..."
              : "Here's what's happening across your real-estate business."}
          </p>
        </div>

        {/* Working dropdown */}
        <div className="relative w-fit" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex w-fit items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.07]"
          >
            <CalendarDays className="h-4 w-4 text-zinc-500" />
            {range}
            <ChevronDown
              className={`h-4 w-4 text-zinc-500 transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#10141b] p-1.5 shadow-xl shadow-black/40">
              {ranges.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectRange(item)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/[0.06]"
                >
                  {item}
                  {range === item && <CheckCircle2 className="h-4 w-4 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="Revenue"
          value={formatValue(stats.revenue)}
          change={stats.revenueChange}
        />

        <KpiCard
          icon={Target}
          label="Conversion Rate"
          value={`${stats.conversion.toFixed(1)}%`}
          change={stats.conversionChange}
        />

        <KpiCard
          icon={TrendingUp}
          label="Active Deals"
          value={String(stats.activeDeals)}
          change={stats.dealsChange}
        />

        <KpiCard
          icon={Users}
          label="New Leads"
          value={String(stats.newLeads)}
          change={stats.leadsChange}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Revenue Trend</h2>

              <p className="mt-1 text-xs text-zinc-500">
                Closed deals, {range === "Last 30 days" ? "5-day" : "15-day"} periods
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Revenue
              </div>
            </div>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.chart}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickFormatter={(value) => `₹${value}L`}
                />

                <Tooltip
                  contentStyle={{
                    background: "#10141b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                  formatter={(value) => [`₹${Number(value).toFixed(1)}L`, "Revenue"]}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22d3ee"
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#22d3ee" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-600">Period</p>
              <p className="mt-1 text-sm font-medium text-zinc-300">{range}</p>
            </div>

            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-zinc-600">Revenue</p>
              <p className="mt-1 text-sm font-semibold text-cyan-400">
                {formatValue(stats.revenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white">Pipeline Overview</h2>

            <p className="mt-1 text-xs text-zinc-500">All leads across stages</p>
          </div>

          <div className="mb-7">
            <p className="text-xs text-zinc-500">
              Pipeline Value · {stats.pipelineDeals} active deal
              {stats.pipelineDeals === 1 ? "" : "s"}
            </p>

            <p className="mt-1 text-3xl font-semibold tracking-tight text-white">
              {formatValue(stats.pipelineValue)}
            </p>
          </div>

          <div className="space-y-5">
            {stats.stages.map((stage) => (
              <div key={stage.name}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{stage.name}</span>

                  <span className="text-xs font-medium text-zinc-300">{stage.value}</span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Recent Activity</h2>

              <p className="mt-1 text-xs text-zinc-500">Latest updates from your team</p>
            </div>

            <Link
              href="/real-estate/team-performance"
              className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
            >
              View all
            </Link>
          </div>

          <div className="space-y-1">
            {activities.map((activity) => {
              const Icon = activity.icon;

              return (
                <div
                  key={activity.key}
                  className="flex items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-white/[0.03]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <Icon className="h-4 w-4 text-cyan-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200">{activity.title}</p>

                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {activity.description}
                    </p>
                  </div>

                  <span className="shrink-0 text-[11px] text-zinc-600">
                    {timeAgo(activity.at)}
                  </span>
                </div>
              );
            })}

            {!loading && activities.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">No activity yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white">Quick Stats</h2>

            <p className="mt-1 text-xs text-zinc-500">
              Business snapshot for {range.toLowerCase()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <QuickStat icon={Building2} label="Properties" value={String(properties.length)} />
            <QuickStat icon={CalendarDays} label="Site Visits" value={String(stats.siteVisits)} />
            <QuickStat icon={Users} label="Total Leads" value={String(leads.length)} />
            <QuickStat
              icon={CircleDollarSign}
              label="Closed Deals"
              value={String(stats.closedDeals)}
            />
          </div>

          <div className="mt-4 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />

              <span className="text-xs font-medium text-cyan-300">Revenue growth</span>
            </div>

            <p className="mt-2 text-2xl font-semibold text-white">
              {growth.label === "New" ? "New" : `${growth.up ? "+" : "-"}${growth.label}`}
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Compared with the previous period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  change,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  change: Change;
}) {
  const Arrow = change.up ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Icon className="h-4 w-4 text-cyan-400" />
        </div>

        <div
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
            change.up ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
          }`}
        >
          <Arrow className="h-3 w-3" />
          {change.label}
        </div>
      </div>

      <p className="mt-5 text-xs text-zinc-500">{label}</p>

      <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</p>

      <p className="mt-1 text-[11px] text-zinc-600">vs previous period</p>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-zinc-500" />

        <span className="text-xs text-zinc-500">{label}</span>
      </div>

      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}