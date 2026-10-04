"use client";

import { useEffect, useState, type MouseEvent } from "react";
import {
  CalendarDays,
  Search,
  Plus,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  X,
  Clock,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type VisitStatus = "Scheduled" | "Completed" | "Cancelled" | "Rescheduled";
type Id = number | string;

type SiteVisit = {
  id: number;
  leadId: Id | null;
  propertyId: Id | null;
  client: string;
  email: string;
  phone: string;
  property: string;
  location: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: VisitStatus;
  notes: string;
};

type DbRow = {
  id: number;
  lead_id: Id | null;
  property_id: Id | null;
  customer_name: string | null;
  property_name: string | null;
  visit_date: string | null;
  visit_time: string | null;
  status: string | null;
  notes: string | null;
  leads: { name: string | null; phone: string | null; email: string | null } | null;
  properties: { title: string | null; location: string | null } | null;
};

type LeadOption = { id: Id; name: string };
type PropertyOption = { id: Id; title: string; location: string | null };

const STATUSES: VisitStatus[] = ["Scheduled", "Completed", "Rescheduled", "Cancelled"];

const statusStyles: Record<VisitStatus, string> = {
  Scheduled: "bg-cyan-400/10 text-cyan-300",
  Completed: "bg-emerald-400/10 text-emerald-400",
  Cancelled: "bg-red-400/10 text-red-400",
  Rescheduled: "bg-amber-400/10 text-amber-400",
};

function toStatus(s: string | null): VisitStatus {
  const v = (s ?? "").toLowerCase();
  if (v === "completed") return "Completed";
  if (v === "cancelled") return "Cancelled";
  if (v === "rescheduled") return "Rescheduled";
  return "Scheduled";
}

function mapRow(row: DbRow): SiteVisit {
  return {
    id: row.id,
    leadId: row.lead_id,
    propertyId: row.property_id,
    client: row.leads?.name ?? row.customer_name ?? "—",
    email: row.leads?.email ?? "",
    phone: row.leads?.phone ?? "",
    property: row.properties?.title ?? row.property_name ?? "—",
    location: row.properties?.location ?? "—",
    date: row.visit_date ?? "",
    time: (row.visit_time ?? "").slice(0, 5),
    status: toStatus(row.status),
    notes: row.notes ?? "",
  };
}

const emptyForm = {
  leadId: "",
  propertyId: "",
  date: "",
  time: "",
  status: "Scheduled" as VisitStatus,
  notes: "",
};

export default function SiteVisitsPage() {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [viewVisit, setViewVisit] = useState<SiteVisit | null>(null);
  const [editingVisit, setEditingVisit] = useState<SiteVisit | null>(null);

  const [menuId, setMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const [form, setForm] = useState(emptyForm);

  async function fetchVisits() {
    const { data, error } = await supabase
      .from("site_visits")
      .select("*, leads(name, phone, email), properties(title, location)")
      .order("visit_date", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setVisits((data as unknown as DbRow[]).map(mapRow));
    }
    setLoading(false);
  }

  async function fetchOptions() {
    const [l, p] = await Promise.all([
      supabase.from("leads").select("id, name").order("name"),
      supabase.from("properties").select("id, title, location").order("title"),
    ]);
    if (l.data) setLeads(l.data as LeadOption[]);
    if (p.data) setProperties(p.data as PropertyOption[]);
  }

  useEffect(() => {
    fetchVisits();
    fetchOptions();
  }, []);

  // Page scroll ya resize hone par menu band ho jaye (menu fixed position me hai)
  useEffect(() => {
    if (menuId === null) return;

    const close = () => setMenuId(null);

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuId]);

  const filteredVisits = visits.filter((visit) => {
    const query = search.toLowerCase();

    const matchesSearch =
      visit.client.toLowerCase().includes(query) ||
      visit.property.toLowerCase().includes(query) ||
      visit.location.toLowerCase().includes(query) ||
      visit.phone.toLowerCase().includes(query) ||
      visit.email.toLowerCase().includes(query);

    const matchesFilter = filter === "All" || visit.status === filter;

    return matchesSearch && matchesFilter;
  });

  const scheduledVisits = visits.filter((v) => v.status === "Scheduled").length;
  const completedVisits = visits.filter((v) => v.status === "Completed").length;
  const cancelledVisits = visits.filter((v) => v.status === "Cancelled").length;
  const upcomingVisits = visits.filter(
    (v) => v.status === "Scheduled" || v.status === "Rescheduled"
  ).length;

  function closeMenu() {
    setMenuId(null);
  }

  function toggleMenu(event: MouseEvent<HTMLButtonElement>, visitId: number) {
    event.stopPropagation();

    if (menuId === visitId) {
      closeMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    // Menu me 5 tak options ho sakte hain, isliye height thodi zyada rakhi hai
    const menuWidth = 176;
    const menuHeight = 190;

    let left = rect.right - menuWidth;
    let top = rect.bottom + 8;

    if (left < 12) left = 12;

    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }

    // Neeche jagah kam ho to menu upar ki taraf khule
    if (top + menuHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - menuHeight - 8);
    }

    setMenuPosition({ top, left });
    setMenuId(visitId);
  }

  function openAddModal() {
    closeMenu();
    setEditingVisit(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingVisit(null);
    setForm(emptyForm);
  }

  async function handleSaveVisit(e: React.FormEvent) {
    e.preventDefault();

    const lead = leads.find((l) => String(l.id) === form.leadId);
    const property = properties.find((p) => String(p.id) === form.propertyId);

    if (!lead || !property || !form.date || !form.time) return;

    const payload = {
      lead_id: lead.id,
      property_id: property.id,
      customer_name: lead.name,
      property_name: property.title,
      visit_date: form.date,
      visit_time: form.time,
      status: form.status.toLowerCase(),
      notes: form.notes,
    };

    setSaving(true);

    const { error } = editingVisit
      ? await supabase.from("site_visits").update(payload).eq("id", editingVisit.id)
      : await supabase.from("site_visits").insert([payload]);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setError(null);
    closeModal();
    fetchVisits();
  }

  function startEdit(visit: SiteVisit) {
    setEditingVisit(visit);

    setForm({
      leadId: visit.leadId !== null ? String(visit.leadId) : "",
      propertyId: visit.propertyId !== null ? String(visit.propertyId) : "",
      date: visit.date,
      time: visit.time,
      status: visit.status,
      notes: visit.notes,
    });

    setMenuId(null);
    setShowModal(true);
  }

  async function deleteVisit(id: number) {
    const visit = visits.find((item) => item.id === id);

    if (!visit) return;

    setMenuId(null);

    const confirmed = window.confirm(`Delete the site visit for ${visit.client}?`);

    if (!confirmed) return;

    const { error } = await supabase.from("site_visits").delete().eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    if (viewVisit?.id === id) {
      setViewVisit(null);
    }

    fetchVisits();
  }

  async function updateStatus(id: number, status: VisitStatus) {
    setMenuId(null);

    const { error } = await supabase
      .from("site_visits")
      .update({ status: status.toLowerCase() })
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    fetchVisits();
  }

  const menuVisit =
    menuId !== null ? visits.find((item) => item.id === menuId) ?? null : null;

  return (
    <div className="min-h-screen bg-[#07090c] text-white" onClick={() => closeMenu()}>
      <div className="mx-auto max-w-[1500px] p-5 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-cyan-400">Appointments</p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Site Visits
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Schedule and track property visits with your clients.
            </p>
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              openAddModal();
            }}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300"
          >
            <Plus size={17} />
            Schedule Visit
          </button>
        </div>

        {error && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Upcoming Visits"
            value={upcomingVisits.toString()}
            note="Scheduled & rescheduled"
          />
          <StatCard
            title="Scheduled"
            value={scheduledVisits.toString()}
            note="Confirmed visits"
          />
          <StatCard
            title="Completed"
            value={completedVisits.toString()}
            note="Successfully visited"
          />
          <StatCard
            title="Cancelled"
            value={cancelledVisits.toString()}
            note="Cancelled visits"
          />
        </div>

        {/* Toolbar */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, property or location..."
              className="w-full rounded-xl border border-white/[0.09] bg-[#0b0e12] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", ...STATUSES].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-xl border px-3 py-2 text-xs transition ${
                  filter === item
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                    : "border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0e12]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-xs text-zinc-500">
                  <th className="px-5 py-4 font-medium">Client</th>
                  <th className="px-5 py-4 font-medium">Property</th>
                  <th className="px-5 py-4 font-medium">Location</th>
                  <th className="px-5 py-4 font-medium">Date & Time</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Notes</th>
                  <th className="px-5 py-4 font-medium"></th>
                </tr>
              </thead>

              <tbody>
                {filteredVisits.map((visit) => (
                  <tr
                    key={visit.id}
                    className="border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.02]"
                  >
                    {/* Client */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-300">
                          {visit.client
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>

                        <div>
                          <p className="font-medium text-white">{visit.client}</p>

                          <a
                            href={
                              visit.phone
                                ? `tel:${visit.phone.replace(/\s/g, "")}`
                                : undefined
                            }
                            className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-300"
                          >
                            <Phone size={11} />
                            {visit.phone || "No phone"}
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Property */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-zinc-200">{visit.property}</p>

                      <a
                        href={visit.email ? `mailto:${visit.email}` : undefined}
                        className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-300"
                      >
                        <Mail size={11} />
                        {visit.email || "No email"}
                      </a>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-4">
                      <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <MapPin size={12} />
                        {visit.location}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <p className="flex items-center gap-1.5 text-sm text-zinc-300">
                        <CalendarDays size={13} />
                        {formatDate(visit.date)}
                      </p>

                      <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                        <Clock size={12} />
                        {formatTime(visit.time)}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[visit.status]}`}
                      >
                        {visit.status}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="max-w-[220px] px-5 py-4">
                      <p className="truncate text-xs text-zinc-500">
                        {visit.notes || "—"}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(event) => toggleMenu(event, visit.id)}
                        className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <p className="py-10 text-center text-sm text-zinc-500">
              Loading site visits...
            </p>
          )}

          {!loading && filteredVisits.length === 0 && (
            <div className="py-16 text-center">
              <CalendarDays className="mx-auto text-zinc-700" size={35} />

              <p className="mt-3 text-sm text-zinc-500">No site visits found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating 3-dot menu (table se bahar, taaki kat na jaye) */}
      {menuVisit && (
        <div
          className="fixed z-[100] w-44 overflow-hidden rounded-xl border border-white/10 bg-[#11151b] p-1 text-left shadow-2xl shadow-black/50"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              setViewVisit(menuVisit);
              setMenuId(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white"
          >
            <Eye size={13} />
            View Details
          </button>

          <button
            onClick={() => startEdit(menuVisit)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white"
          >
            <Pencil size={13} />
            Edit Visit
          </button>

          {menuVisit.status !== "Completed" && (
            <button
              onClick={() => updateStatus(menuVisit.id, "Completed")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10"
            >
              Mark Completed
            </button>
          )}

          {menuVisit.status !== "Cancelled" && (
            <button
              onClick={() => updateStatus(menuVisit.id, "Cancelled")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
            >
              Cancel Visit
            </button>
          )}

          <button
            onClick={() => deleteVisit(menuVisit.id)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-cyan-400">Appointments</p>

                <h2 className="mt-1 text-lg font-semibold">
                  {editingVisit ? "Edit Site Visit" : "Schedule Site Visit"}
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  {editingVisit
                    ? "Update visit details and status."
                    : "Add a new property visit."}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="mt-5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">
                    Client (Lead)
                  </label>

                  <select
                    value={form.leadId}
                    onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                    required
                    className="w-full rounded-xl border border-white/[0.09] bg-[#07090c] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50"
                  >
                    <option value="">Select lead</option>
                    {leads.map((l) => (
                      <option key={String(l.id)} value={String(l.id)}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">
                    Property
                  </label>

                  <select
                    value={form.propertyId}
                    onChange={(e) =>
                      setForm({ ...form, propertyId: e.target.value })
                    }
                    required
                    className="w-full rounded-xl border border-white/[0.09] bg-[#07090c] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50"
                  >
                    <option value="">Select property</option>
                    {properties.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <Field
                  label="Date"
                  value={form.date}
                  onChange={(v) => setForm({ ...form, date: v })}
                  type="date"
                  required
                />

                <Field
                  label="Time"
                  value={form.time}
                  onChange={(v) => setForm({ ...form, time: v })}
                  type="time"
                  required
                />

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs text-zinc-500">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as VisitStatus })
                    }
                    className="w-full rounded-xl border border-white/[0.09] bg-[#07090c] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-zinc-500">Notes</label>

                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Add any notes about this visit..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/[0.09] bg-[#07090c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingVisit
                  ? "Update Visit"
                  : "Schedule Visit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-cyan-400">Site Visit Details</p>

                <h2 className="mt-1 text-xl font-semibold">{viewVisit.client}</h2>

                <p className="mt-1 text-sm text-zinc-500">{viewVisit.property}</p>
              </div>

              <button
                onClick={() => setViewVisit(null)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Detail label="Phone" value={viewVisit.phone || "—"} />
              <Detail label="Email" value={viewVisit.email || "—"} />
              <Detail label="Location" value={viewVisit.location} />
              <Detail label="Date" value={formatDate(viewVisit.date)} />
              <Detail label="Time" value={formatTime(viewVisit.time)} />
              <Detail label="Status" value={viewVisit.status} />
            </div>

            <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[11px] text-zinc-600">Notes</p>

              <p className="mt-1 text-sm text-zinc-300">
                {viewVisit.notes || "No notes added."}
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              {viewVisit.phone && (
                <a
                  href={`tel:${viewVisit.phone.replace(/\s/g, "")}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-cyan-300"
                >
                  <Phone size={15} />
                  Call
                </a>
              )}

              {viewVisit.email && (
                <a
                  href={`mailto:${viewVisit.email}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.08]"
                >
                  <Mail size={15} />
                  Email
                </a>
              )}

              <button
                onClick={() => setViewVisit(null)}
                className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.08]"
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

function formatDate(value: string) {
  if (!value) return "—";

  const [year, month, day] = value.split("-");

  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  if (!value) return "—";

  const [hours, minutes] = value.split(":");
  const hour = Number(hours);

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minutes} ${suffix}`;
}

function StatCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-5">
      <p className="text-sm text-zinc-500">{title}</p>

      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>

      <p className="mt-1 text-xs text-zinc-600">{note}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-zinc-500">{label}</label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-white/[0.09] bg-[#07090c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50"
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] text-zinc-600">{label}</p>

      <p className="mt-1 text-sm text-zinc-200">{value}</p>
    </div>
  );
}