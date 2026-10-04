"use client";

import { useMemo, useState } from "react";
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

import RealEstateFrame from "./RealEstateFrame";

type Range = "Last 30 days" | "Last 90 days";

const revenueData30 = [
  { month: "Week 1", revenue: 72, target: 65 },
  { month: "Week 2", revenue: 86, target: 72 },
  { month: "Week 3", revenue: 104, target: 84 },
  { month: "Week 4", revenue: 128, target: 96 },
];

const revenueData90 = [
  { month: "Jul", revenue: 354, target: 270 },
  { month: "Aug", revenue: 402, target: 295 },
  { month: "Sep", revenue: 438, target: 318 },
  { month: "Oct", revenue: 477, target: 341 },
  { month: "Nov", revenue: 520, target: 365 },
  { month: "Dec", revenue: 584, target: 404 },
];

const rangeData = {
  "Last 30 days": {
    revenue: "₹3.9 Cr",
    conversion: "26.4%",
    activeDeals: "52",
    newLeads: "214",
    revenueChange: "14.8%",
    conversionChange: "4.1%",
    dealsChange: "8",
    leadsChange: "21.6%",
    pipeline: "₹5.6 Cr",
  },

  "Last 90 days": {
    revenue: "₹12.8 Cr",
    conversion: "24.8%",
    activeDeals: "71",
    newLeads: "487",
    revenueChange: "18.2%",
    conversionChange: "3.7%",
    dealsChange: "12",
    leadsChange: "24.5%",
    pipeline: "₹14.2 Cr",
  },
};

const deals = [
  {
    name: "Arjun Mehta",
    property: "Skyline Heights · 3 BHK",
    amount: "₹1.42 Cr",
    status: "Negotiation",
    initials: "AM",
  },
  {
    name: "Priya Sharma",
    property: "The Grand Residences · 2 BHK",
    amount: "₹86 Lakh",
    status: "Proposal",
    initials: "PS",
  },
  {
    name: "Rahul Kapoor",
    property: "Palm Grove Villas · Villa 08",
    amount: "₹2.15 Cr",
    status: "Qualified",
    initials: "RK",
  },
  {
    name: "Neha Verma",
    property: "Lakeview Enclave · Plot 24",
    amount: "₹64 Lakh",
    status: "Lead",
    initials: "NV",
  },
];

const stages30 = [
  {
    name: "New Lead",
    count: 96,
    percent: 48,
    color: "#06b6d4",
  },
  {
    name: "Qualified",
    count: 58,
    percent: 29,
    color: "#22c55e",
  },
  {
    name: "Site Visit",
    count: 31,
    percent: 15,
    color: "#f59e0b",
  },
  {
    name: "Negotiation",
    count: 16,
    percent: 8,
    color: "#8b5cf6",
  },
];

const stages90 = [
  {
    name: "New Lead",
    count: 187,
    percent: 45,
    color: "#06b6d4",
  },
  {
    name: "Qualified",
    count: 116,
    percent: 28,
    color: "#22c55e",
  },
  {
    name: "Site Visit",
    count: 74,
    percent: 18,
    color: "#f59e0b",
  },
  {
    name: "Negotiation",
    count: 37,
    percent: 9,
    color: "#8b5cf6",
  },
];

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

  const currentData = rangeData[range];

  const chartData =
    range === "Last 30 days" ? revenueData30 : revenueData90;

  const stages =
    range === "Last 30 days" ? stages30 : stages90;

  const filteredDeals = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return deals;
    }

    return deals.filter((deal) =>
      `${deal.name} ${deal.property} ${deal.status}`
        .toLowerCase()
        .includes(query)
    );
  }, [search]);

  function toggleRange() {
    setRange((current) =>
      current === "Last 30 days"
        ? "Last 90 days"
        : "Last 30 days"
    );
  }

  return (
    <RealEstateFrame
      title="Overview"
      subtitle="Realty operations dashboard"
    >
      <div className="mx-auto max-w-[1500px]">

        {/* Page heading */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Good morning, Jordan
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

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="Total Revenue"
            value={currentData.revenue}
            change={currentData.revenueChange}
            positive
            icon={<CircleDollarSign size={18} />}
          />

          <Metric
            title="Conversion Rate"
            value={currentData.conversion}
            change={currentData.conversionChange}
            positive
            icon={<TrendingUp size={18} />}
          />

          <Metric
            title="Active Deals"
            value={currentData.activeDeals}
            change={currentData.dealsChange}
            icon={<Target size={18} />}
          />

          <Metric
            title="New Leads"
            value={currentData.newLeads}
            change={currentData.leadsChange}
            positive
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
                <AreaChart data={chartData}>
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
                      name === "revenue"
                        ? "Revenue"
                        : "Target",
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

            <h3 className="font-semibold text-white">
              Lead Pipeline
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              Distribution by stage · {range}
            </p>

            <div className="mt-7 space-y-6">
              {stages.map((stage) => (
                <div key={stage.name}>

                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {stage.name}
                    </span>

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
                        width: `${stage.percent * 2.2}%`,
                        background: stage.color,
                      }}
                    />
                  </div>

                </div>
              ))}
            </div>

            <div className="mt-7 flex items-end justify-between border-t border-white/[0.08] pt-5">
              <span className="text-sm text-zinc-500">
                Total pipeline value
              </span>

              <span className="text-2xl font-semibold">
                {currentData.pipeline}
              </span>
            </div>

          </section>
        </div>

        {/* Recent Deals */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0e12]">

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-5 md:px-6">

            <div>
              <h3 className="font-semibold text-white">
                Recent Deals
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Latest activity across your pipeline
              </p>
            </div>

            <button className="text-sm font-medium text-cyan-400 transition hover:text-cyan-300">
              View all <ArrowUpRight size={14} className="inline" />
            </button>

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
                  <th className="px-5 py-4 font-medium md:px-6">
                    Client
                  </th>

                  <th className="px-5 py-4 font-medium">
                    Property
                  </th>

                  <th className="px-5 py-4 font-medium">
                    Value
                  </th>

                  <th className="px-5 py-4 font-medium">
                    Stage
                  </th>

                  <th className="px-5 py-4 font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredDeals.map((deal) => (
                  <tr
                    key={deal.name}
                    className="border-t border-white/[0.06] transition hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4 md:px-6">
                      <div className="flex items-center gap-3">

                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-300">
                          {deal.initials}
                        </span>

                        <span className="text-sm font-medium">
                          {deal.name}
                        </span>

                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-400">
                      {deal.property}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium">
                      {deal.amount}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-zinc-300">
                        {deal.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button className="text-xs text-cyan-400 hover:text-cyan-300">
                        Open deal
                      </button>
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
            value={range === "Last 30 days" ? "12" : "34"}
            note={
              range === "Last 30 days"
                ? "3 pending confirmation"
                : "8 pending confirmation"
            }
          />

          <MiniCard
            icon={<Building2 size={18} />}
            title="Available properties"
            value={range === "Last 30 days" ? "68" : "82"}
            note={
              range === "Last 30 days"
                ? "Across 14 projects"
                : "Across 18 projects"
            }
          />

          <MiniCard
            icon={<FileText size={18} />}
            title="Proposals sent"
            value={range === "Last 30 days" ? "23" : "61"}
            note={
              range === "Last 30 days"
                ? "8 awaiting response"
                : "17 awaiting response"
            }
          />

        </div>

      </div>
    </RealEstateFrame>
  );
}