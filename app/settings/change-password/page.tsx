"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ArrowLeft, Eye, EyeOff, Check, Lock, Key, Shield } from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";

import { userService } from "@/lib/api/user";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await userService.changePassword({
        currentPassword,
        newPassword,
      });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      // Extract the actual error message from the API response
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Failed to change password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e8e8e8] flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Link 
            href="/settings"
            className="flex items-center gap-2 text-[#6b7280] hover:text-[#1a1a1a] transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Back to Settings</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>

        <div className="max-w-xl sm:max-w-2xl mx-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-[#e5e7eb] p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <h1 className="text-lg sm:text-2xl font-semibold text-[#1a1a1a]">Change Password</h1>
                <p className="text-sm sm:text-base text-[#6b7280]">Update your account password</p>
              </div>
            </div>

            {isSuccess && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 sm:gap-3">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                <p className="text-green-800 text-sm sm:text-base">Password successfully changed!</p>
              </div>
            )}

            {error && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm sm:text-base">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-9 sm:pl-12 pr-12 py-2.5 sm:py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] text-sm sm:text-base"
                    placeholder="Enter your current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#1a1a1a]"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 sm:pl-12 pr-12 py-2.5 sm:py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] text-sm sm:text-base"
                    placeholder="Enter your new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#1a1a1a]"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 sm:pl-12 pr-12 py-2.5 sm:py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] text-sm sm:text-base"
                    placeholder="Confirm your new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#1a1a1a]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h3 className="text-sm font-medium text-[#1a1a1a] mb-2 sm:mb-3">Password Requirements:</h3>
                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-[#6b7280]">
                  <li className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-[#6b7280] rounded-full"></div>
                    <span className="text-xs sm:text-sm">At least 8 characters long</span>
                  </li>
                  <li className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-[#6b7280] rounded-full"></div>
                    <span className="text-xs sm:text-sm">Contains uppercase and lowercase letters</span>
                  </li>
                  <li className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-[#6b7280] rounded-full"></div>
                    <span className="text-xs sm:text-sm">Contains at least one number</span>
                  </li>
                  <li className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-[#6b7280] rounded-full"></div>
                    <span className="text-xs sm:text-sm">Contains at least one special character</span>
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#7c3aed] transition-colors text-sm sm:text-base"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Spinner />
                    Changing Password...
                  </div>
                ) : (
                  "Change Password"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
