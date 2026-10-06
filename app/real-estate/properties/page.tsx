"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  MapPin,
  Search,
  Plus,
  MoreHorizontal,
  BedDouble,
  Maximize,
  X,
  Eye,
  Pencil,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { compressImage } from "@/lib/compressImage";

const BUCKET = "property-images";

type PropertyStatus = "Active" | "Coming Soon" | "Sold Out";
type PropertyType = "Apartment" | "Villa" | "Plots" | "Commercial";

type Property = {
  id: number;
  name: string;
  location: string;
  type: PropertyType;
  units: number;
  available: number;
  price: number;
  status: PropertyStatus;
  imagePath: string | null;
};

type DbRow = {
  id: number;
  title: string;
  location: string;
  property_type: PropertyType;
  total_units: number | null;
  available_units: number | null;
  price: number | null;
  status: string | null;
  image_path: string | null;
};

const TYPES: PropertyType[] = ["Apartment", "Villa", "Plots", "Commercial"];
// "Sold Out" automatic hai (deals se), isliye form mein nahi dikhta
const FORM_STATUSES: PropertyStatus[] = ["Active", "Coming Soon"];

const statusStyles: Record<PropertyStatus, string> = {
  Active: "bg-emerald-400/10 text-emerald-400",
  "Coming Soon": "bg-amber-400/10 text-amber-400",
  "Sold Out": "bg-zinc-400/10 text-zinc-400",
};

function toStatus(s: string | null): PropertyStatus {
  const v = (s ?? "").toLowerCase();
  if (v === "sold" || v === "sold out") return "Sold Out";
  if (v === "coming soon") return "Coming Soon";
  return "Active";
}

function mapRow(row: DbRow): Property {
  return {
    id: row.id,
    name: row.title,
    location: row.location,
    type: row.property_type,
    units: row.total_units ?? 1,
    available: row.available_units ?? 0,
    price: Number(row.price ?? 0),
    status: toStatus(row.status),
    imagePath: row.image_path ?? null,
  };
}

function getImageUrl(path: string | null) {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function getMessage(err: unknown) {
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Kuch galat ho gaya.";
}

function formatPrice(n: number) {
  if (!n) return "—";
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} Lakh`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const emptyForm = {
  name: "",
  location: "",
  type: "Apartment" as PropertyType,
  units: "",
  price: "",
  status: "Active" as PropertyStatus,
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All Properties");

  const [showModal, setShowModal] = useState(false);
  const [viewProperty, setViewProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const [menuId, setMenuId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  async function fetchProperties() {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setProperties((data as DbRow[]).map(mapRow));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProperties();
  }, []);

  const filteredProperties = properties.filter((property) => {
    const query = search.toLowerCase();

    const matchesSearch =
      property.name.toLowerCase().includes(query) ||
      property.location.toLowerCase().includes(query) ||
      property.type.toLowerCase().includes(query);

    const matchesFilter =
      filter === "All Properties" || property.type === filter;

    return matchesSearch && matchesFilter;
  });

  function resetImageState() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
  }

  function openAddModal() {
    setForm(emptyForm);
    setEditingProperty(null);
    resetImageState();
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingProperty(null);
    setForm(emptyForm);
    resetImageState();
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Sirf image file select karo.");
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  }

  function handleRemoveImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  }

  async function handleSaveProperty(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name || !form.location || !form.units) return;

    const units = Number(form.units);

    if (units < 1) {
      setError("Total units kam se kam 1 hone chahiye.");
      return;
    }

    const oldPath = editingProperty?.imagePath ?? null;
    let imagePath = oldPath;

    setSaving(true);

    try {
      // 1. Photo: compress + upload
      if (imageFile) {
        const small = await compressImage(imageFile);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, small, { contentType: "image/webp" });

        if (uploadError) throw uploadError;
        imagePath = path;
      } else if (removeImage) {
        imagePath = null;
      }

      // 2. Save row (available_units deals se auto-calculate hote hain)
      const payload = {
        title: form.name.trim(),
        location: form.location.trim(),
        property_type: form.type,
        status: form.status,
        price: Number(form.price || 0),
        total_units: units,
        image_path: imagePath,
      };

      let propertyId: number | undefined = editingProperty?.id;

      if (editingProperty) {
        const { error } = await supabase
          .from("properties")
          .update(payload)
          .eq("id", editingProperty.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("properties")
          .insert([{ ...payload, available_units: units }])
          .select("id")
          .single();
        if (error) throw error;
        propertyId = data.id;
      }

      // 3. Units dobara calculate (total_units badla ho to bhi sahi rahe)
      let recalcMessage: string | null = null;
      if (propertyId !== undefined) {
        const { error: rpcError } = await supabase.rpc("recalc_property_units", {
          pid: propertyId,
        });
        if (rpcError) recalcMessage = rpcError.message;
      }

      // 4. Purani photo storage se hatao (replace/remove hone par)
      if (oldPath && oldPath !== imagePath) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }

      closeModal();
      fetchProperties();
      setError(
        recalcMessage ? `Saved, par units recalc nahi hue: ${recalcMessage}` : null
      );
    } catch (err) {
      setError(getMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(property: Property) {
    setEditingProperty(property);
    resetImageState();

    setForm({
      name: property.name,
      location: property.location,
      type: property.type,
      units: property.units.toString(),
      price: property.price ? property.price.toString() : "",
      status: property.status === "Sold Out" ? "Active" : property.status,
    });

    setMenuId(null);
    setShowModal(true);
  }

  async function deleteProperty(id: number) {
    const property = properties.find((item) => item.id === id);

    if (!property) return;

    const confirmed = window.confirm(`Delete "${property.name}" from properties?`);

    if (!confirmed) return;

    const { error } = await supabase.from("properties").delete().eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    // Row delete hone ke baad hi photo hatao (storage API se, SQL se nahi)
    if (property.imagePath) {
      await supabase.storage.from(BUCKET).remove([property.imagePath]);
    }

    setMenuId(null);

    if (viewProperty?.id === id) {
      setViewProperty(null);
    }

    fetchProperties();
  }

  const totalUnits = properties.reduce((sum, p) => sum + p.units, 0);
  const availableUnits = properties.reduce((sum, p) => sum + p.available, 0);
  const activeProjects = properties.filter((p) => p.status === "Active").length;
  const portfolioValue = properties.reduce((sum, p) => sum + p.price * p.units, 0);

  const existingImageUrl =
    editingProperty && !removeImage ? getImageUrl(editingProperty.imagePath) : null;
  const previewSrc = imagePreview ?? existingImageUrl;

  return (
    <div className="min-h-screen bg-[#07090c] text-white">
      <div className="mx-auto max-w-[1500px] p-5 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-cyan-400">Portfolio</p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Properties
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Manage projects, units and property availability.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300"
          >
            <Plus size={17} />
            Add Property
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
            title="Total Projects"
            value={properties.length.toString()}
            note={`${activeProjects} currently active`}
          />

          <StatCard
            title="Total Units"
            value={totalUnits.toString()}
            note="Across all projects"
          />

          <StatCard
            title="Available Units"
            value={availableUnits.toString()}
            note={`${totalUnits ? ((availableUnits / totalUnits) * 100).toFixed(1) : 0}% of inventory`}
          />

          <StatCard
            title="Portfolio Value"
            value={formatPrice(portfolioValue)}
            note="Starting price × total units"
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
              placeholder="Search properties or locations..."
              className="w-full rounded-xl border border-white/[0.09] bg-[#0b0e12] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["All Properties", ...TYPES].map((item) => (
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

        {/* Property Grid */}
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProperties.map((property) => {
            const imageUrl = getImageUrl(property.imagePath);

            return (
              <div
                key={property.id}
                className="group overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0e12] transition hover:border-white/20"
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={property.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Building2 size={48} className="text-white/[0.08]" />
                    </div>
                  )}

                  <span
                    className={`absolute left-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur ${statusStyles[property.status]} ${imageUrl ? "bg-black/60" : ""}`}
                  >
                    {property.status}
                  </span>

                  {/* More Menu */}
                  <div className="absolute right-3 top-3">
                    <button
                      onClick={() =>
                        setMenuId(menuId === property.id ? null : property.id)
                      }
                      className="rounded-lg bg-black/40 p-2 text-zinc-400 backdrop-blur hover:text-white"
                    >
                      <MoreHorizontal size={17} />
                    </button>

                    {menuId === property.id && (
                      <div className="absolute right-0 top-10 z-30 w-36 overflow-hidden rounded-xl border border-white/10 bg-[#11151b] p-1 shadow-2xl">
                        <button
                          onClick={() => {
                            setViewProperty(property);
                            setMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                        >
                          <Eye size={13} />
                          View
                        </button>

                        <button
                          onClick={() => startEdit(property)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>

                        <button
                          onClick={() => deleteProperty(property.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-white">{property.name}</h2>

                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                        <MapPin size={13} />
                        {property.location}
                      </div>
                    </div>

                    <span className="rounded-lg bg-white/[0.05] px-2 py-1 text-[10px] text-zinc-400">
                      {property.type}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 border-y border-white/[0.07] py-4">
                    <PropertyInfo
                      icon={<Building2 size={14} />}
                      value={property.units.toString()}
                      label="Units"
                    />

                    <PropertyInfo
                      icon={<BedDouble size={14} />}
                      value={property.available.toString()}
                      label="Available"
                    />

                    <PropertyInfo
                      icon={<Maximize size={14} />}
                      value="1,850"
                      label="Sq.ft avg."
                    />
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-zinc-600">Starting from</p>

                      <p className="mt-1 text-lg font-semibold">
                        {formatPrice(property.price)}
                      </p>
                    </div>

                    <button
                      onClick={() => setViewProperty(property)}
                      className="rounded-lg border border-white/[0.09] px-3 py-2 text-xs text-zinc-400 transition hover:border-cyan-400/30 hover:text-cyan-300"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {loading && (
          <p className="mt-6 text-center text-sm text-zinc-500">Loading properties...</p>
        )}

        {!loading && filteredProperties.length === 0 && (
          <div className="mt-6 rounded-2xl border border-white/[0.09] bg-[#0b0e12] py-16 text-center">
            <Building2 className="mx-auto text-zinc-700" size={35} />

            <p className="mt-3 text-sm text-zinc-500">No properties found.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-cyan-400">Portfolio</p>

                <h2 className="mt-1 text-lg font-semibold">
                  {editingProperty ? "Edit Property" : "Add Property"}
                </h2>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProperty} className="mt-5 space-y-3">
              {/* Photo */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-500">
                  Property Photo
                </label>

                {previewSrc && (
                  <div className="mb-2 h-36 overflow-hidden rounded-xl border border-white/[0.09]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewSrc}
                      alt="Property preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.15] bg-[#07090c] px-3 py-3 text-xs text-zinc-400 transition hover:border-cyan-400/40 hover:text-cyan-300">
                  <ImagePlus size={15} />
                  {previewSrc ? "Photo badlo" : "Photo add karo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {previewSrc && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="mt-2 text-xs text-red-400 hover:underline"
                  >
                    Photo hata do
                  </button>
                )}
              </div>

              <Field
                label="Property Name"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                placeholder="e.g. Skyline Heights"
                required
              />

              <Field
                label="Location"
                value={form.location}
                onChange={(value) => setForm({ ...form, location: value })}
                placeholder="e.g. Vesu, Surat"
                required
              />

              <div>
                <label className="mb-1.5 block text-xs text-zinc-500">
                  Property Type
                </label>

                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as PropertyType })
                  }
                  className="w-full rounded-xl border border-white/[0.09] bg-[#07090c] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50"
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <Field
                  label="Total Units"
                  value={form.units}
                  onChange={(value) => setForm({ ...form, units: value })}
                  placeholder="48"
                  type="number"
                  required
                />

                <p className="mt-1.5 text-[11px] text-zinc-600">
                  Available units deals se apne aap update hote hain (closed
                  deal = 1 unit sold).
                </p>
              </div>

              <Field
                label="Starting Price (₹, number mein)"
                value={form.price}
                onChange={(value) => setForm({ ...form, price: value })}
                placeholder="e.g. 12500000"
                type="number"
              />

              <div>
                <label className="mb-1.5 block text-xs text-zinc-500">Status</label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as PropertyStatus })
                  }
                  className="w-full rounded-xl border border-white/[0.09] bg-[#07090c] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50"
                >
                  {FORM_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>

                <p className="mt-1.5 text-[11px] text-zinc-600">
                  Saari units bikne par status apne aap &quot;Sold Out&quot; ho jata hai.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingProperty
                  ? "Update Property"
                  : "Save Property"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-6">
            {getImageUrl(viewProperty.imagePath) && (
              <div className="mb-5 h-48 overflow-hidden rounded-xl border border-white/[0.09]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(viewProperty.imagePath) ?? ""}
                  alt={viewProperty.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-cyan-400">Property Details</p>

                <h2 className="mt-1 text-xl font-semibold">{viewProperty.name}</h2>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                  <MapPin size={13} />
                  {viewProperty.location}
                </p>
              </div>

              <button
                onClick={() => setViewProperty(null)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Detail label="Property Type" value={viewProperty.type} />
              <Detail label="Status" value={viewProperty.status} />
              <Detail label="Total Units" value={viewProperty.units.toString()} />
              <Detail label="Available" value={viewProperty.available.toString()} />
              <Detail label="Starting Price" value={formatPrice(viewProperty.price)} />
              <Detail label="Avg. Size" value="1,850 sq.ft" />
            </div>

            <button
              onClick={() => setViewProperty(null)}
              className="mt-6 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.08]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Outside click for menu */}
      {menuId && (
        <button
          aria-label="Close property menu"
          className="fixed inset-0 z-20 cursor-default"
          onClick={() => setMenuId(null)}
        />
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
        min={type === "number" ? "0" : undefined}
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

function PropertyInfo({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 text-zinc-600">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>

      <p className="mt-1 text-sm font-medium text-zinc-300">{value}</p>
    </div>
  );
}