"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Target,
  Building2,
  CalendarDays,
  Users,
  CircleDollarSign,
  BarChart3,
  TrendingUp,
  FileText,
  Settings,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const links = [
  ["Overview", "/real-estate", LayoutDashboard],
  ["Leads", "/real-estate/leads", Target],
  ["Properties", "/real-estate/properties", Building2],
  ["Site Visits", "/real-estate/site-visits", CalendarDays],
  ["Clients", "/real-estate/clients", Users],
  ["Deals", "/real-estate/deals", CircleDollarSign],
  ["Performance", "/real-estate/team-performance", BarChart3],
  ["Forecasting", "/real-estate/forecasting", TrendingUp],
  ["Reports", "/real-estate/reports", FileText],
] as const;

const subtitles: Record<string, string> = {
  Overview: "Realty operations dashboard",
  Leads: "Manage and track your sales pipeline",
  Properties: "Manage your property inventory",
  "Site Visits": "Schedule and track property visits",
  Clients: "Manage your client relationships",
  Deals: "Track deals, payments and transactions",
  Performance: "Monitor team performance",
  Forecasting: "Revenue and sales forecasting",
  Reports: "Business performance reports",
  Settings: "Manage dashboard preferences",
};

export default function RealEstateFrame({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeLink = links.find(([, href]) => {
    if (href === "/real-estate") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  });

  const activeTitle = activeLink?.[0] ?? "Overview";
  const activesubtitle = subtitles[activeTitle] ?? "Realty operations dashboard";

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#0b0f18]/95 px-4 backdrop-blur">
        <div>
          <div className="text-sm font-semibold">RealEstate OS</div>
          <div className="text-[10px] text-white/40">Management Dashboard</div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-white/10 bg-white/[0.04] p-2"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60">
          <div className="absolute left-0 top-16 bottom-0 w-[270px] border-r border-white/10 bg-[#0b0f18] p-4 overflow-y-auto">
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#0b0f18]">
          <SidebarContent pathname={pathname} />
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {/* Desktop Top Bar */}
          <header className="hidden lg:flex h-[76px] items-center justify-between border-b border-white/10 bg-[#0b0f18]/70 px-8 backdrop-blur">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {activeTitle}
              </h1>
              <p className="mt-1 text-xs text-white/40">{subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden xl:block text-right">
                <div className="text-xs font-medium text-white/80">
                  Real Estate Admin
                </div>
                <div className="text-[10px] text-white/35">
                  Management Portal
                </div>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                RE
              </div>
            </div>
          </header>

          {/* Mobile Page Heading */}
          <div className="lg:hidden border-b border-white/10 px-5 py-4">
            <h1 className="text-lg font-semibold">{activeTitle}</h1>
            <p className="mt-1 text-xs text-white/40">{subtitle}</p>
          </div>

          {/* Page Content */}
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {/* Brand */}
      <div className="flex h-[76px] items-center border-b border-white/10 px-5">
        <div>
          <div className="text-base font-bold tracking-tight">
            RealEstate<span className="text-white/40">OS</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
            Management Suite
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
          Workspace
        </div>

        <nav className="space-y-1">
          {links.map(([label, href, Icon]) => {
            const active =
              href === "/real-estate"
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-white/[0.09] text-white"
                    : "text-white/45 hover:bg-white/[0.05] hover:text-white/80"
                }`}
              >
                <Icon
                  className={`h-[17px] w-[17px] ${
                    active ? "text-white" : "text-white/35"
                  }`}
                />

                <span className="flex-1">{label}</span>

                {active && (
                  <ChevronRight className="h-3.5 w-3.5 text-white/35" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
          Manage
        </div>

        <Link
          href="/real-estate/settings"
          onClick={onNavigate}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            pathname === "/real-estate/settings" ||
            pathname.startsWith("/real-estate/settings/")
              ? "bg-white/[0.09] text-white"
              : "text-white/45 hover:bg-white/[0.05] hover:text-white/80"
          }`}
        >
          <Settings className="h-[17px] w-[17px] text-white/35" />
          <span className="flex-1">Settings</span>
          {(pathname === "/real-estate/settings" ||
            pathname.startsWith("/real-estate/settings/")) && (
            <ChevronRight className="h-3.5 w-3.5 text-white/35" />
          )}
        </Link>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-xs font-medium text-white/70">
            Dashboard Demo
          </div>
          <div className="mt-1 text-[10px] leading-4 text-white/30">
            Real-estate management workspace
          </div>
        </div>
      </div>
    </>
  );
}