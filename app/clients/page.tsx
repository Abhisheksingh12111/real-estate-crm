"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  X,
} from "lucide-react";

type Client = {
  name: string;
  email: string;
  phone: string;
  location: string;
  interestedIn: string;
  budget: string;
  status: "Lead" | "Active" | "Negotiation" | "Closed";
  lastContact: string;
};

const initialClients: Client[] = [
  {
    name: "Rohit Sharma",
    email: "rohit.sharma@gmail.com",
    phone: "+91 98765 43210",
    location: "Bandra West, Mumbai",
    interestedIn: "Skyline Heights",
    budget: "₹1.2 - 1.5 Cr",
    status: "Negotiation",
    lastContact: "2 days ago",
  },
  {
    name: "Ananya Iyer",
    email: "ananya.iyer@gmail.com",
    phone: "+91 98211 34567",
    location: "Whitefield, Bengaluru",
    interestedIn: "The Grand Residences",
    budget: "₹80 - 90 Lakh",
    status: "Active",
    lastContact: "5 hours ago",
  },
  {
    name: "Karan Mehta",
    email: "karan.mehta@outlook.com",
    phone: "+91 90040 22110",
    location: "Sarjapur Road, Bengaluru",
    interestedIn: "Cedar County",
    budget: "₹1.9 - 2.1 Cr",
    status: "Closed",
    lastContact: "1 week ago",
  },
  {
    name: "Priya Nair",
    email: "priya.nair@yahoo.com",
    phone: "+91 99870 65432",
    location: "Powai, Mumbai",
    interestedIn: "Lakeview Enclave",
    budget: "₹60 - 65 Lakh",
    status: "Lead",
    lastContact: "3 days ago",
  },
  {
    name: "Vikram Desai",
    email: "vikram.desai@gmail.com",
    phone: "+91 91234 56789",
    location: "Golf Course Road, Gurgaon",
    interestedIn: "The Meridian",
    budget: "₹1.6 - 1.8 Cr",
    status: "Active",
    lastContact: "Yesterday",
  },
  {
    name: "Sneha Reddy",
    email: "sneha.reddy@gmail.com",
    phone: "+91 98450 11223",
    location: "Whitefield, Bengaluru",
    interestedIn: "Palm Grove Villas",
    budget: "₹2.0 - 2.3 Cr",
    status: "Lead",
    lastContact: "4 days ago",
  },
];

const statusStyles: Record<Client["status"], string> = {
  Lead: "bg-cyan-400/10 text-cyan-300",
  Active: "bg-emerald-400/10 text-emerald-400",
  Negotiation: "bg-amber-400/10 text-amber-400",
  Closed: "bg-zinc-400/10 text-zinc-400",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    interestedIn: "",
    budget: "",
  });

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase()) ||
      client.interestedIn.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "All" || client.status === filter;

    return matchesSearch && matchesFilter;
  });

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "Active").length;
  const closedClients = clients.filter((c) => c.status === "Closed").length;
  const leadClients = clients.filter((c) => c.status === "Lead").length;

  function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;

    setClients((prev) => [
      {
        name: form.name,
        email: form.email,
        phone: form.phone,
        location: form.location || "—",
        interestedIn: form.interestedIn || "—",
        budget: form.budget || "—",
        status: "Lead",
        lastContact: "Just now",
      },
      ...prev,
    ]);

    setForm({
      name: "",
      email: "",
      phone: "",
      location: "",
      interestedIn: "",
      budget: "",
    });
    setShowModal(false);
  }

  return (
    <div className="min-h-screen bg-[#07090c] text-white">
      <div className="mx-auto max-w-[1500px] p-5 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-cyan-400">Relationships</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Clients
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Track buyers, leads and their property interests.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300"
          >
            <Plus size={17} />
            Add Client
          </button>
        </div>

        {/* Stats */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Clients" value={totalClients.toString()} note="All time" />
          <StatCard title="Active Clients" value={activeClients.toString()} note="Currently engaged" />
          <StatCard title="New Leads" value={leadClients.toString()} note="Not yet contacted fully" />
          <StatCard title="Deals Closed" value={closedClients.toString()} note="Converted clients" />
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

        {/* Clients Table */}
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
                  <th className="px-5 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, idx) => (
                  <tr
                    key={client.email + idx}
                    className="border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-300">
                          {client.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
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
                      <p className="flex items-center gap-1.5 text-xs">
                        <Mail size={12} />
                        {client.email}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs">
                        <Phone size={12} />
                        {client.phone}
                      </p>
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
                      <button className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.05] hover:text-white">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClients.length === 0 && (
            <div className="py-16 text-center">
              <Users className="mx-auto text-zinc-700" size={35} />
              <p className="mt-3 text-sm text-zinc-500">No clients found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Client</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="mt-5 space-y-3">
              <Field
                label="Full Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="e.g. Rohit Sharma"
                required
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="e.g. rohit@gmail.com"
                type="email"
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
                label="Location"
                value={form.location}
                onChange={(v) => setForm({ ...form, location: v })}
                placeholder="e.g. Bandra West, Mumbai"
              />
              <Field
                label="Interested In"
                value={form.interestedIn}
                onChange={(v) => setForm({ ...form, interestedIn: v })}
                placeholder="e.g. Skyline Heights"
              />
              <Field
                label="Budget"
                value={form.budget}
                onChange={(v) => setForm({ ...form, budget: v })}
                placeholder="e.g. ₹1.2 - 1.5 Cr"
              />

              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300"
              >
                Save Client
              </button>
            </form>
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