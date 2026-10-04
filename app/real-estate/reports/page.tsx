"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  TrendingUp,
  Users,
  Building2,
  Target,
  Eye,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Period = "7D" | "30D" | "90D" | "1Y";

type LeadRow = {
  id: number;
  property_interest: string | null;
  created_at: string | null;
  agent_id: number | null;
};

type VisitRow = {
  id: number;
  property_id: number | null;
  property_name: string | null;
  visit_date: string | null;
  agent_id: number | null;
};

type DealRow = {
  id: number;
  property_id: number | null;
  property_name: string | null;
  deal_value: number | string | null;
  status: string | null;
  deal_date: string | null;
  agent_id: number | null;
};

type PropertyRow = {
  id: number;
  title: string | null;
};

type AgentRow = {
  id: number;
  name: string | null;
  role: string | null;
};

type SummaryData = {
  revenue: number;
  deals: number;
  leads: number;
  visits: number;
  growth: number;
};

type MonthlyData = {
  month: string;
  leads: number;
  visits: number;
  deals: number;
  revenue: number;
};

type PropertyPerformance = {
  name: string;
  leads: number;
  visits: number;
  deals: number;
  revenue: number;
};

type TeamPerformance = {
  name: string;
  role: string;
  leads: number;
  visits: number;
  deals: number;
  revenue: number;
};

const PERIODS: Period[] = ["7D", "30D", "90D", "1Y"];

function formatRevenue(value: number) {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  }

  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} Lakh`;
  }

  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-IN", {
    month: "short",
  });
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function getPeriodDays(period: Period) {
  if (period === "7D") return 7;
  if (period === "30D") return 30;
  if (period === "90D") return 90;
  return 365;
}

function isDateInRange(
  value: string | null,
  start: Date,
  end: Date
): boolean {
  if (!value) return false;

  const date = new Date(value);

  return date >= start && date <= end;
}

function getRange(period: Period, referenceDate = new Date()) {
  const end = endOfDay(referenceDate);
  const start = startOfDay(referenceDate);

  start.setDate(start.getDate() - (getPeriodDays(period) - 1));

  return { start, end };
}

function getPreviousRange(period: Period, referenceDate = new Date()) {
  const current = getRange(period, referenceDate);
  const days = getPeriodDays(period);

  const previousEnd = new Date(current.start);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (days - 1));

  return {
    start: startOfDay(previousStart),
    end: endOfDay(previousEnd),
  };
}

function calculateGrowth(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function StatCard({
  icon,
  label,
  value,
  growth,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  growth?: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-white/45">{label}</span>

        <span className="text-white/40">{icon}</span>
      </div>

      <p className="text-2xl font-semibold">{value}</p>

      {growth !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <TrendingUp size={13} />
          <span className={growth >= 0 ? "text-emerald-300" : "text-red-300"}>
            {growth >= 0 ? "+" : ""}
            {growth.toFixed(1)}%
          </span>
          <span className="text-white/30">vs previous period</span>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("30D");

  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [exportedReport, setExportedReport] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [
      leadsRes,
      visitsRes,
      dealsRes,
      propertiesRes,
      agentsRes,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("id, property_interest, created_at, agent_id"),

      supabase
        .from("site_visits")
        .select("id, property_id, property_name, visit_date, agent_id"),

      supabase
        .from("deals")
        .select(
          "id, property_id, property_name, deal_value, status, deal_date, agent_id"
        ),

      supabase.from("properties").select("id, title"),

      supabase.from("agents").select("id, name, role"),
    ]);

    const firstError =
      leadsRes.error ||
      visitsRes.error ||
      dealsRes.error ||
      propertiesRes.error ||
      agentsRes.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setLeads((leadsRes.data ?? []) as LeadRow[]);
    setVisits((visitsRes.data ?? []) as VisitRow[]);
    setDeals((dealsRes.data ?? []) as DealRow[]);
    setProperties((propertiesRes.data ?? []) as PropertyRow[]);
    setAgents((agentsRes.data ?? []) as AgentRow[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const range = useMemo(() => getRange(period), [period]);
  const previousRange = useMemo(() => getPreviousRange(period), [period]);

  const currentDeals = useMemo(() => {
    return deals.filter(
      (deal) =>
        String(deal.status).toLowerCase() === "closed" &&
        isDateInRange(deal.deal_date, range.start, range.end)
    );
  }, [deals, range]);

  const previousDeals = useMemo(() => {
    return deals.filter(
      (deal) =>
        String(deal.status).toLowerCase() === "closed" &&
        isDateInRange(
          deal.deal_date,
          previousRange.start,
          previousRange.end
        )
    );
  }, [deals, previousRange]);

  const currentLeads = useMemo(() => {
    return leads.filter((lead) =>
      isDateInRange(lead.created_at, range.start, range.end)
    );
  }, [leads, range]);

  const previousLeads = useMemo(() => {
    return leads.filter((lead) =>
      isDateInRange(
        lead.created_at,
        previousRange.start,
        previousRange.end
      )
    );
  }, [leads, previousRange]);

  const currentVisits = useMemo(() => {
    return visits.filter((visit) =>
      isDateInRange(visit.visit_date, range.start, range.end)
    );
  }, [visits, range]);

  const previousVisits = useMemo(() => {
    return visits.filter((visit) =>
      isDateInRange(
        visit.visit_date,
        previousRange.start,
        previousRange.end
      )
    );
  }, [visits, previousRange]);

  const revenue = useMemo(() => {
    return currentDeals.reduce(
      (total, deal) => total + (Number(deal.deal_value) || 0),
      0
    );
  }, [currentDeals]);

  const previousRevenue = useMemo(() => {
    return previousDeals.reduce(
      (total, deal) => total + (Number(deal.deal_value) || 0),
      0
    );
  }, [previousDeals]);

  const summary: SummaryData = {
    revenue,
    deals: currentDeals.length,
    leads: currentLeads.length,
    visits: currentVisits.length,
    growth: calculateGrowth(revenue, previousRevenue),
  };

  /*
   * Last 6 calendar months.
   */
  const monthlyPerformance = useMemo<MonthlyData[]>(() => {
    const now = new Date();

    const months: {
      key: string;
      date: Date;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`,
        date,
      });
    }

    return months.map(({ key, date }) => {
      const monthLeads = leads.filter((lead) => {
        if (!lead.created_at) return false;

        const value = new Date(lead.created_at);

        return (
          value.getFullYear() === date.getFullYear() &&
          value.getMonth() === date.getMonth()
        );
      }).length;

      const monthVisits = visits.filter((visit) => {
        if (!visit.visit_date) return false;

        const value = new Date(visit.visit_date);

        return (
          value.getFullYear() === date.getFullYear() &&
          value.getMonth() === date.getMonth()
        );
      }).length;

      const monthDeals = deals.filter((deal) => {
        if (
          !deal.deal_date ||
          String(deal.status).toLowerCase() !== "closed"
        ) {
          return false;
        }

        const value = new Date(deal.deal_date);

        return (
          value.getFullYear() === date.getFullYear() &&
          value.getMonth() === date.getMonth()
        );
      });

      return {
        month: formatMonth(date),
        leads: monthLeads,
        visits: monthVisits,
        deals: monthDeals.length,
        revenue: monthDeals.reduce(
          (total, deal) => total + (Number(deal.deal_value) || 0),
          0
        ),
      };
    });
  }, [leads, visits, deals]);

  /*
   * Property performance.
   *
   * Leads are matched using property_interest.
   * Visits and deals use property_id / property_name.
   */
  const propertyPerformance = useMemo<PropertyPerformance[]>(() => {
    const map = new Map<string, PropertyPerformance>();

    properties.forEach((property) => {
      const name = property.title?.trim();

      if (!name) return;

      map.set(name.toLowerCase(), {
        name,
        leads: 0,
        visits: 0,
        deals: 0,
        revenue: 0,
      });
    });

    currentLeads.forEach((lead) => {
      if (!lead.property_interest) return;

      const interest = lead.property_interest.trim().toLowerCase();

      const existing = map.get(interest);

      if (existing) {
        existing.leads += 1;
      } else {
        map.set(interest, {
          name: lead.property_interest.trim(),
          leads: 1,
          visits: 0,
          deals: 0,
          revenue: 0,
        });
      }
    });

    currentVisits.forEach((visit) => {
      let propertyName = visit.property_name?.trim() || "";

      if (visit.property_id) {
        const property = properties.find(
          (item) => item.id === visit.property_id
        );

        if (property?.title) {
          propertyName = property.title;
        }
      }

      if (!propertyName) return;

      const key = propertyName.toLowerCase();

      const existing = map.get(key);

      if (existing) {
        existing.visits += 1;
      } else {
        map.set(key, {
          name: propertyName,
          leads: 0,
          visits: 1,
          deals: 0,
          revenue: 0,
        });
      }
    });

    currentDeals.forEach((deal) => {
      let propertyName = deal.property_name?.trim() || "";

      if (deal.property_id) {
        const property = properties.find(
          (item) => item.id === deal.property_id
        );

        if (property?.title) {
          propertyName = property.title;
        }
      }

      if (!propertyName) return;

      const key = propertyName.toLowerCase();

      const existing = map.get(key);

      if (existing) {
        existing.deals += 1;
        existing.revenue += Number(deal.deal_value) || 0;
      } else {
        map.set(key, {
          name: propertyName,
          leads: 0,
          visits: 0,
          deals: 1,
          revenue: Number(deal.deal_value) || 0,
        });
      }
    });

    return Array.from(map.values())
      .filter(
        (property) =>
          property.leads > 0 ||
          property.visits > 0 ||
          property.deals > 0
      )
      .sort((a, b) => {
        if (b.revenue !== a.revenue) {
          return b.revenue - a.revenue;
        }

        return b.leads - a.leads;
      })
      .slice(0, 10);
  }, [properties, currentLeads, currentVisits, currentDeals]);

  /*
   * Team performance.
   */
  const teamPerformance = useMemo<TeamPerformance[]>(() => {
    return agents
      .map((agent) => {
        const agentLeads = currentLeads.filter(
          (lead) => lead.agent_id === agent.id
        ).length;

        const agentVisits = currentVisits.filter(
          (visit) => visit.agent_id === agent.id
        ).length;

        const agentDeals = currentDeals.filter(
          (deal) => deal.agent_id === agent.id
        );

        const agentRevenue = agentDeals.reduce(
          (total, deal) => total + (Number(deal.deal_value) || 0),
          0
        );

        return {
          name: agent.name || "Unnamed Agent",
          role: agent.role || "",
          leads: agentLeads,
          visits: agentVisits,
          deals: agentDeals.length,
          revenue: agentRevenue,
        };
      })
      .filter(
        (member) =>
          member.leads > 0 ||
          member.visits > 0 ||
          member.deals > 0
      )
      .sort((a, b) => {
        if (b.revenue !== a.revenue) {
          return b.revenue - a.revenue;
        }

        return b.leads - a.leads;
      });
  }, [agents, currentLeads, currentVisits, currentDeals]);

  const reportCards = [
    {
      id: "sales",
      title: "Sales Report",
      description: "Revenue and closed deal performance.",
      icon: <TrendingUp size={18} />,
      value: formatRevenue(summary.revenue),
      secondary: `${summary.deals} closed deals`,
    },
    {
      id: "leads",
      title: "Lead Report",
      description: "Lead generation and conversion activity.",
      icon: <Target size={18} />,
      value: summary.leads.toLocaleString("en-IN"),
      secondary: `${summary.visits} site visits`,
    },
    {
      id: "property",
      title: "Property Report",
      description: "Performance by property.",
      icon: <Building2 size={18} />,
      value: String(propertyPerformance.length),
      secondary: "Properties with activity",
    },
    {
      id: "team",
      title: "Team Report",
      description: "Sales team performance.",
      icon: <Users size={18} />,
      value: String(teamPerformance.length),
      secondary: "Members with activity",
    },
  ];

  function escapeCsv(value: unknown): string {
    const str = value === null || value === undefined ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function downloadCsv(filename: string, rows: (string | number)[][]) {
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    // BOM lagate hain taaki Excel mein ₹ aur unicode sahi dikhe
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function buildReportCsv(reportId: string): {
    filename: string;
    rows: (string | number)[][];
  } {
    const stamp = new Date().toISOString().slice(0, 10);
    const periodLabel = period;

    if (reportId === "sales") {
      const rows: (string | number)[][] = [
        ["Sales Report", `${periodLabel} performance`],
        ["Generated on", new Date().toLocaleString("en-IN")],
        [],
        ["Summary"],
        ["Total Revenue", Math.round(summary.revenue)],
        ["Closed Deals", summary.deals],
        ["Growth vs previous period (%)", summary.growth.toFixed(2)],
        [],
        ["Monthly Breakdown"],
        ["Month", "Leads", "Visits", "Deals", "Revenue (₹)"],
      ];

      monthlyPerformance.forEach((m) => {
        rows.push([
          m.month,
          m.leads,
          m.visits,
          m.deals,
          Math.round(m.revenue),
        ]);
      });

      rows.push([]);
      rows.push(["Property-wise Revenue"]);
      rows.push(["Property", "Leads", "Visits", "Deals", "Revenue (₹)"]);
      propertyPerformance.forEach((p) => {
        rows.push([
          p.name,
          p.leads,
          p.visits,
          p.deals,
          Math.round(p.revenue),
        ]);
      });

      return { filename: `sales-report-${stamp}.csv`, rows };
    }

    if (reportId === "leads") {
      const rows: (string | number)[][] = [
        ["Lead Report", `${periodLabel} performance`],
        ["Generated on", new Date().toLocaleString("en-IN")],
        [],
        ["Summary"],
        ["Total Leads", summary.leads],
        ["Site Visits", summary.visits],
        [],
        ["Monthly Breakdown"],
        ["Month", "Leads", "Visits", "Deals", "Revenue (₹)"],
      ];

      monthlyPerformance.forEach((m) => {
        rows.push([
          m.month,
          m.leads,
          m.visits,
          m.deals,
          Math.round(m.revenue),
        ]);
      });

      return { filename: `lead-report-${stamp}.csv`, rows };
    }

    if (reportId === "property") {
      const rows: (string | number)[][] = [
        ["Property Report", `${periodLabel} performance`],
        ["Generated on", new Date().toLocaleString("en-IN")],
        [],
        ["Property", "Leads", "Visits", "Deals", "Revenue (₹)"],
      ];

      propertyPerformance.forEach((p) => {
        rows.push([
          p.name,
          p.leads,
          p.visits,
          p.deals,
          Math.round(p.revenue),
        ]);
      });

      return { filename: `property-report-${stamp}.csv`, rows };
    }

    // team
    const rows: (string | number)[][] = [
      ["Team Report", `${periodLabel} performance`],
      ["Generated on", new Date().toLocaleString("en-IN")],
      [],
      ["Team Member", "Role", "Leads", "Visits", "Deals", "Revenue (₹)"],
    ];

    teamPerformance.forEach((m) => {
      rows.push([
        m.name,
        m.role,
        m.leads,
        m.visits,
        m.deals,
        Math.round(m.revenue),
      ]);
    });

    return { filename: `team-report-${stamp}.csv`, rows };
  }

  function handleExport(reportId: string, reportTitle: string) {
    const { filename, rows } = buildReportCsv(reportId);
    downloadCsv(filename, rows);

    setExportedReport(reportTitle);

    window.setTimeout(() => {
      setExportedReport(null);
    }, 2500);
  }

  const maxMonthlyValue = Math.max(
    ...monthlyPerformance.map((item) =>
      Math.max(item.revenue, item.leads, item.visits, item.deals)
    ),
    1
  );

  return (
    <div className="min-h-screen text-white">
      <main className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Reports
            </h1>

            <p className="mt-1 text-sm text-white/45">
              Analyze sales, leads, properties and team performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`rounded-xl border px-3 py-2 text-xs transition ${
                  period === item
                    ? "border-white/20 bg-white text-black"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Could not load report data: {error}
          </div>
        )}

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Revenue"
            value={formatRevenue(summary.revenue)}
            growth={summary.growth}
          />

          <StatCard
            icon={<BarChart3 size={18} />}
            label="Closed Deals"
            value={String(summary.deals)}
          />

          <StatCard
            icon={<Target size={18} />}
            label="Leads"
            value={String(summary.leads)}
          />

          <StatCard
            icon={<CalendarDays size={18} />}
            label="Site Visits"
            value={String(summary.visits)}
          />
        </div>

        {/* Report Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {reportCards.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-white/55">
                  {report.icon}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReport(report.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <Eye size={16} />
                </button>
              </div>

              <h2 className="text-sm font-semibold">{report.title}</h2>

              <p className="mt-1 text-xs leading-5 text-white/35">
                {report.description}
              </p>

              <div className="mt-5">
                <p className="text-2xl font-semibold">{report.value}</p>

                <p className="mt-1 text-xs text-white/35">
                  {report.secondary}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExport(report.id, report.title)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/55 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Download size={13} />
                Export
              </button>
            </div>
          ))}
        </div>

        {/* Monthly Performance */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                Monthly Performance
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Live performance from your Supabase records.
              </p>
            </div>

            <BarChart3 size={18} className="text-white/30" />
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-white/35">
              Loading report data...
            </div>
          ) : (
            <div className="space-y-5">
              {monthlyPerformance.map((month) => (
                <div key={month.month}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-white/60">
                      {month.month}
                    </span>

                    <div className="flex gap-4 text-[11px] text-white/35">
                      <span>{month.leads} leads</span>
                      <span>{month.visits} visits</span>
                      <span>{month.deals} deals</span>
                      <span>{formatRevenue(month.revenue)}</span>
                    </div>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-white transition-all"
                      style={{
                        width: `${Math.max(
                          3,
                          (month.revenue / maxMonthlyValue) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Property + Team */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Property Performance */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="text-sm font-semibold">
                  Property Performance
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Property-wise leads, visits and closed revenue.
                </p>
              </div>

              <Building2 size={18} className="text-white/30" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="px-5 py-4 text-xs font-medium text-white/35">
                      Property
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-white/35">
                      Leads
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-white/35">
                      Visits
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-white/35">
                      Deals
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-white/35">
                      Revenue
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {propertyPerformance.map((property) => (
                    <tr
                      key={property.name}
                      className="border-b border-white/[0.05]"
                    >
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium">
                          {property.name}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-white/60">
                        {property.leads}
                      </td>

                      <td className="px-5 py-4 text-sm text-white/60">
                        {property.visits}
                      </td>

                      <td className="px-5 py-4 text-sm text-white/60">
                        {property.deals}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium">
                        {formatRevenue(property.revenue)}
                      </td>
                    </tr>
                  ))}

                  {!loading && propertyPerformance.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-white/35"
                      >
                        No property activity in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team Performance */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="text-sm font-semibold">
                  Team Performance
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Agent-wise performance for the selected period.
                </p>
              </div>

              <Users size={18} className="text-white/30" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="px-5 py-4 text-xs font-medium text-white/35">
                      Team Member
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-white/35">
                      Leads
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-white/35">
                      Visits
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-white/35">
                      Deals
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-white/35">
                      Revenue
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {teamPerformance.map((member) => (
                    <tr
                      key={member.name}
                      className="border-b border-white/[0.05]"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium">
                            {member.name}
                          </p>

                          {member.role && (
                            <p className="mt-0.5 text-[11px] text-white/30">
                              {member.role}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-white/60">
                        {member.leads}
                      </td>

                      <td className="px-5 py-4 text-sm text-white/60">
                        {member.visits}
                      </td>

                      <td className="px-5 py-4 text-sm text-white/60">
                        {member.deals}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium">
                        {formatRevenue(member.revenue)}
                      </td>
                    </tr>
                  ))}

                  {!loading && teamPerformance.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-white/35"
                      >
                        No team activity in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Export Toast */}
      {exportedReport && (
        <div className="fixed bottom-5 right-5 z-[100] rounded-xl border border-white/10 bg-[#151515] px-4 py-3 text-sm text-white shadow-2xl">
          {exportedReport} export ready.
        </div>
      )}

           {/* Details Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-xs text-white/35">Detailed Report</p>

                <h2 className="mt-1 text-xl font-semibold">
                  {reportCards.find(
                    (report) => report.id === selectedReport
                  )?.title ?? "Report"}
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  {period} performance
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            {/* Summary cards - always shown */}
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-white/40">Revenue</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatRevenue(summary.revenue)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-white/40">Closed Deals</p>
                <p className="mt-1 text-lg font-semibold">
                  {summary.deals}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-white/40">Leads</p>
                <p className="mt-1 text-lg font-semibold">
                  {summary.leads}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-white/40">Site Visits</p>
                <p className="mt-1 text-lg font-semibold">
                  {summary.visits}
                </p>
              </div>
            </div>

            {/* Period comparison */}
            <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-white/40" />
                <p className="text-xs text-white/40">Period comparison</p>
              </div>

              <p className="mt-2 text-sm text-white/70">
                Revenue is{" "}
                <span
                  className={
                    summary.growth >= 0
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                >
                  {summary.growth >= 0 ? "+" : ""}
                  {summary.growth.toFixed(1)}%
                </span>{" "}
                compared with the previous equivalent period.
              </p>
            </div>

            {/* Sales report detail */}
            {selectedReport === "sales" && (
              <div className="mb-5">
                <h3 className="mb-3 text-sm font-semibold">
                  Monthly Breakdown
                </h3>

                <div className="overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-left">
                        <th className="px-4 py-3 text-xs font-medium text-white/40">
                          Month
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-white/40">
                          Leads
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-white/40">
                          Visits
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-white/40">
                          Deals
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-white/40">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyPerformance.map((m) => (
                        <tr
                          key={m.month}
                          className="border-b border-white/[0.05]"
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            {m.month}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/60">
                            {m.leads}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/60">
                            {m.visits}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/60">
                            {m.deals}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {formatRevenue(m.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {propertyPerformance.length > 0 && (
                  <>
                    <h3 className="mb-3 mt-5 text-sm font-semibold">
                      Top Properties
                    </h3>

                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.03] text-left">
                            <th className="px-4 py-3 text-xs font-medium text-white/40">
                              Property
                            </th>
                            <th className="px-4 py-3 text-xs font-medium text-white/40">
                              Leads
                            </th>
                            <th className="px-4 py-3 text-xs font-medium text-white/40">
                              Deals
                            </th>
                            <th className="px-4 py-3 text-xs font-medium text-white/40">
                              Revenue
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {propertyPerformance
                            .slice(0, 5)
                            .map((p) => (
                              <tr
                                key={p.name}
                                className="border-b border-white/[0.05]"
                              >
                                <td className="px-4 py-3 text-sm font-medium">
                                  {p.name}
                                </td>
                                <td className="px-4 py-3 text-sm text-white/60">
                                  {p.leads}
                                </td>
                                <td className="px-4 py-3 text-sm text-white/60">
                                  {p.deals}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium">
                                  {formatRevenue(p.revenue)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Lead report detail */}
            {selectedReport === "leads" && (
              <div className="mb-5">
                <h3 className="mb-3 text-sm font-semibold">
                  Monthly Leads & Visits
                </h3>

                <div className="overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-left">
                        <th className="px-4 py-3 text-xs font-medium text-white/40">
                          Month
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-white/40">
                          Leads
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-white/40">
                          Visits
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-white/40">
                          Deals
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyPerformance.map((m) => (
                        <tr
                          key={m.month}
                          className="border-b border-white/[0.05]"
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            {m.month}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/60">
                            {m.leads}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/60">
                            {m.visits}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/60">
                            {m.deals}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Property report detail */}
            {selectedReport === "property" && (
              <div className="mb-5">
                <h3 className="mb-3 text-sm font-semibold">
                  Property-wise Performance
                </h3>

                {propertyPerformance.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/40">
                    No property activity in this period.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.03] text-left">
                          <th className="px-4 py-3 text-xs font-medium text-white/40">
                            Property
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-white/40">
                            Leads
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-white/40">
                            Visits
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-white/40">
                            Deals
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-white/40">
                            Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyPerformance.map((p) => (
                          <tr
                            key={p.name}
                            className="border-b border-white/[0.05]"
                          >
                            <td className="px-4 py-3 text-sm font-medium">
                              {p.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-white/60">
                              {p.leads}
                            </td>
                            <td className="px-4 py-3 text-sm text-white/60">
                              {p.visits}
                            </td>
                            <td className="px-4 py-3 text-sm text-white/60">
                              {p.deals}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {formatRevenue(p.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Team report detail */}
            {selectedReport === "team" && (
              <div className="mb-5">
                <h3 className="mb-3 text-sm font-semibold">
                  Team-wise Performance
                </h3>

                {teamPerformance.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/40">
                    No team activity in this period.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.03] text-left">
                          <th className="px-4 py-3 text-xs font-medium text-white/40">
                            Member
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-white/40">
                            Leads
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-white/40">
                            Visits
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-white/40">
                            Deals
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-white/40">
                            Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamPerformance.map((m) => (
                          <tr
                            key={m.name}
                            className="border-b border-white/[0.05]"
                          >
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium">
                                {m.name}
                              </p>
                              {m.role && (
                                <p className="mt-0.5 text-[11px] text-white/30">
                                  {m.role}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-white/60">
                              {m.leads}
                            </td>
                            <td className="px-4 py-3 text-sm text-white/60">
                              {m.visits}
                            </td>
                            <td className="px-4 py-3 text-sm text-white/60">
                              {m.deals}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {formatRevenue(m.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const report = reportCards.find(
                    (r) => r.id === selectedReport
                  );
                  if (report) {
                    handleExport(report.id, report.title);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Download size={14} />
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}