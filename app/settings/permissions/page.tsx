'use client';
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { rolesService, type DentalRole, type Permission } from "@/lib/api/roles";

type ToggleRow = {
  id: string;
  title: string;
  desc: string;
  defaultOn: boolean;
};

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function Toggle({
  checked,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={classNames(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-[#7C3AED]" : "bg-gray-200",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <span
        className={classNames(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}

function IconChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 22s8-4 8-10V6l-8-4-8 4v6c0 6 8 10 8 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 6h16v12H4V6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M4 7l8 6 8-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 11h12v10H6V11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ManagePermissionsPage() {
  const [roles, setRoles] = useState<DentalRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const emailRows: ToggleRow[] = useMemo(
    () => [
      {
        id: "email_notifications",
        title: "Email Notifications",
        desc: "Receive email notifications about account activity",
        defaultOn: true,
      },
      {
        id: "course_updates",
        title: "Course Updates",
        desc: "Get notified when new courses are added or courses are updated",
        defaultOn: true,
      },
      {
        id: "pdp_reminders",
        title: "PDP Reminders",
        desc: "Receive reminders about your PDP goals and deadlines",
        defaultOn: true,
      },
      {
        id: "marketing_emails",
        title: "Marketing Emails",
        desc: "Receive promotional offers and educational content",
        defaultOn: false,
      },
      {
        id: "cpd_certificates",
        title: "CPD Certificates",
        desc: "Get notified when CPD certificates are ready to download",
        defaultOn: true,
      },
      {
        id: "progress_reports",
        title: "Progress Reports",
        desc: "Receive monthly progress reports on your learning journey",
        defaultOn: true,
      },
    ],
    []
  );

  const privacyRows: ToggleRow[] = useMemo(
    () => [
      {
        id: "third_party_sharing",
        title: "Third-Party Data Sharing",
        desc: "Allow sharing of anonymized data with educational partners",
        defaultOn: false,
      },
      {
        id: "analytics_tracking",
        title: "Analytics Tracking",
        desc: "Help us improve by allowing analytics tracking of your platform usage",
        defaultOn: true,
      },
      {
        id: "personalization",
        title: "Personalization",
        desc: "Use your data to personalize course recommendations and content",
        defaultOn: true,
      },
    ],
    []
  );

  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    [...emailRows, ...privacyRows].forEach((r) => (init[r.id] = r.defaultOn));
    return init;
  });

  function setToggle(id: string, next: boolean) {
    setToggles((p) => ({ ...p, [id]: next }));
  }

  function handleSavePreferences() {
    try {
      localStorage.setItem("user_preferences", JSON.stringify(toggles));
      setSaveMessage("Preferences saved successfully.");
    } catch {
      setSaveMessage("Failed to save preferences.");
    }
    setTimeout(() => setSaveMessage(""), 3000);
  }

  function handleCancelPreferences() {
    const init: Record<string, boolean> = {};
    [...emailRows, ...privacyRows].forEach((r) => (init[r.id] = r.defaultOn));
    setToggles(init);
    setSaveMessage("");
  }

  // Fetch available roles from API
  React.useEffect(() => {
    let alive = true;
    const run = async () => {
      setRolesLoading(true);
      try {
        const fetchedRoles = await rolesService.roles();
        if (!alive) return;
        setRoles(fetchedRoles);
        if (fetchedRoles.length > 0) {
          setSelectedRole(String(fetchedRoles[0].slug ?? fetchedRoles[0].id));
        }
      } catch {
        if (!alive) return;
      } finally {
        if (alive) setRolesLoading(false);
      }
    };
    void run();
    return () => { alive = false; };
  }, []);

  // Fetch permissions for selected role
  React.useEffect(() => {
    if (!selectedRole) return;
    let alive = true;
    const run = async () => {
      setPermissionsLoading(true);
      setPermissionsError("");
      try {
        const perms = await rolesService.permissions(selectedRole);
        if (!alive) return;
        setRolePermissions(perms);
      } catch {
        if (!alive) return;
        setRolePermissions([]);
        setPermissionsError("Unable to load permissions for this role.");
      } finally {
        if (alive) setPermissionsLoading(false);
      }
    };
    void run();
    return () => { alive = false; };
  }, [selectedRole]);

  return (
    <div className="min-h-screen bg-[#e8e8e8] font-sans text-[#1a1a1a] flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <div className="mx-auto max-w-[860px] px-4 sm:px-6 py-4 sm:py-6">
          {/* Header */}
          <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
            <IconChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Settings</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-purple-100 flex-shrink-0">
              <IconShield className="h-5 w-5 sm:h-6 sm:w-6 text-[#8b5cf6]" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#1a1a1a]">
                Manage Your Permissions
              </h1>
              <p className="mt-1 text-sm text-[#6b7280]">
                Control how we use and share your information
              </p>
            </div>
          </div>

          {/* Card: Email Communications */}
          <div className="mt-6 sm:mt-7 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
            <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-50 flex-shrink-0">
                <IconMail className="h-4 w-4 sm:h-5 sm:w-5 text-[#8b5cf6]" />
              </div>
              <div className="font-semibold text-[#1a1a1a] text-sm sm:text-base">Email Communications</div>
            </div>

            <div className="divide-y divide-[#e5e7eb]">
              {emailRows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-4 sm:py-5"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-sm font-medium text-[#1a1a1a] leading-tight">
                      {r.title}
                    </div>
                    <div className="mt-1 text-sm text-[#6b7280] leading-relaxed">{r.desc}</div>
                  </div>
                  <div className="flex-shrink-0 pt-1">
                    <Toggle
                      checked={!!toggles[r.id]}
                      onChange={(n) => setToggle(r.id, n)}
                      aria-label={r.title}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Data & Privacy */}
          <div className="mt-4 sm:mt-6 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
            <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-50 flex-shrink-0">
                <IconShield className="h-4 w-4 sm:h-5 sm:w-5 text-[#8b5cf6]" />
              </div>
              <div className="font-semibold text-[#1a1a1a] text-sm sm:text-base">Data &amp; Privacy</div>
            </div>

            <div className="divide-y divide-[#e5e7eb]">
              {privacyRows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-4 sm:py-5"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-sm font-medium text-[#1a1a1a] leading-tight">
                      {r.title}
                    </div>
                    <div className="mt-1 text-sm text-[#6b7280] leading-relaxed">{r.desc}</div>
                  </div>
                  <div className="flex-shrink-0 pt-1">
                    <Toggle
                      checked={!!toggles[r.id]}
                      onChange={(n) => setToggle(r.id, n)}
                      aria-label={r.title}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 sm:mt-6 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
            <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 sm:px-6 py-3 sm:py-4">
              <div className="font-semibold text-[#1a1a1a] text-sm sm:text-base">Role Permissions</div>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <label htmlFor="role-picker" className="mb-2 block text-sm text-[#6b7280]">
                Select role
              </label>
              <select
                id="role-picker"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={rolesLoading}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/30 disabled:opacity-60"
              >
                {rolesLoading && <option value="">Loading roles...</option>}
                {!rolesLoading && roles.length === 0 && <option value="">No roles available</option>}
                {roles.map((role) => {
                  const value = String(role.slug ?? role.id);
                  return (
                    <option key={value} value={value}>
                      {role.name}
                    </option>
                  );
                })}
              </select>
              {permissionsLoading && <p className="mt-3 text-sm text-[#6b7280]">Loading permissions...</p>}
              {permissionsError && <p className="mt-3 text-sm text-red-600">{permissionsError}</p>}
              {!permissionsLoading && !permissionsError && (
                <div className="mt-3 space-y-2">
                  {rolePermissions.length === 0 && <p className="text-sm text-[#6b7280]">No permissions returned.</p>}
                  {rolePermissions.map((perm) => (
                    <div key={`${perm.id}-${perm.name}`} className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-sm">
                      <span className="font-medium text-[#1a1a1a]">{perm.name}</span>
                      {(perm.resource || perm.action) && (
                        <span className="ml-2 text-[#6b7280]">
                          ({perm.resource || "resource"}:{perm.action || "action"})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleSavePreferences}
              className="w-full sm:flex-1 rounded-xl bg-[#8b5cf6] px-4 sm:px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#7c3aed] active:bg-[#6d28d9] transition-colors"
            >
              Save Preferences
            </button>
            <button
              type="button"
              onClick={handleCancelPreferences}
              className="w-full sm:w-[120px] rounded-xl border border-[#e5e7eb] bg-white px-4 sm:px-6 py-3 text-sm font-medium text-[#1a1a1a] hover:bg-[#f9fafb] transition-colors"
            >
              Cancel
            </button>
          </div>
          {saveMessage && (
            <p className={`mt-2 text-sm ${saveMessage.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
              {saveMessage}
            </p>
          )}

          {/* Privacy Notice */}
          <div className="mt-4 sm:mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex items-start gap-3">
              <div className="mt-[2px] flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white/60 flex-shrink-0">
                <IconLock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-blue-900">
                  Your Privacy Matters
                </div>
                <p className="mt-2 text-sm leading-5 text-blue-800">
                  We respect your privacy and are committed to protecting your
                  personal data. You can change these permissions at any time.
                </p>
                <p className="mt-3 text-sm leading-5 text-blue-800">
                  For more information about how we handle your data, please
                  review our{" "}
                  <a
                    href="#"
                    className="font-medium text-blue-800 underline underline-offset-2"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
