"use client";

import { useEffect, useState } from "react";
import {
  User,
  Building2,
  Bell,
  Shield,
  Palette,
  Save,
  Check,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

type SettingsTab =
  | "Profile"
  | "Company"
  | "Notifications"
  | "Security"
  | "Appearance";

type Theme = "dark" | "light";

export default function SettingsPage() {
  const [activeTab, setActiveTab] =
    useState<SettingsTab>("Profile");

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  const [showPassword, setShowPassword] =
    useState(false);

  const [theme, setTheme] = useState<Theme>("dark");

  const [settings, setSettings] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    website: "",
    address: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    emailNotifications: true,
    bookingNotifications: true,
    leadNotifications: true,
    dealNotifications: true,
    weeklyReports: false,
  });

  // Load saved theme
  useEffect(() => {
    const stored = localStorage.getItem("realestate-theme");

    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      document.documentElement.setAttribute(
        "data-dashboard-theme",
        stored
      );
    }
  }, []);

  // Load settings from Supabase
  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error(error);
        setSaveError(error.message);
      }

      if (data) {
        setSettings((prev) => ({
          ...prev,
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          company: data.company ?? "",
          website: data.website ?? "",
          address: data.address ?? "",
          emailNotifications: data.email_notifications ?? true,
          bookingNotifications: data.booking_notifications ?? true,
          leadNotifications: data.lead_notifications ?? true,
          dealNotifications: data.deal_notifications ?? true,
          weeklyReports: data.weekly_reports ?? false,
        }));
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  const tabs = [
    {
      name: "Profile" as SettingsTab,
      icon: User,
    },
    {
      name: "Company" as SettingsTab,
      icon: Building2,
    },
    {
      name: "Notifications" as SettingsTab,
      icon: Bell,
    },
    {
      name: "Security" as SettingsTab,
      icon: Shield,
    },
    {
      name: "Appearance" as SettingsTab,
      icon: Palette,
    },
  ];

  function updateSetting(
    key: keyof typeof settings,
    value: string | boolean
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    setSaved(false);
  }

  async function handleSave() {
    setSaveError("");

    const { error } = await supabase.from("settings").upsert({
      id: 1,
      name: settings.name,
      email: settings.email,
      phone: settings.phone,
      company: settings.company,
      website: settings.website,
      address: settings.address,
      email_notifications: settings.emailNotifications,
      booking_notifications: settings.bookingNotifications,
      lead_notifications: settings.leadNotifications,
      deal_notifications: settings.dealNotifications,
      weekly_reports: settings.weeklyReports,
    });

    if (error) {
      console.error(error);
      setSaveError(error.message);
      return;
    }

    window.dispatchEvent(new Event("profile-updated"));

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme);
    setSaved(false);

    document.documentElement.setAttribute(
      "data-dashboard-theme",
      newTheme
    );

    localStorage.setItem("realestate-theme", newTheme);
  }

  return (
    <div
      className={`min-h-screen ${
        theme === "light"
          ? "bg-zinc-100 text-zinc-900"
          : "bg-[#07090c] text-white"
      }`}
    >
      <div className="mx-auto max-w-[1250px] p-5 md:p-8">

        {/* Header */}
        <div>
          <p className="text-sm text-cyan-400">
            Dashboard Configuration
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Settings
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Manage your profile, company preferences and dashboard settings.
          </p>
        </div>

        {/* Layout */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[230px_1fr]">

          {/* Sidebar */}
          <div
            className={`h-fit rounded-2xl border p-2 ${
              theme === "light"
                ? "border-zinc-200 bg-white"
                : "border-white/[0.09] bg-[#0b0e12]"
            }`}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.name;

              return (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                    active
                      ? "bg-cyan-400/10 text-cyan-500"
                      : theme === "light"
                      ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                      : "text-zinc-500 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <Icon size={17} />
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div
            className={`rounded-2xl border ${
              theme === "light"
                ? "border-zinc-200 bg-white"
                : "border-white/[0.09] bg-[#0b0e12]"
            }`}
          >

            {loading && (
              <p className="px-6 pt-6 text-xs text-zinc-500">
                Loading settings...
              </p>
            )}

            {/* Profile */}
            {activeTab === "Profile" && (
              <SettingsSection
                title="Profile Settings"
                description="Manage your personal account information."
                icon={<User size={18} />}
                theme={theme}
              >
                <div className="grid gap-5 md:grid-cols-2">

                  <Field
                    label="Full Name"
                    value={settings.name}
                    onChange={(value) =>
                      updateSetting("name", value)
                    }
                    placeholder="Your name"
                    theme={theme}
                  />

                  <Field
                    label="Email Address"
                    value={settings.email}
                    onChange={(value) =>
                      updateSetting("email", value)
                    }
                    placeholder="you@example.com"
                    icon={<Mail size={14} />}
                    theme={theme}
                  />

                  <Field
                    label="Phone Number"
                    value={settings.phone}
                    onChange={(value) =>
                      updateSetting("phone", value)
                    }
                    placeholder="+91"
                    icon={<Phone size={14} />}
                    theme={theme}
                  />

                  <Field
                    label="Location"
                    value={settings.address}
                    onChange={(value) =>
                      updateSetting("address", value)
                    }
                    placeholder="City, State"
                    icon={<MapPin size={14} />}
                    theme={theme}
                  />

                </div>
              </SettingsSection>
            )}

            {/* Company */}
            {activeTab === "Company" && (
              <SettingsSection
                title="Company Settings"
                description="Manage your real-estate business information."
                icon={<Building2 size={18} />}
                theme={theme}
              >
                <div className="grid gap-5 md:grid-cols-2">

                  <Field
                    label="Company Name"
                    value={settings.company}
                    onChange={(value) =>
                      updateSetting("company", value)
                    }
                    placeholder="Company name"
                    theme={theme}
                  />

                  <Field
                    label="Website"
                    value={settings.website}
                    onChange={(value) =>
                      updateSetting("website", value)
                    }
                    placeholder="www.example.com"
                    theme={theme}
                  />

                  <div className="md:col-span-2">
                    <Field
                      label="Office Address"
                      value={settings.address}
                      onChange={(value) =>
                        updateSetting("address", value)
                      }
                      placeholder="Office address"
                      icon={<MapPin size={14} />}
                      theme={theme}
                    />
                  </div>

                </div>
              </SettingsSection>
            )}

            {/* Notifications */}
            {activeTab === "Notifications" && (
              <SettingsSection
                title="Notification Settings"
                description="Choose which notifications you want to receive."
                icon={<Bell size={18} />}
                theme={theme}
              >
                <div className="space-y-3">

                  <ToggleRow
                    title="Email Notifications"
                    description="Receive important dashboard updates by email."
                    enabled={settings.emailNotifications}
                    onChange={(value) =>
                      updateSetting(
                        "emailNotifications",
                        value
                      )
                    }
                    theme={theme}
                  />

                  <ToggleRow
                    title="Booking Notifications"
                    description="Get notified when a new booking is created."
                    enabled={settings.bookingNotifications}
                    onChange={(value) =>
                      updateSetting(
                        "bookingNotifications",
                        value
                      )
                    }
                    theme={theme}
                  />

                  <ToggleRow
                    title="Lead Notifications"
                    description="Receive alerts for new leads and enquiries."
                    enabled={settings.leadNotifications}
                    onChange={(value) =>
                      updateSetting(
                        "leadNotifications",
                        value
                      )
                    }
                    theme={theme}
                  />

                  <ToggleRow
                    title="Deal Notifications"
                    description="Get notified when deal status changes."
                    enabled={settings.dealNotifications}
                    onChange={(value) =>
                      updateSetting(
                        "dealNotifications",
                        value
                      )
                    }
                    theme={theme}
                  />

                  <ToggleRow
                    title="Weekly Reports"
                    description="Receive a weekly performance summary."
                    enabled={settings.weeklyReports}
                    onChange={(value) =>
                      updateSetting(
                        "weeklyReports",
                        value
                      )
                    }
                    theme={theme}
                  />

                </div>
              </SettingsSection>
            )}

            {/* Security */}
            {activeTab === "Security" && (
              <SettingsSection
                title="Security"
                description="Manage your account password and security."
                icon={<Shield size={18} />}
                theme={theme}
              >
                <div className="space-y-5">

                  <PasswordField
                    label="Current Password"
                    value={settings.currentPassword}
                    show={showPassword}
                    onChange={(value) =>
                      updateSetting(
                        "currentPassword",
                        value
                      )
                    }
                    onToggle={() =>
                      setShowPassword(!showPassword)
                    }
                    theme={theme}
                  />

                  <PasswordField
                    label="New Password"
                    value={settings.newPassword}
                    show={showPassword}
                    onChange={(value) =>
                      updateSetting(
                        "newPassword",
                        value
                      )
                    }
                    onToggle={() =>
                      setShowPassword(!showPassword)
                    }
                    theme={theme}
                  />

                  <PasswordField
                    label="Confirm New Password"
                    value={settings.confirmPassword}
                    show={showPassword}
                    onChange={(value) =>
                      updateSetting(
                        "confirmPassword",
                        value
                      )
                    }
                    onToggle={() =>
                      setShowPassword(!showPassword)
                    }
                    theme={theme}
                  />

                  <div
                    className={`rounded-xl border p-4 ${
                      theme === "light"
                        ? "border-zinc-200 bg-zinc-50"
                        : "border-white/[0.06] bg-white/[0.015]"
                    }`}
                  >
                    <div className="flex items-start gap-3">

                      <Lock
                        size={16}
                        className="mt-0.5 text-cyan-400"
                      />

                      <div>
                        <p
                          className={`text-sm ${
                            theme === "light"
                              ? "text-zinc-700"
                              : "text-zinc-300"
                          }`}
                        >
                          Account Security
                        </p>

                        <p
                          className={`mt-1 text-xs leading-5 ${
                            theme === "light"
                              ? "text-zinc-500"
                              : "text-zinc-600"
                          }`}
                        >
                          Keep your password secure and avoid sharing
                          your login credentials with others.
                        </p>
                      </div>

                    </div>
                  </div>

                </div>
              </SettingsSection>
            )}

            {/* Appearance */}
            {activeTab === "Appearance" && (
              <SettingsSection
                title="Appearance"
                description="Customize the look and feel of your dashboard."
                icon={<Palette size={18} />}
                theme={theme}
              >
                <div className="space-y-5">

                  <div>
                    <p
                      className={`text-sm ${
                        theme === "light"
                          ? "text-zinc-700"
                          : "text-zinc-300"
                      }`}
                    >
                      Theme
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        theme === "light"
                          ? "text-zinc-500"
                          : "text-zinc-600"
                      }`}
                    >
                      Choose your preferred dashboard theme.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">

                      <ThemeCard
                        title="Dark"
                        active={theme === "dark"}
                        onClick={() =>
                          handleThemeChange("dark")
                        }
                      />

                      <ThemeCard
                        title="Light"
                        active={theme === "light"}
                        onClick={() =>
                          handleThemeChange("light")
                        }
                      />

                    </div>
                  </div>

                  <div>
                    <p
                      className={`text-sm ${
                        theme === "light"
                          ? "text-zinc-700"
                          : "text-zinc-300"
                      }`}
                    >
                      Accent Color
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        theme === "light"
                          ? "text-zinc-500"
                          : "text-zinc-600"
                      }`}
                    >
                      Current dashboard accent color.
                    </p>

                    <div className="mt-4 flex items-center gap-3">

                      <div className="h-8 w-8 rounded-full bg-cyan-400" />

                      <span
                        className={`text-sm ${
                          theme === "light"
                            ? "text-zinc-600"
                            : "text-zinc-400"
                        }`}
                      >
                        Cyan
                      </span>

                      <span className="text-xs text-zinc-500">
                        #22D3EE
                      </span>

                    </div>
                  </div>

                </div>
              </SettingsSection>
            )}

            {/* Save */}
            <div
              className={`flex flex-wrap items-center justify-between gap-3 border-t p-5 ${
                theme === "light"
                  ? "border-zinc-200"
                  : "border-white/[0.07]"
              }`}
            >

              <div>
                {saved && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <Check size={14} />
                    Changes saved successfully
                  </div>
                )}

                {saveError && (
                  <div className="text-xs text-rose-400">
                    Error: {saveError}
                  </div>
                )}
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300"
              >
                <Save size={16} />
                Save Changes
              </button>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  icon,
  children,
  theme,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  theme: Theme;
}) {
  return (
    <div className="p-5 md:p-6">

      <div
        className={`flex items-start gap-3 border-b pb-5 ${
          theme === "light"
            ? "border-zinc-200"
            : "border-white/[0.07]"
        }`}
      >

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
          {icon}
        </div>

        <div>
          <h2 className="font-semibold">
            {title}
          </h2>

          <p
            className={`mt-1 text-xs ${
              theme === "light"
                ? "text-zinc-500"
                : "text-zinc-600"
            }`}
          >
            {description}
          </p>
        </div>

      </div>

      <div className="pt-6">
        {children}
      </div>

    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  theme,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  theme: Theme;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-zinc-500">
        {label}
      </label>

      <div className="relative">

        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            {icon}
          </div>
        )}

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border py-2.5 text-sm outline-none placeholder:text-zinc-500 focus:border-cyan-400/50 ${
            theme === "light"
              ? "border-zinc-200 bg-zinc-50 text-zinc-900"
              : "border-white/[0.09] bg-[#07090c] text-white"
          } ${
            icon ? "pl-9 pr-3" : "px-3"
          }`}
        />

      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  show,
  onChange,
  onToggle,
  theme,
}: {
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  theme: Theme;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-zinc-500">
        {label}
      </label>

      <div className="relative">

        <Lock
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className={`w-full rounded-xl border py-2.5 pl-9 pr-10 text-sm outline-none placeholder:text-zinc-500 focus:border-cyan-400/50 ${
            theme === "light"
              ? "border-zinc-200 bg-zinc-50 text-zinc-900"
              : "border-white/[0.09] bg-[#07090c] text-white"
          }`}
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
        >
          {show ? (
            <EyeOff size={15} />
          ) : (
            <Eye size={15} />
          )}
        </button>

      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
  theme,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  theme: Theme;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
        theme === "light"
          ? "border-zinc-200 bg-zinc-50"
          : "border-white/[0.06] bg-white/[0.015]"
      }`}
    >

      <div>
        <p
          className={`text-sm ${
            theme === "light"
              ? "text-zinc-700"
              : "text-zinc-300"
          }`}
        >
          {title}
        </p>

        <p
          className={`mt-1 text-xs leading-5 ${
            theme === "light"
              ? "text-zinc-500"
              : "text-zinc-600"
          }`}
        >
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled
            ? "bg-cyan-400"
            : "bg-zinc-800"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>

    </div>
  );
}

function ThemeCard({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-cyan-400/40 bg-cyan-400/[0.05]"
          : "border-white/[0.08] bg-white/[0.015] hover:border-white/[0.15]"
      }`}
    >
      <div
        className={`h-16 rounded-lg border ${
          title === "Dark"
            ? "border-white/[0.12] bg-[#07090c]"
            : "border-zinc-300 bg-zinc-200"
        }`}
      />

      <div className="mt-3 flex items-center justify-between">

        <span
          className={`text-sm ${
            active
              ? "text-cyan-400"
              : "text-zinc-400"
          }`}
        >
          {title}
        </span>

        {active && (
          <Check
            size={15}
            className="text-cyan-400"
          />
        )}

      </div>
    </button>
  );
}