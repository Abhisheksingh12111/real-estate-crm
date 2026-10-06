"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  CreditCard,
  Search,
  Plus,
  MoreHorizontal,
  X,
  Building2,
  User,
  CalendarDays,
  IndianRupee,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Id = number | string;
type PaymentStatus = "Paid" | "Partial" | "Pending";
type DealStatus = "Active" | "Closed" | "Cancelled";

type Deal = {
  id: number;
  leadId: Id | null;
  propertyId: Id | null;
  client: string;
  property: string;
  value: number;
  paymentStatus: PaymentStatus;
  dealStatus: DealStatus;
  closingDate: string;
};

type DbRow = {
  id: number;
  lead_id: Id | null;
  property_id: Id | null;
  client_name: string | null;
  property_name: string | null;
  deal_value: number | null;
  status: string | null;
  payment_status: string | null;
  deal_date: string | null;
  leads: { name: string | null } | null;
  properties: { title: string | null } | null;
};

type LeadOption = { id: Id; name: string };
type PropertyOption = {
  id: Id;
  title: string;
  price: number | null;
  available_units: number | null;
  total_units: number | null;
};

type FormState = {
  leadId: string;
  propertyId: string;
  value: string;
  paymentStatus: PaymentStatus;
  dealStatus: DealStatus;
  closingDate: string;
};

const emptyForm: FormState = {
  leadId: "",
  propertyId: "",
  value: "",
  paymentStatus: "Pending",
  dealStatus: "Active",
  closingDate: "",
};

const paymentStyles: Record<PaymentStatus, string> = {
  Paid: "bg-emerald-500/15 text-emerald-300",
  Partial: "bg-amber-500/15 text-amber-300",
  Pending: "bg-red-500/15 text-red-300",
};

const dealStyles: Record<DealStatus, string> = {
  Active: "bg-blue-500/15 text-blue-300",
  Closed: "bg-emerald-500/15 text-emerald-300",
  Cancelled: "bg-red-500/15 text-red-300",
};

function toDealStatus(s: string | null): DealStatus {
  const v = (s ?? "").toLowerCase();
  if (v === "closed") return "Closed";
  if (v === "cancelled") return "Cancelled";
  return "Active";
}

function toPaymentStatus(s: string | null): PaymentStatus {
  const v = (s ?? "").toLowerCase();
  if (v === "paid") return "Paid";
  if (v === "partial") return "Partial";
  return "Pending";
}

function mapRow(row: DbRow): Deal {
  return {
    id: row.id,
    leadId: row.lead_id,
    propertyId: row.property_id,
    client: row.leads?.name ?? row.client_name ?? "—",
    property: row.properties?.title ?? row.property_name ?? "—",
    value: Number(row.deal_value ?? 0),
    paymentStatus: toPaymentStatus(row.payment_status),
    dealStatus: toDealStatus(row.status),
    closingDate: row.deal_date ?? "",
  };
}

function formatValue(value: number) {
  if (!value) return "—";
  if (value >= 10000000) return `₹${+(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${+(value / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatDisplayDate(value: string) {
  if (!value) return "Not set";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | DealStatus>("All");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetails, setShowDetails] = useState<Deal | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [menuDealId, setMenuDealId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);

  async function fetchDeals() {
    const { data, error } = await supabase
      .from("deals")
      .select("*, leads(name), properties(title)")
      .order("deal_date", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setDeals((data as unknown as DbRow[]).map(mapRow));
    }
    setLoading(false);
  }

  async function fetchOptions() {
    const [l, p] = await Promise.all([
      supabase.from("leads").select("id, name").order("name"),
      supabase
        .from("properties")
        .select("id, title, price, available_units, total_units")
        .order("title"),
    ]);
    if (l.data) setLeads(l.data as LeadOption[]);
    if (p.data) setProperties(p.data as PropertyOption[]);
  }

  useEffect(() => {
    fetchDeals();
    fetchOptions();
  }, []);

  // Overselling guard: kya is property mein abhi unit bachi hai?
  async function hasUnitsLeft(propertyId: Id | null, existing: Deal | null) {
    if (propertyId === null) return true;

    // Ye deal pehle se isi property par Closed hai, to naya unit nahi lag raha
    if (
      existing &&
      existing.dealStatus === "Closed" &&
      String(existing.propertyId) === String(propertyId)
    ) {
      return true;
    }

    const { data, error } = await supabase
      .from("properties")
      .select("available_units")
      .eq("id", propertyId)
      .single();

    if (error) {
      setError(error.message);
      return false;
    }

    return (data?.available_units ?? 0) > 0;
  }

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.client.toLowerCase().includes(search.toLowerCase()) ||
      deal.property.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "All" || deal.dealStatus === filter;

    return matchesSearch && matchesFilter;
  });

  const totalDeals = deals.length;
  const activeDeals = deals.filter((d) => d.dealStatus === "Active").length;
  const closedDeals = deals.filter((d) => d.dealStatus === "Closed").length;
  const totalDealValue = deals.reduce((total, d) => total + d.value, 0);

  function closeMenu() {
    setMenuDealId(null);
  }

  // Close 3-dot menu on outside click
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

  function toggleMenu(event: MouseEvent<HTMLButtonElement>, dealId: number) {
    event.stopPropagation();

    if (menuDealId === dealId) {
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
    setMenuDealId(dealId);
  }

  function openAddModal() {
    closeMenu();
    setForm(emptyForm);
    setShowAddModal(true);
  }

  async function saveDeal(existing: Deal | null) {
    const lead = leads.find((l) => String(l.id) === form.leadId);
    const property = properties.find((p) => String(p.id) === form.propertyId);

    if (!lead || !property || !form.value) return false;

    // Sold-out property par deal close nahi ho sakti
    if (form.dealStatus === "Closed") {
      const ok = await hasUnitsLeft(property.id, existing);

      if (!ok) {
        setError(
          `"${property.title}" ki saari units bik chuki hain, isliye ye deal close nahi ho sakti.`
        );
        return false;
      }
    }

    const payload = {
      lead_id: lead.id,
      property_id: property.id,
      client_name: lead.name,
      property_name: property.title,
      deal_value: Number(form.value),
      status: form.dealStatus.toLowerCase(),
      payment_status: form.paymentStatus.toLowerCase(),
      deal_date: form.closingDate || null,
    };

    setSaving(true);

    const { error } = existing
      ? await supabase.from("deals").update(payload).eq("id", existing.id)
      : await supabase.from("deals").insert([payload]);

    setSaving(false);

    if (error) {
      setError(error.message);
      return false;
    }

    setError(null);
    fetchDeals();
    fetchOptions();
    return true;
  }

  async function handleAddDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (await saveDeal(null)) {
      setShowAddModal(false);
      setForm(emptyForm);
    }
  }

  function openEditModal(deal: Deal) {
    closeMenu();

    setEditingDeal(deal);

    setForm({
      leadId: deal.leadId !== null ? String(deal.leadId) : "",
      propertyId: deal.propertyId !== null ? String(deal.propertyId) : "",
      value: deal.value ? String(deal.value) : "",
      paymentStatus: deal.paymentStatus,
      dealStatus: deal.dealStatus,
      closingDate: deal.closingDate,
    });

    setShowEditModal(true);
  }

  async function handleEditDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingDeal) return;

    if (await saveDeal(editingDeal)) {
      if (showDetails?.id === editingDeal.id) setShowDetails(null);
      setShowEditModal(false);
      setEditingDeal(null);
      setForm(emptyForm);
    }
  }

  async function handleDeleteDeal(deal: Deal) {
    closeMenu();

    const confirmed = window.confirm(`Delete the deal for ${deal.client}?`);

    if (!confirmed) return;

    const { error } = await supabase.from("deals").delete().eq("id", deal.id);

    if (error) {
      setError(error.message);
      return;
    }

    if (showDetails?.id === deal.id) setShowDetails(null);

    fetchDeals();
    fetchOptions();
  }

  async function cyclePaymentStatus(deal: Deal) {
    const next: Record<PaymentStatus, PaymentStatus> = {
      Pending: "Partial",
      Partial: "Paid",
      Paid: "Pending",
    };

    const updated = next[deal.paymentStatus];

    const { error } = await supabase
      .from("deals")
      .update({ payment_status: updated.toLowerCase() })
      .eq("id", deal.id);

    if (error) {
      setError(error.message);
      return;
    }

    if (showDetails?.id === deal.id) {
      setShowDetails({ ...deal, paymentStatus: updated });
    }

    fetchDeals();
  }

  async function cycleDealStatus(deal: Deal) {
    const next: Record<DealStatus, DealStatus> = {
      Active: "Closed",
      Closed: "Cancelled",
      Cancelled: "Active",
    };

    const updated = next[deal.dealStatus];

    // Closed karne se pehle check: unit bachi hai ya nahi
    if (updated === "Closed") {
      const ok = await hasUnitsLeft(deal.propertyId, deal);

      if (!ok) {
        setError(
          `"${deal.property}" ki saari units bik chuki hain, isliye ye deal close nahi ho sakti.`
        );
        return;
      }
    }

    const { error } = await supabase
      .from("deals")
      .update({ status: updated.toLowerCase() })
      .eq("id", deal.id);

    if (error) {
      setError(error.message);
      return;
    }

    if (showDetails?.id === deal.id) {
      setShowDetails({ ...deal, dealStatus: updated });
    }

    setError(null);
    fetchDeals();
    fetchOptions();
  }

  function getDealById(id: number) {
    return deals.find((deal) => deal.id === id) ?? null;
  }

  return (
    <div className="min-h-screen text-white">
      <main className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>

            <p className="mt-1 text-sm text-white/45">
              Track property deals, payments and closing status.
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
            Add Deal
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-white/45">Total Deals</span>
              <CreditCard size={18} className="text-white/40" />
            </div>

            <p className="text-2xl font-semibold">{totalDeals}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-white/45">Active Deals</span>
              <span className="h-2 w-2 rounded-full bg-blue-400" />
            </div>

            <p className="text-2xl font-semibold">{activeDeals}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-white/45">Closed Deals</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>

            <p className="text-2xl font-semibold">{closedDeals}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-white/45">Total Deal Value</span>
              <IndianRupee size={18} className="text-white/40" />
            </div>

            <p className="text-2xl font-semibold">
              {totalDealValue ? formatValue(totalDealValue) : "₹0"}
            </p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search client or property..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["All", "Active", "Closed", "Cancelled"] as const).map((item) => (
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

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-5 py-4 text-xs font-medium text-white/40">Client</th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">Property</th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">Deal Value</th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">Payment</th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">Status</th>
                  <th className="px-5 py-4 text-xs font-medium text-white/40">Closing Date</th>
                  <th className="px-5 py-4 text-right text-xs font-medium text-white/40">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-b border-white/[0.06] transition hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                          <User size={15} className="text-white/50" />
                        </div>

                        <div>
                          <p className="text-sm font-medium text-white">{deal.client}</p>
                          <p className="mt-0.5 text-xs text-white/35">Deal #{deal.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className="text-white/35" />
                        <span className="text-sm text-white/75">{deal.property}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-white">
                        {formatValue(deal.value)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => cyclePaymentStatus(deal)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition hover:opacity-80 ${paymentStyles[deal.paymentStatus]}`}
                      >
                        {deal.paymentStatus}
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => cycleDealStatus(deal)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition hover:opacity-80 ${dealStyles[deal.dealStatus]}`}
                      >
                        {deal.dealStatus}
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-white/65">
                        <CalendarDays size={15} className="text-white/35" />
                        {formatDisplayDate(deal.closingDate)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        data-menu-trigger
                        onClick={(event) => toggleMenu(event, deal.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </td>
                  </tr>
                ))}

                {loading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <p className="text-sm text-white/50">Loading deals...</p>
                    </td>
                  </tr>
                )}

                {!loading && filteredDeals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <p className="text-sm text-white/50">No deals found.</p>

                      <button
                        type="button"
                        onClick={openAddModal}
                        className="mt-3 text-xs text-white underline underline-offset-4"
                      >
                        Add a new deal
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Floating 3-dot menu */}
      {menuDealId !== null && getDealById(menuDealId) && (
        <div
          ref={menuRef}
          className="fixed z-[100] w-[170px] rounded-xl border border-white/10 bg-[#151515] p-1.5 shadow-2xl shadow-black/50"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const deal = getDealById(menuDealId);
              if (deal) setShowDetails(deal);
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
              const deal = getDealById(menuDealId);
              if (deal) openEditModal(deal);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/[0.06]"
          >
            <Pencil size={14} />
            Edit Deal
          </button>

          <button
            type="button"
            onClick={() => {
              const deal = getDealById(menuDealId);
              if (deal) handleDeleteDeal(deal);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            Delete Deal
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
                <h2 className="text-lg font-semibold">Add Deal</h2>
                <p className="mt-1 text-xs text-white/40">Create a new property deal.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <DealForm
              form={form}
              setForm={setForm}
              leads={leads}
              properties={properties}
              currentPropertyId=""
              onSubmit={handleAddDeal}
              submitLabel={saving ? "Saving..." : "Create Deal"}
              saving={saving}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingDeal && (
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
                <h2 className="text-lg font-semibold">Edit Deal</h2>
                <p className="mt-1 text-xs text-white/40">Update deal information.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <DealForm
              form={form}
              setForm={setForm}
              leads={leads}
              properties={properties}
              currentPropertyId={
                editingDeal.propertyId !== null ? String(editingDeal.propertyId) : ""
              }
              onSubmit={handleEditDeal}
              submitLabel={saving ? "Saving..." : "Save Changes"}
              saving={saving}
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
                <p className="text-xs text-white/35">Deal #{showDetails.id}</p>

                <h2 className="mt-1 text-xl font-semibold">{showDetails.client}</h2>

                <p className="mt-1 text-sm text-white/45">{showDetails.property}</p>
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
              <DetailCard icon={<User size={14} />} label="Client" value={showDetails.client} />
              <DetailCard icon={<Building2 size={14} />} label="Property" value={showDetails.property} />
              <DetailCard icon={<IndianRupee size={14} />} label="Deal Value" value={formatValue(showDetails.value)} />
              <DetailCard icon={<CreditCard size={14} />} label="Payment Status" value={showDetails.paymentStatus} />
              <DetailCard icon={<CalendarDays size={14} />} label="Closing Date" value={formatDisplayDate(showDetails.closingDate)} />
              <DetailCard icon={<CreditCard size={14} />} label="Deal Status" value={showDetails.dealStatus} />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${dealStyles[showDetails.dealStatus]}`}
              >
                {showDetails.dealStatus}
              </span>

              <button
                type="button"
                onClick={() => {
                  const currentDeal = showDetails;
                  setShowDetails(null);
                  openEditModal(currentDeal);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90"
              >
                <Pencil size={14} />
                Edit Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type DealFormProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  leads: LeadOption[];
  properties: PropertyOption[];
  currentPropertyId: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  saving: boolean;
  onCancel: () => void;
};

function DealForm({
  form,
  setForm,
  leads,
  properties,
  currentPropertyId,
  onSubmit,
  submitLabel,
  saving,
  onCancel,
}: DealFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs text-white/45">Client (Lead)</label>

        <select
          required
          value={form.leadId}
          onChange={(event) =>
            setForm((current) => ({ ...current, leadId: event.target.value }))
          }
          className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-sm text-white outline-none"
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
        <label className="mb-1.5 block text-xs text-white/45">Property</label>

        <select
          required
          value={form.propertyId}
          onChange={(event) => {
            const id = event.target.value;
            const property = properties.find((p) => String(p.id) === id);

            setForm((current) => ({
              ...current,
              propertyId: id,
              value: current.value || (property?.price ? String(property.price) : ""),
            }));
          }}
          className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-sm text-white outline-none"
        >
          <option value="">Select property</option>
          {properties.map((p) => {
            const left = p.available_units ?? 0;
            const soldOut = left <= 0;
            // Is deal ki apni property hamesha selectable rahe
            const disabled = soldOut && String(p.id) !== currentPropertyId;

            return (
              <option key={String(p.id)} value={String(p.id)} disabled={disabled}>
                {soldOut ? `${p.title} (Sold out)` : `${p.title} · ${left} left`}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-white/45">
          Deal Value (₹, number mein)
        </label>

        <input
          required
          type="number"
          min="0"
          value={form.value}
          onChange={(event) =>
            setForm((current) => ({ ...current, value: event.target.value }))
          }
          placeholder="e.g. 12500000"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/20"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs text-white/45">Payment Status</label>

          <select
            value={form.paymentStatus}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                paymentStatus: event.target.value as PaymentStatus,
              }))
            }
            className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-sm text-white outline-none"
          >
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-white/45">Deal Status</label>

          <select
            value={form.dealStatus}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                dealStatus: event.target.value as DealStatus,
              }))
            }
            className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-sm text-white outline-none"
          >
            <option value="Active">Active</option>
            <option value="Closed">Closed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-white/45">Closing Date</label>

        <input
          type="date"
          value={form.closingDate}
          onChange={(event) =>
            setForm((current) => ({ ...current, closingDate: event.target.value }))
          }
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
        />
      </div>

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
          disabled={saving}
          className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}