"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import { userService } from "@/lib/api/user";

export default function ProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setIsLoading(true);
      try {
        const me = await userService.me();
        if (!alive) return;
        setUserData(me);
        setTitle(me.title ?? "");
        setFirstName(me.firstName ?? "");
        setLastName(me.lastName ?? "");
      } catch {
        if (!alive) return;
        setError("Failed to load profile.");
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

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    setIsSaving(true);
    try {
      const updated = await userService.update({
        firstName: firstName,
        lastName: lastName,
      });
      // Preserve fields that might not be returned in update response
      setUserData({
        ...updated,
        username: userData?.username,
        email: userData?.email,
        display_name: userData?.display_name,
        role: userData?.role,
        role_display: userData?.role_display,
        dental_fields: userData?.dental_fields,
        registered_date: userData?.registered_date,
      });
      setFirstName(updated.firstName ?? firstName);
      setLastName(updated.lastName ?? lastName);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch {
      setError("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#e8e8e8] flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-6xl mx-auto px-6 py-8">
          {/* Header Skeleton */}
          <div className="bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] rounded-2xl p-6 mb-8">
            <div className="h-8 bg-white/30 rounded w-48 animate-pulse"></div>
          </div>

          {/* Name Fields Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-6 bg-gray-300 rounded mb-2 w-20 animate-pulse"></div>
                <div className="h-12 bg-white rounded-xl animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Email Field Skeleton */}
          <div className="mb-8">
            <div className="h-6 bg-gray-300 rounded mb-2 w-24 animate-pulse"></div>
            <div className="h-12 bg-white rounded-xl animate-pulse"></div>
          </div>

          {/* Role Field Skeleton */}
          <div className="mb-8">
            <div className="h-6 bg-gray-300 rounded mb-2 w-16 animate-pulse"></div>
            <div className="h-12 bg-white rounded-xl animate-pulse"></div>
          </div>

          {/* Registered Date Skeleton */}
          <div className="mb-8">
            <div className="h-6 bg-gray-300 rounded mb-2 w-32 animate-pulse"></div>
            <div className="h-12 bg-white rounded-xl animate-pulse"></div>
          </div>

          {/* Bottom Section Skeleton */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            {/* Membership Card Skeleton */}
            <div className="bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] rounded-2xl p-6 w-full md:w-96">
              <div className="h-6 bg-white/30 rounded mb-4 w-40 animate-pulse"></div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-white/20 rounded w-full animate-pulse"></div>
                ))}
              </div>
            </div>

            {/* Button Skeleton */}
            <div className="h-12 bg-[#8b5cf6] rounded-lg w-32 animate-pulse"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e8e8e8] flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] rounded-2xl p-6 mb-8">
          <h1 className="text-2xl font-semibold text-white">
            <span className="font-bold">Manage</span> Profile
          </h1>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-lg font-semibold mb-2">
              <span className="text-[#1a1a1a]">User</span>
              <span className="text-[#8b5cf6]">name</span>
            </label>
            <Input
              placeholder="Username"
              value={userData?.username ?? ""}
              disabled
              className="bg-white border-0 rounded-xl h-12 text-[#6b7280]"
            />
          </div>
          <div>
            <label className="block text-lg font-semibold mb-2">
              <span className="text-[#1a1a1a]">First </span>
              <span className="text-[#8b5cf6]">name</span>
            </label>
            <Input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isLoading}
              className="bg-white border-0 rounded-xl h-12 text-[#6b7280]"
            />
          </div>
          <div>
            <label className="block text-lg font-semibold mb-2">
              <span className="text-[#1a1a1a]">Last </span>
              <span className="text-[#8b5cf6]">name</span>
            </label>
            <Input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isLoading}
              className="bg-white border-0 rounded-xl h-12 text-[#6b7280]"
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="mb-8">
          <label className="block text-lg font-semibold mb-2">
            <span className="text-[#1a1a1a]">Email</span>
            <span className="text-[#8b5cf6]">address</span>
          </label>
          <Input
            placeholder="Email"
            value={userData?.email ?? ""}
            disabled
            className="bg-white border-0 rounded-xl h-12 text-[#6b7280]"
          />
        </div>

        {/* Role Field */}
        <div className="mb-8">
          <label className="block text-lg font-semibold mb-2">
            <span className="text-[#1a1a1a]">Role</span>
          </label>
          <Input
            placeholder="Role"
            value={userData?.role_display ?? "Data not available"}
            disabled
            className="bg-white border-0 rounded-xl h-12 text-[#6b7280]"
          />
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Profile updated successfully.
          </div>
        )}

        {/* Registered Date */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">
            <span className="text-[#1a1a1a]">Member </span>
            <span className="text-[#8b5cf6]">Since</span>
          </h2>
          <Input
            placeholder="Registration date"
            value={userData?.registered_date ? new Date(userData.registered_date).toLocaleDateString() : "Data not available"}
            disabled
            className="bg-white border-0 rounded-xl h-12 text-[#6b7280]"
          />
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          {/* Membership Information Card */}
          <div className="bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] rounded-2xl p-6 w-full md:w-96">
            <h3 className="text-xl font-semibold text-white mb-4 border-b border-white/30 pb-2">
              Membership Information
            </h3>
            <div className="space-y-2 text-white text-sm">
              <p>
                <span className="font-semibold">Member since:</span> {userData?.registered_date ? new Date(userData.registered_date).toLocaleDateString() : "Data not available"}
              </p>
              <p>
                <span className="font-semibold">Type:</span> {userData?.role_display ?? "Data not available"}
              </p>
              <p>
                <span className="font-semibold">Status:</span> Active
              </p>
            </div>
          </div>

          {/* Update Button */}
          <Button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-8 py-3 rounded-lg h-auto"
          >
            {isSaving ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner />
                Updating...
              </div>
            ) : (
              "Update Details"
            )}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
