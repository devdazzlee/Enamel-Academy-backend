"use client"

import React, { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PasswordInput } from "@/components/password-input"
import { passwordResetService } from "@/lib/api/password-reset"
import { Spinner } from "@/components/ui/spinner"

function UpdatePasswordPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetToken = (searchParams.get("reset_token") ?? "").trim()
  const email = (searchParams.get("email") ?? "").trim()
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmNewPassword: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null)

  React.useEffect(() => {
    let alive = true
    const run = async () => {
      if (!resetToken) {
        if (alive) setIsTokenValid(false)
        return
      }
      try {
        await passwordResetService.validateResetToken({ resetToken })
        if (alive) setIsTokenValid(true)
      } catch {
        if (alive) setIsTokenValid(false)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [resetToken])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!resetToken) {
      setError("Reset token is missing. Please restart forgot password flow.")
      return
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      setError("Passwords do not match.")
      return
    }
    if (formData.newPassword.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setIsSubmitting(true)
    try {
      await passwordResetService.resetPassword({
        resetToken,
        newPassword: formData.newPassword,
      })
      router.push("/password-success")
    } catch {
      setError("Unable to reset password. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#e8e8e8] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center mb-10">
          <img 
            src="/logo.svg" 
            alt="Enamel Academy" 
            className="h-16 w-auto mb-2"
          />
          <p className="text-[#6b7280] text-sm">Update Password</p>
          {email && <p className="text-xs text-[#6b7280] mt-1">{email}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {isTokenValid === false && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Reset token is invalid or expired. Please request a new OTP.
            </div>
          )}

          <PasswordInput
            label="New Password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="New Password"
          />

          <PasswordInput
            label="Confirm New Password"
            name="confirmNewPassword"
            value={formData.confirmNewPassword}
            onChange={handleChange}
            placeholder="Confirm New Password"
          />

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting || isTokenValid === false}
              className="px-16 py-3 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#7c3aed] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  Updating...
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#e8e8e8] flex items-center justify-center p-4">
          <div className="w-full max-w-xl text-center text-sm text-[#6b7280]">Loading reset form...</div>
        </main>
      }
    >
      <UpdatePasswordPageContent />
    </Suspense>
  )
}
