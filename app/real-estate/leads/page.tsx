"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MoreHorizontal,
  X,
  IndianRupee,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase"; // <-- apna sahi path

type Stage = "New Lead" | "Qualified" | "Site Visit" | "Converted";

type Lead = {
  id: number;
  name: string;
  phone: string;
  email: string;
  property: string;
  value: string;
  stage: Stage;
  source: string;
};

const stages: Stage[] = ["New Lead", "Qualified", "Site Visit", "Converted"];

// UI stage <-> Supabase `status` column
const stageToStatus: Record<Stage, string> = {
  "New Lead": "new",
  Qualified: "contacted",
  "Site Visit": "site_visit",
  Converted: "converted",
};

const statusToStage: Record<string, Stage> = {
  new: "New Lead",
  contacted: "Qualified",
  site_visit: "Site Visit",
  converted: "Converted",
};

const stageStyles: Record<Stage, { dot: string; bar: string }> = {
  "New Lead": { dot: "bg-cyan-400", bar: "bg-cyan-400" },
  Qualified: { dot: "bg-emerald-400", bar: "bg-emerald-400" },
  "Site Visit": { dot: "bg-amber-400", bar: "bg-amber-400" },
  Converted: { dot: "bg-violet-400", bar: "bg-violet-400" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLead(row: any): Lead {
  return {
    id: row.id,
    name: row.name ?? "—",
    phone: row.phone ?? "—",
    email: row.email ?? "—",
    property: row.property_interest ?? "—",
    value: row.value ?? "—",
    stage: statusToStage[row.status] ?? "New Lead",
    source: row.source ?? "Direct",
  };
}

export default function LeadPipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [menuLeadId, setMenuLeadId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    property: "",
    value: "",
    source: "",
  });

  useEffect(() => {
    async function loadLeads() {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("LOAD ERROR:", error);
        setErrorMsg(error.message);
      } else {
        setLeads((data ?? []).map(rowToLead));
      }
      setLoading(false);
    }
    loadLeads();
  }, []);

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.property.toLowerCase().includes(search.toLowerCase())
  );

  function leadsByStage(stage: Stage) {
    return filteredLeads.filter((l) => l.stage === stage);
  }

  function closeMenu() {
    setMenuLeadId(null);
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

  function toggleMenu(
    event: React.MouseEvent<HTMLButtonElement>,
    leadId: number
  ) {
    event.stopPropagation();

    if (menuLeadId === leadId) {
      closeMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 170;
    const menuHeight = 130;

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
    setMenuLeadId(leadId);
  }

  function deleteLead(id: number) {
    closeMenu();
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;

    const ok = window.confirm(`Delete lead "${lead.name}"?`);
    if (!ok) return;

    setLeads((prev) => prev.filter((l) => l.id !== id));

    supabase
      .from("leads")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("DELETE ERROR:", error);
          setErrorMsg(error.message);
        }
      });
  }

  async function moveLead(id: number, stage: Stage) {
    const previous = leads;
    // UI turant update
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));

    const { error } = await supabase
      .from("leads")
      .update({ status: stageToStatus[stage] })
      .eq("id", id);

    if (error) {
      console.error("UPDATE ERROR:", error);
      setErrorMsg(error.message);
      setLeads(previous); // fail hua to wapas purani state
    }
  }

  function handleDrop(stage: Stage) {
    if (draggedId === null) return;
    moveLead(draggedId, stage);
    setDraggedId(null);
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return;

    const { data, error } = await supabase
      .from("leads")
      .insert({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        property_interest: form.property || null,
        value: form.value || null,
        source: form.source || null,
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("INSERT ERROR:", error);
      setErrorMsg(error.message);
      return;
    }

    setLeads((prev) => [rowToLead(data), ...prev]);
    setForm({ name: "", phone: "", email: "", property: "", value: "", source: "" });
    setShowModal(false);
  }

  return (
    <div className="min-h-screen bg-[#07090c] text-white">
      <div className="mx-auto max-w-[1600px] p-5 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-cyan-400">Sales</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Lead Pipeline
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Drag leads across stages as they move through your funnel.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300"
          >
            <Plus size={17} />
            Add Lead
          </button>
        </div>

        {errorMsg && (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>Supabase error: {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => (
            <div
              key={stage}
              className="rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-5"
            >
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className={`h-2 w-2 rounded-full ${stageStyles[stage].dot}`} />
                {stage}
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight">
                {leadsByStage(stage).length}
              </p>
              <p className="mt-1 text-xs text-zinc-600">leads in this stage</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mt-7">
          <div className="relative w-full max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads or properties..."
              className="w-full rounded-xl border border-white/[0.09] bg-[#0b0e12] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50"
            />
          </div>
        </div>

        {loading && <p className="mt-6 text-sm text-zinc-500">Loading leads...</p>}

        {/* Kanban board */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage)}
              className="rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-4"
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stageStyles[stage].dot}`} />
                  <h3 className="text-sm font-semibold">{stage}</h3>
                </div>
                <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-zinc-400">
                  {leadsByStage(stage).length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {leadsByStage(stage).map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedId(lead.id)}
                    className="cursor-grab rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 transition hover:border-white/20 active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-[11px] font-semibold text-cyan-300">
                          {lead.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{lead.name}</p>
                          <p className="text-[11px] text-zinc-500">{lead.source}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        data-menu-trigger
                        onClick={(e) => toggleMenu(e, lead.id)}
                        className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-zinc-400">{lead.property}</p>

                    <div className="mt-2 flex items-center gap-1 text-xs font-medium text-zinc-300">
                      <IndianRupee size={11} />
                      {lead.value.replace("₹", "")}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                      <div className="flex gap-2">
                        <button className="rounded-lg bg-white/[0.05] p-1.5 text-zinc-400 hover:text-cyan-300">
                          <Phone size={12} />
                        </button>
                        <button className="rounded-lg bg-white/[0.05] p-1.5 text-zinc-400 hover:text-cyan-300">
                          <Mail size={12} />
                        </button>
                      </div>

                      {stage !== "Converted" && (
                        <button
                          onClick={() =>
                            moveLead(lead.id, stages[stages.indexOf(stage) + 1])
                          }
                          className="flex items-center gap-0.5 text-[11px] text-cyan-300 hover:text-cyan-200"
                        >
                          Move
                          <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {!loading && leadsByStage(stage).length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/[0.08] py-8 text-center text-xs text-zinc-600">
                    No leads here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating 3-dot menu */}
      {menuLeadId !== null && (
        <div
          ref={menuRef}
          className="fixed z-[100] w-[170px] rounded-xl border border-white/10 bg-[#151515] p-1.5 shadow-2xl shadow-black/50"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const lead = leads.find((l) => l.id === menuLeadId);
              if (lead) {
                alert(
                  `${lead.name}\n${lead.phone}\n${lead.email}\n${lead.property}\n${lead.value}`
                );
              }
              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white transition hover:bg-white/[0.06]"
          >
            <Eye size={14} />
            View Details
          </button>

          <button
            type="button"
            onClick={() => {
              alert("Edit feature coming soon!");
              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white transition hover:bg-white/[0.06]"
          >
            <Pencil size={14} />
            Edit Lead
          </button>

          <button
            type="button"
            onClick={() => {
              if (menuLeadId !== null) deleteLead(menuLeadId);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            Delete Lead
          </button>
        </div>
      )}

      {/* Add Lead Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Lead</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="mt-5 space-y-3">
              <Field
                label="Full Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="e.g. Aditya Kapoor"
                required
              />
              <Field
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="e.g. +91 98765 43210"
                required
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="e.g. aditya@gmail.com"
                type="email"
              />
              <Field
                label="Interested Property"
                value={form.property}
                onChange={(v) => setForm({ ...form, property: v })}
                placeholder="e.g. Skyline Heights"
              />
              <Field
                label="Estimated Value"
                value={form.value}
                onChange={(v) => setForm({ ...form, value: v })}
                placeholder="e.g. ₹1.3 Cr"
              />
              <Field
                label="Source"
                value={form.source}
                onChange={(v) => setForm({ ...form, source: v })}
                placeholder="e.g. Website, Referral, Walk-in"
              />

              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300"
              >
                Save Lead
              </button>
            </form>
          </div>
        </div>
      )}
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
  onChange: (v: string) => void;
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