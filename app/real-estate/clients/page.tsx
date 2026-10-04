"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  X,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Id = number | string;
type ClientStatus = "Lead" | "Active" | "Negotiation" | "Closed";

type Client = {
  id: Id;
  name: string;
  email: string;
  phone: string;
  location: string;
  interestedIn: string;
  budget: string;
  status: ClientStatus;
  lastContact: string;
  dealsCount: number;
  visitsCount: number;
};

type LeadRow = {
  id: Id;
  created_at: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  location?: string | null;
  interested_in?: string | null;
  budget?: string | null;
};

type DealRow = {
  lead_id: Id | null;
  status: string | null;
  deal_date: string | null;
  property_name: string | null;
};

type VisitRow = {
  lead_id: Id | null;
  status: string | null;
  visit_date: string | null;
  property_name: string | null;
};

const statusStyles: Record<ClientStatus, string> = {
  Lead: "bg-cyan-400/10 text-cyan-300",
  Active: "bg-emerald-400/10 text-emerald-400",
  Negotiation: "bg-amber-400/10 text-amber-400",
  Closed: "bg-zinc-400/10 text-zinc-400",
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  location: "",
  interestedIn: "",
  budget: "",
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "—";

  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff)) return "—";

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? "s" : ""} ago`;

  return `${Math.floor(days / 30)} month${days >= 60 ? "s" : ""} ago`;
}

// Status deals aur site visits se nikalta hai:
// closed deal -> Closed, active deal -> Negotiation, visit -> Active, kuch nahi -> Lead
function buildClients(leads: LeadRow[], deals: DealRow[], visits: VisitRow[]): Client[] {
  const now = Date.now();

  return leads.map((lead) => {
    const myDeals = deals.filter((d) => String(d.lead_id) === String(lead.id));
    const myVisits = visits.filter(
      (v) => String(v.lead_id) === String(lead.id) && (v.status ?? "").toLowerCase() !== "cancelled"
    );

    const hasClosed = myDeals.some((d) => (d.status ?? "").toLowerCase() === "closed");
    const hasActive = myDeals.some((d) => (d.status ?? "").toLowerCase() === "active");

    let status: ClientStatus = "Lead";
    if (hasClosed) status = "Closed";
    else if (hasActive) status = "Negotiation";
    else if (myVisits.length > 0) status = "Active";

    // sabse latest property (deal ya visit se)
    const dated = [
      ...myDeals.map((d) => ({ date: d.deal_date, property: d.property_name })),
      ...myVisits.map((v) => ({ date: v.visit_date, property: v.property_name })),
    ]
      .filter((x) => x.date && x.property)
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());

    // last contact: abhi tak ki sabse nayi date (future visits ignore)
    const pastDates = [
      lead.created_at,
      ...myDeals.map((d) => d.deal_date),
      ...myVisits.map((v) => v.visit_date),
    ].filter((d): d is string => !!d && new Date(d).getTime() <= now);

    const lastDate = pastDates.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )[0];

    return {
      id: lead.id,
      name: lead.name ?? "—",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      location: lead.location || "—",
      interestedIn: lead.interested_in || dated[0]?.property || "—",
      budget: lead.budget || "—",
      status,
      lastContact: timeAgo(lastDate ?? null),
      dealsCount: myDeals.length,
      visitsCount: myVisits.length,
    };
  });
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [openMenu, setOpenMenu] = useState<Id | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const [form, setForm] = useState(emptyForm);

  async function fetchClients() {
    const [l, d, v] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("deals").select("lead_id, status, deal_date, property_name"),
      supabase.from("site_visits").select("lead_id, status, visit_date, property_name"),
    ]);

    const firstError = l.error ?? d.error ?? v.error;

    if (firstError) {
      setError(firstError.message);
    } else {
      setError(null);
      setClients(
        buildClients(
          (l.data ?? []) as LeadRow[],
          (d.data ?? []) as DealRow[],
          (v.data ?? []) as VisitRow[]
        )
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  // Page scroll ya resize hone par menu band ho jaye (menu fixed position me hai)
  useEffect(() => {
    if (openMenu === null) return;

    const close = () => setOpenMenu(null);

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openMenu]);

  const filteredClients = clients.filter((client) => {
    const query = search.toLowerCase();

    const matchesSearch =
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.phone.toLowerCase().includes(query) ||
      client.location.toLowerCase().includes(query) ||
      client.interestedIn.toLowerCase().includes(query);

    const matchesFilter = filter === "All" || client.status === filter;

    return matchesSearch && matchesFilter;
  });

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "Active").length;
  const leadClients = clients.filter((c) => c.status === "Lead").length;
  const closedClients = clients.filter((c) => c.status === "Closed").length;

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function closeMenu() {
    setOpenMenu(null);
  }

  function toggleMenu(event: MouseEvent<HTMLButtonElement>, clientId: Id) {
    event.stopPropagation();

    if (openMenu === clientId) {
      closeMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const menuWidth = 170;
    const menuHeight = 150;

    let left = rect.right - menuWidth;
    let top = rect.bottom + 8;

    if (left < 12) left = 12;

    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }

    if (top + menuHeight > window.innerHeight - 12) {
      top = rect.top - menuHeight - 8;
    }

    setMenuPosition({ top, left });
    setOpenMenu(clientId);
  }

  function openAddModal() {
    setEditingClient(null);
    setForm(emptyForm);
    setShowModal(true);
    setOpenMenu(null);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);

    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      location: client.location === "—" ? "" : client.location,
      interestedIn: client.interestedIn === "—" ? "" : client.interestedIn,
      budget: client.budget === "—" ? "" : client.budget,
    });

    setShowModal(true);
    setOpenMenu(null);
  }

  function openDetailsModal(client: Client) {
    setSelectedClient(client);
    setShowDetails(true);
    setOpenMenu(null);
  }

  async function handleSaveClient(e: FormEvent) {
    e.preventDefault();

    if (!form.name || !form.email || !form.phone) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim() || null,
      interested_in: form.interestedIn.trim() || null,
      budget: form.budget.trim() || null,
    };

    setSaving(true);

    const { error } = editingClient
      ? await supabase.from("leads").update(payload).eq("id", editingClient.id)
      : await supabase.from("leads").insert([payload]);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setError(null);
    setForm(emptyForm);
    setEditingClient(null);
    setShowModal(false);
    fetchClients();
  }

  async function handleDeleteClient(client: Client) {
    const confirmed = window.confirm(
      `Delete ${client.name}? Ye lead Leads page se bhi hat jayegi.`
    );

    if (!confirmed) return;

    const { error } = await supabase.from("leads").delete().eq("id", client.id);

    if (error) {
      setError(error.message);
      return;
    }

    setOpenMenu(null);

    if (selectedClient?.id === client.id) {
      setSelectedClient(null);
      setShowDetails(false);
    }

    fetchClients();
  }

  const menuClient =
    openMenu !== null ? clients.find((item) => item.id === openMenu) ?? null : null;

  return (
    <div className="min-h-screen bg-[#07090c] text-white" onClick={() => closeMenu()}>
      <div className="mx-auto max-w-[1500px] p-5 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-cyan-400">Relationships</p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Clients</h1>

            <p className="mt-2 text-sm text-zinc-500">
              Track buyers, leads and their property interests.
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
            Add Client
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
          <StatCard title="Total Clients" value={String(totalClients)} note="All time" />
          <StatCard
            title="Active Clients"
            value={String(activeClients)}
            note="Site visit done / scheduled"
          />
          <StatCard title="New Leads" value={String(leadClients)} note="No visit or deal yet" />
          <StatCard title="Deals Closed" value={String(closedClients)} note="Converted clients" />
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
              placeholder="Search clients, email or property..."
              className="w-full rounded-xl border border-white/[0.09] bg-[#0b0e12] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", "Lead", "Active", "Negotiation", "Closed"].map((item) => (
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
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-xs text-zinc-500">
                  <th className="px-5 py-4 font-medium">Client</th>
                  <th className="px-5 py-4 font-medium">Contact</th>
                  <th className="px-5 py-4 font-medium">Interested In</th>
                  <th className="px-5 py-4 font-medium">Budget</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Last Contact</th>
                  <th className="px-5 py-4 font-medium" />
                </tr>
              </thead>

              <tbody>
                {filteredClients.map((client) => (
                  <tr
                    key={String(client.id)}
                    className="border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-300">
                          {getInitials(client.name)}
                        </div>

                        <div>
                          <p className="font-medium text-white">{client.name}</p>

                          <p className="flex items-center gap-1 text-xs text-zinc-500">
                            <MapPin size={11} />
                            {client.location}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-zinc-400">
                      <a
                        href={client.email ? "mailto:" + client.email : undefined}
                        className="flex items-center gap-1.5 text-xs transition hover:text-cyan-300"
                      >
                        <Mail size={12} />
                        {client.email || "No email"}
                      </a>

                      <a
                        href={client.phone ? "tel:" + client.phone : undefined}
                        className="mt-1 flex items-center gap-1.5 text-xs transition hover:text-cyan-300"
                      >
                        <Phone size={12} />
                        {client.phone || "No phone"}
                      </a>
                    </td>

                    <td className="px-5 py-4 text-zinc-300">{client.interestedIn}</td>

                    <td className="px-5 py-4 text-zinc-300">{client.budget}</td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[client.status]}`}
                      >
                        {client.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-zinc-500">{client.lastContact}</td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(event) => toggleMenu(event, client.id)}
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
            <p className="py-10 text-center text-sm text-zinc-500">Loading clients...</p>
          )}

          {!loading && filteredClients.length === 0 && (
            <div className="py-16 text-center">
              <Users className="mx-auto text-zinc-700" size={35} />

              <p className="mt-3 text-sm text-zinc-500">No clients found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating 3-dot menu (3 dots ke neeche khulta hai, jaise Deals page me) */}
      {menuClient && (
        <div
          className="fixed z-[100] w-[170px] rounded-xl border border-white/[0.09] bg-[#11151a] p-1.5 shadow-2xl shadow-black/50"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => openDetailsModal(menuClient)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
          >
            <Eye size={14} />
            View Details
          </button>

          <button
            onClick={() => openEditModal(menuClient)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
          >
            <Pencil size={14} />
            Edit Client
          </button>

          <div className="my-1 border-t border-white/[0.06]" />

          <button
            onClick={() => handleDeleteClient(menuClient)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-400 transition hover:bg-red-400/10"
          >
            <Trash2 size={14} />
            Delete Client
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingClient ? "Edit Client" : "Add Client"}
                </h2>

                <p className="mt-1 text-xs text-zinc-600">
                  {editingClient
                    ? "Update client information."
                    : "Add a new client to your database."}
                </p>
              </div>

              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingClient(null);
                }}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="mt-5 space-y-3">
              <Field
                label="Full Name"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                placeholder="e.g. Rohit Sharma"
                required
              />

              <Field
                label="Email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
                placeholder="e.g. rohit@gmail.com"
                type="email"
                required
              />

              <Field
                label="Phone"
                value={form.phone}
                onChange={(value) => setForm({ ...form, phone: value })}
                placeholder="e.g. +91 98765 43210"
                required
              />

              <Field
                label="Location"
                value={form.location}
                onChange={(value) => setForm({ ...form, location: value })}
                placeholder="e.g. Vesu, Surat"
              />

              <Field
                label="Interested In"
                value={form.interestedIn}
                onChange={(value) => setForm({ ...form, interestedIn: value })}
                placeholder="e.g. Skyline Heights"
              />

              <Field
                label="Budget"
                value={form.budget}
                onChange={(value) => setForm({ ...form, budget: value })}
                placeholder="e.g. ₹1.2 - 1.5 Cr"
              />

              <p className="text-[11px] text-zinc-600">
                Status apne aap site visits aur deals se set hota hai.
              </p>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving ? "Saving..." : editingClient ? "Update Client" : "Save Client"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-semibold text-cyan-300">
                  {getInitials(selectedClient.name)}
                </div>

                <div>
                  <h2 className="text-lg font-semibold">{selectedClient.name}</h2>

                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[selectedClient.status]}`}
                  >
                    {selectedClient.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Email" value={selectedClient.email || "—"} />
              <DetailItem label="Phone" value={selectedClient.phone || "—"} />
              <DetailItem label="Location" value={selectedClient.location} />
              <DetailItem label="Interested In" value={selectedClient.interestedIn} />
              <DetailItem label="Budget" value={selectedClient.budget} />
              <DetailItem label="Last Contact" value={selectedClient.lastContact} />
              <DetailItem label="Site Visits" value={String(selectedClient.visitsCount)} />
              <DetailItem label="Deals" value={String(selectedClient.dealsCount)} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {selectedClient.phone && (
                <a
                  href={"tel:" + selectedClient.phone}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <Phone size={14} />
                  Call Client
                </a>
              )}

              {selectedClient.email && (
                <a
                  href={"mailto:" + selectedClient.email}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <Mail size={14} />
                  Send Email
                </a>
              )}

              <button
                onClick={() => {
                  setShowDetails(false);
                  openEditModal(selectedClient);
                }}
                className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-cyan-300"
              >
                <Pencil size={14} />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <p className="text-[11px] text-zinc-600">{label}</p>

      <p className="mt-1 text-sm text-zinc-300">{value}</p>
    </div>
  );
}