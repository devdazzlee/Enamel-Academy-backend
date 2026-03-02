"use client";

import { useEffect, useState } from "react";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Key, HelpCircle, Users, Info, Contact, FlaskConical } from "lucide-react";
import Link from "next/link";

import { userService, type ApiUser } from "@/lib/api/user";

export default function SettingsPage() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const me = await userService.me();
        if (!alive) return;
        setUser(me);
      } catch {
        if (!alive) return;
        setUser(null);
        setLoadError("Unable to load profile details right now.");
      } finally {
        if (!alive) return;
        setIsLoading(false);
      }
    };

    void run();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#e8e8e8] flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] rounded-2xl p-6 mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-white">Settings</h1>
          <div className="text-right text-white">
            {isLoading ? (
              <>
                <div className="h-5 w-32 ml-auto rounded bg-white/30 animate-pulse mb-2" />
                <div className="h-4 w-44 ml-auto rounded bg-white/20 animate-pulse" />
              </>
            ) : (
              <>
                <p className="font-semibold">{`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()}</p>
                <p className="text-sm text-white/80">{user?.email ?? ""}</p>
              </>
            )}
          </div>
        </div>
        {loadError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {loadError}
          </div>
        )}

        {/* Account Security Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            <span className="text-[#1a1a1a]">Account </span>
            <span className="text-[#8b5cf6]">Secu</span>
            <span className="text-[#d4a574]">rity</span>
          </h2>

          <div className="space-y-4">
            {/* Change Password */}
            <Link 
              href="/settings/change-password"
              className="bg-white rounded-2xl border border-border p-6 flex items-center gap-4 hover:bg-[#f8f9fa] transition-colors group"
            >
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <Key className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#1a1a1a] group-hover:text-[#8b5cf6] transition-colors">Change Password</h3>
                <p className="text-sm text-[#6b7280]">
                  Replace your current password
                </p>
              </div>
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Change Security Question */}
            <Link 
              href="/settings/security-question"
              className="bg-white rounded-2xl border border-border p-6 flex items-center gap-4 hover:bg-[#f8f9fa] transition-colors group"
            >
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#1a1a1a] group-hover:text-[#8b5cf6] transition-colors">
                  Change Security Question / Answer
                </h3>
                <p className="text-sm text-[#6b7280]">
                  Amend your security question and/or answer
                </p>
              </div>
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>

        {/* Communications Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            <span className="text-[#1a1a1a]">Communi</span>
            <span className="text-[#8b5cf6]">cat</span>
            <span className="text-[#d4a574]">ions</span>
          </h2>

          <div className="space-y-4">
            {/* Manage Permissions */}
            <Link 
              href="/settings/permissions"
              className="bg-white rounded-2xl border border-border p-6 flex items-center gap-4 hover:bg-[#f8f9fa] transition-colors group"
            >
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#1a1a1a] group-hover:text-[#8b5cf6] transition-colors">
                  Manage your Permissions
                </h3>
                <p className="text-sm text-[#6b7280]">
                  Update or Revoke access granted to your Account
                </p>
              </div>
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Help */}
            <Link 
              href="/settings/help"
              className="bg-white rounded-2xl border border-border p-6 flex items-center gap-4 hover:bg-[#f8f9fa] transition-colors group"
            >
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <Info className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#1a1a1a] group-hover:text-[#8b5cf6] transition-colors">Help</h3>
                <p className="text-sm text-[#6b7280]">Get help and support</p>
              </div>
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Contact Us */}
            <Link 
              href="/settings/contact"
              className="bg-white rounded-2xl border border-border p-6 flex items-center gap-4 hover:bg-[#f8f9fa] transition-colors group"
            >
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <Contact className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#1a1a1a] group-hover:text-[#8b5cf6] transition-colors">Contact Us</h3>
                <p className="text-sm text-[#6b7280]">Get in touch with our support team</p>
              </div>
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link 
              href="/test-api"
              className="bg-white rounded-2xl border border-border p-6 flex items-center gap-4 hover:bg-[#f8f9fa] transition-colors group"
            >
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#1a1a1a] group-hover:text-[#8b5cf6] transition-colors">Test API</h3>
                <p className="text-sm text-[#6b7280]">Run TESTApi endpoint from UI</p>
              </div>
              <div className="text-[#6b7280] group-hover:text-[#8b5cf6] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
