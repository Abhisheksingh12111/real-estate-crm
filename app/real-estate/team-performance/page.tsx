"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  X,
  User,
  Phone,
  Mail,
  Eye,
  Pencil,
  Trash2,
  Users,
  Target,
  TrendingUp,
  CheckCircle2,
  CalendarCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type MemberStatus = "Active" | "Inactive";

type TeamMember = {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  monthlyTarget: number;
  leads: number;
  siteVisits: number;
  dealsClosed: number;
  revenue: number;
  monthRevenue: number;
  status: MemberStatus;
};

type AgentRow = {
  id: number;
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  monthly_target: number | string | null;
};

type FormState = {
  name: string;
  role: string;
  email: string;
  phone: string;
  monthlyTarget: string;
  status: MemberStatus;
};

const emptyForm: FormState = {
  name: "",
  role: "",
  email: "",
  phone: "",
  monthlyTarget: "0",
  status: "Active",
};

const statusStyles: Record<MemberStatus, string> = {
  Active: "bg-emerald-500/15 text-emerald-300",
  Inactive: "bg-white/[0.06] text-white/45",
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

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
        {icon}
        {label}
      </div>

      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default function TeamPerformancePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<"All" | "Active" | "Inactive">(
    "All"
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetails, setShowDetails] = useState<TeamMember | null>(null);

  const [editingMember, setEditingMember] = useState<TeamMember | null>(
    null
  );

  const [menuMemberId, setMenuMemberId] = useState<number | null>(null);

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  });
const menuRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadData = useCallback(async () => {
    const [agentsRes, leadsRes, dealsRes, visitsRes] = await Promise.all([
      supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("leads").select("agent_id"),
      supabase.from("deals").select("agent_id, deal_value, status, deal_date"),
      supabase.from("site_visits").select("agent_id"),
    ]);

    const firstError =
      agentsRes.error || leadsRes.error || dealsRes.error || visitsRes.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    const leadCount = new Map<number, number>();
    const visitCount = new Map<number, number>();
    const closedCount = new Map<number, number>();
    const revenueTotal = new Map<number, number>();
    const revenueMonth = new Map<number, number>();

    (leadsRes.data ?? []).forEach((lead) => {
      if (lead.agent_id == null) return;
      leadCount.set(lead.agent_id, (leadCount.get(lead.agent_id) ?? 0) + 1);
    });

    (visitsRes.data ?? []).forEach((visit) => {
      if (visit.agent_id == null) return;
      visitCount.set(
        visit.agent_id,
        (visitCount.get(visit.agent_id) ?? 0) + 1
      );
    });

    (dealsRes.data ?? []).forEach((deal) => {
      if (deal.agent_id == null) return;
      if (String(deal.status).toLowerCase() !== "closed") return;

      const value = Number(deal.deal_value) || 0;

      closedCount.set(deal.agent_id, (closedCount.get(deal.agent_id) ?? 0) + 1);
      revenueTotal.set(
        deal.agent_id,
        (revenueTotal.get(deal.agent_id) ?? 0) + value
      );

      if (deal.deal_date && String(deal.deal_date).startsWith(monthKey)) {
        revenueMonth.set(
          deal.agent_id,
          (revenueMonth.get(deal.agent_id) ?? 0) + value
        );
      }
    });

    const list: TeamMember[] = ((agentsRes.data ?? []) as AgentRow[]).map(
      (agent) => ({
        id: agent.id,
        name: agent.name ?? "",
        role: agent.role ?? "",
        email: agent.email ?? "",
        phone: agent.phone ?? "",
        monthlyTarget: Number(agent.monthly_target) || 0,
        leads: leadCount.get(agent.id) ?? 0,
        siteVisits: visitCount.get(agent.id) ?? 0,
        dealsClosed: closedCount.get(agent.id) ?? 0,
        revenue: revenueTotal.get(agent.id) ?? 0,
        monthRevenue: revenueMonth.get(agent.id) ?? 0,
        status:
          String(agent.status).toLowerCase() === "active"
            ? "Active"
            : "Inactive",
      })
    );

    setError("");
    setMembers(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.role.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "All" || member.status === filter;

    return matchesSearch && matchesFilter;
  });

  const totalMembers = members.length;

  const activeMembers = members.filter(
    (member) => member.status === "Active"
  ).length;

  const totalLeads = members.reduce((total, m) => total + m.leads, 0);

  const totalDealsClosed = members.reduce(
    (total, m) => total + m.dealsClosed,
    0
  );

  const totalRevenue = members.reduce((total, m) => total + m.revenue, 0);

  function resetForm() {
    setForm(emptyForm);
  }

  function closeMenu() {
    setMenuMemberId(null);
  }
useEffect(() => {
  function handleClickOutside(event: globalThis.MouseEvent) {
    const target = event.target as Node;

    if (menuRef.current?.contains(target)) return;

    if (target instanceof Element && target.closest("[data-menu-trigger]")) {
      return;
    }

    closeMenu();
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);
  function getMemberById(id: number) {
    return members.find((member) => member.id === id) ?? null;
  }

  function toggleMenu(event: MouseEvent<HTMLButtonElement>, memberId: number) {
    event.stopPropagation();

    if (menuMemberId === memberId) {
      closeMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const menuWidth = 170;
    const menuHeight = 150;

    let left = rect.right - menuWidth;
    let top = rect.bottom + 8;

    if (left < 12) {
      left = 12;
    }

    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }

    if (top + menuHeight > window.innerHeight - 12) {
      top = rect.top - menuHeight - 8;
    }

    setMenuPosition({ top, left });
    setMenuMemberId(memberId);
  }

  function openAddModal() {
    closeMenu();
    resetForm();
    setShowAddModal(true);
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.role.trim()) {
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase.from("agents").insert({
      name: form.name.trim(),
      role: form.role.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      monthly_target: Number(form.monthlyTarget) || 0,
      status: form.status.toLowerCase(),
    });

    setSaving(false);

    if (insertError) {
      alert(`Could not add team member: ${insertError.message}`);
      return;
    }

    setShowAddModal(false);
    resetForm();
    await loadData();
  }

  function openEditModal(member: TeamMember) {
    closeMenu();

    setEditingMember(member);

    setForm({
      name: member.name,
      role: member.role,
      email: member.email,
      phone: member.phone,
      monthlyTarget: String(member.monthlyTarget),
      status: member.status,
    });

    setShowEditModal(true);
  }

  async function handleEditMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingMember) {
      return;
    }

    if (!form.name.trim() || !form.role.trim()) {
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("agents")
      .update({
        name: form.name.trim(),
        role: form.role.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        monthly_target: Number(form.monthlyTarget) || 0,
        status: form.status.toLowerCase(),
      })
      .eq("id", editingMember.id);

    setSaving(false);

    if (updateError) {
      alert(`Could not save changes: ${updateError.message}`);
      return;
    }

    setShowDetails(null);
    setShowEditModal(false);
    setEditingMember(null);
    resetForm();
    await loadData();
  }

  async function handleDeleteMember(member: TeamMember) {
    closeMenu();

    const confirmed = window.confirm(
      `Delete ${member.name} from the team? Their leads, visits and deals will stay but become unassigned.`
    );

    if (!confirmed) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("agents")
      .delete()
      .eq("id", member.id);

    if (deleteError) {
      alert(`Could not delete team member: ${deleteError.message}`);
      return;
    }

    if (showDetails?.id === member.id) {
      setShowDetails(null);
    }

    await loadData();
  }

  async function toggleMemberStatus(member: TeamMember) {
    const nextStatus: MemberStatus =
      member.status === "Active" ? "Inactive" : "Active";

    const { error: updateError } = await supabase
      .from("agents")
      .update({ status: nextStatus.toLowerCase() })
      .eq("id", member.id);

    if (updateError) {
      alert(`Could not update status: ${updateError.message}`);
      return;
    }

    if (showDetails?.id === member.id) {
      setShowDetails({ ...member, status: nextStatus });
    }

    await loadData();
  }

  return (
    <div className="min-h-screen text-white">
      <main className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Team Performance
            </h1>

            <p className="mt-1 text-sm text-white/45">
              Monitor your sales team, leads and closed deals.
            </p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openAddModal();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            <Plus size={16} />
            Add Team Member
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Could not load data: {error}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Users size={18} />}
            label="Team Members"
            value={String(totalMembers)}
          />

          <StatCard
            icon={<User size={18} />}
            label="Active Members"
            value={String(activeMembers)}
          />

          <StatCard
            icon={<Target size={18} />}
            label="Total Leads"
            value={String(totalLeads)}
          />

          <StatCard
            icon={<CheckCircle2 size={18} />}
            label="Deals Closed"
            value={String(totalDealsClosed)}
          />
        </div>

        {/* Revenue + Performance */}
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Performance Overview</h2>
                <p className="mt-1 text-xs text-white/35">
                  Leads handled and deals closed by team member.
                </p>
              </div>

              <TrendingUp size={18} className="text-white/35" />
            </div>

            <div className="space-y-5">
              {filteredMembers.slice(0, 5).map((member) => {
                const maxLeads = Math.max(
                  ...members.map((item) => item.leads),
                  1
                );

                const percentage = (member.leads / maxLeads) * 100;

                return (
                  <div key={member.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-[11px] text-white/35">
                          {member.dealsClosed} deals closed
                        </p>
                      </div>

                      <span className="text-xs text-white/50">
                        {member.leads} leads
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-white transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {!loading && filteredMembers.length === 0 && (
                <p className="py-8 text-center text-sm text-white/35">
                  No team members found.
                </p>
              )}

              {loading && (
                <p className="py-8 text-center text-sm text-white/35">
                  Loading team data...
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs text-white/40">Team Revenue</p>

            <p className="mt-2 text-3xl font-semibold">
              {formatRevenue(totalRevenue)}
            </p>

            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-white/40">Average Revenue / Member</p>

              <p className="mt-1 text-lg font-semibold">
                {formatRevenue(
                  totalMembers > 0 ? totalRevenue / totalMembers : 0
                )}
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-white/40">Lead → Deal Ratio</p>

              <p className="mt-1 text-lg font-semibold">
                {totalLeads > 0
                  ? `${Math.round((totalDealsClosed / totalLeads) * 100)}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div
          className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative w-full lg:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search team member..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["All", "Active", "Inactive"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-xl border px-3 py-2 text-xs transition ${
                  filter === item
                    ? "border-white/20 bg-white text-black"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Team Table */}
        <div
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-5 py-4 text-xs font-medium text-white/40">
                    Team Member
                  </th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">
                    Contact
                  </th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">
                    Leads
                  </th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">
                    Site Visits
                  </th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">
                    Deals Closed
                  </th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">
                    Revenue
                  </th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">
                    This Month vs Target
                  </th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">
                    Status
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-medium text-white/40">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => {
                  const targetPercent =
                    member.monthlyTarget > 0
                      ? Math.min(
                          100,
                          (member.monthRevenue / member.monthlyTarget) * 100
                        )
                      : 0;

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-white/[0.06] transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                            <User size={15} className="text-white/50" />
                          </div>

                          <div>
                            <p className="text-sm font-medium">{member.name}</p>

                            <p className="mt-0.5 text-xs text-white/35">
                              {member.role}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="flex items-center gap-2 text-xs text-white/55 hover:text-white"
                            >
                              <Mail size={13} />
                              {member.email}
                            </a>
                          )}

                          {member.phone && (
                            <a
                              href={`tel:${member.phone}`}
                              className="flex items-center gap-2 text-xs text-white/35 hover:text-white"
                            >
                              <Phone size={13} />
                              {member.phone}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-white/75">
                          {member.leads}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-white/75">
                          {member.siteVisits}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-white/75">
                          {member.dealsClosed}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-medium">
                          {formatRevenue(member.revenue)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="w-44">
                          <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/45">
                            <span>{formatRevenue(member.monthRevenue)}</span>
                            <span>
                              {member.monthlyTarget > 0
                                ? formatRevenue(member.monthlyTarget)
                                : "No target"}
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-emerald-400 transition-all"
                              style={{ width: `${targetPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toggleMemberStatus(member)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition hover:opacity-80 ${statusStyles[member.status]}`}
                        >
                          {member.status}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                         data-menu-trigger
                          onClick={(event) => toggleMenu(event, member.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          <MoreHorizontal size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <p className="text-sm text-white/50">
                        No team members found.
                      </p>

                      <button
                        type="button"
                        onClick={openAddModal}
                        className="mt-3 text-xs text-white underline underline-offset-4"
                      >
                        Add a team member
                      </button>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center text-sm text-white/40"
                    >
                      Loading team data...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Floating Menu */}
      {menuMemberId !== null && getMemberById(menuMemberId) && (
        <div
          ref={menuRef}
        className="fixed z-[100] w-[170px] rounded-xl border border-white/10 bg-[#151515] p-1.5 shadow-2xl shadow-black/50"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const member = getMemberById(menuMemberId);

              if (member) {
                setShowDetails(member);
              }

              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/[0.06]"
          >
            <Eye size={14} />
            View Details
          </button>

          <button
            type="button"
            onClick={() => {
              const member = getMemberById(menuMemberId);

              if (member) {
                openEditModal(member);
              }
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/[0.06]"
          >
            <Pencil size={14} />
            Edit Member
          </button>

          <button
            type="button"
            onClick={() => {
              const member = getMemberById(menuMemberId);

              if (member) {
                handleDeleteMember(member);
              }
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            Delete Member
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Add Team Member</h2>

                <p className="mt-1 text-xs text-white/40">
                  Add a new member to your sales team.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <MemberForm
              form={form}
              setForm={setForm}
              onSubmit={handleAddMember}
              submitLabel={saving ? "Adding..." : "Add Member"}
              disabled={saving}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingMember && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Edit Team Member</h2>

                <p className="mt-1 text-xs text-white/40">
                  Update team member information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <MemberForm
              form={form}
              setForm={setForm}
              onSubmit={handleEditMember}
              submitLabel={saving ? "Saving..." : "Save Changes"}
              disabled={saving}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowDetails(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-xs text-white/35">Team Member</p>

                <h2 className="mt-1 text-xl font-semibold">
                  {showDetails.name}
                </h2>

                <p className="mt-1 text-sm text-white/45">
                  {showDetails.role}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDetails(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard
                icon={<Mail size={14} />}
                label="Email"
                value={showDetails.email || "Not provided"}
              />

              <DetailCard
                icon={<Phone size={14} />}
                label="Phone"
                value={showDetails.phone || "Not provided"}
              />

              <DetailCard
                icon={<Target size={14} />}
                label="Leads"
                value={String(showDetails.leads)}
              />

              <DetailCard
                icon={<CalendarCheck size={14} />}
                label="Site Visits"
                value={String(showDetails.siteVisits)}
              />

              <DetailCard
                icon={<CheckCircle2 size={14} />}
                label="Deals Closed"
                value={String(showDetails.dealsClosed)}
              />

              <DetailCard
                icon={<TrendingUp size={14} />}
                label="Total Revenue"
                value={formatRevenue(showDetails.revenue)}
              />

              <DetailCard
                icon={<Target size={14} />}
                label="Monthly Target"
                value={
                  showDetails.monthlyTarget > 0
                    ? formatRevenue(showDetails.monthlyTarget)
                    : "Not set"
                }
              />

              <DetailCard
                icon={<TrendingUp size={14} />}
                label="This Month Revenue"
                value={formatRevenue(showDetails.monthRevenue)}
              />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[showDetails.status]}`}
              >
                {showDetails.status}
              </span>

              <button
                type="button"
                onClick={() => {
                  const currentMember = showDetails;

                  setShowDetails(null);
                  openEditModal(currentMember);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90"
              >
                <Pencil size={14} />
                Edit Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-white/45">{label}</span>

        <span className="text-white/40">{icon}</span>
      </div>

      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

type MemberFormProps = {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  disabled?: boolean;
  onCancel: () => void;
};

function MemberForm({
  form,
  setForm,
  onSubmit,
  submitLabel,
  disabled,
  onCancel,
}: MemberFormProps) {
  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/20";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs text-white/45">Name</label>

        <input
          required
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="e.g. Rahul Sharma"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-white/45">Role</label>

        <input
          required
          value={form.role}
          onChange={(event) =>
            setForm((current) => ({ ...current, role: event.target.value }))
          }
          placeholder="e.g. Sales Executive"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs text-white/45">Email</label>

          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="name@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-white/45">Phone</label>

          <input
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: event.target.value }))
            }
            placeholder="+91 98765 43210"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs text-white/45">
            Monthly Target (₹)
          </label>

          <input
            type="number"
            min="0"
            value={form.monthlyTarget}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                monthlyTarget: event.target.value,
              }))
            }
            placeholder="e.g. 3000000"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-white/45">Status</label>

          <select
            value={form.status}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                status: event.target.value as MemberStatus,
              }))
            }
            className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-sm text-white outline-none"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <p className="text-[11px] text-white/35">
        Leads, site visits, deals and revenue are calculated automatically from
        the records assigned to this member.
      </p>

      <div className="flex justify-end gap-2 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={disabled}
          className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}