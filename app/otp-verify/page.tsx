"use client"

import React, { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { EnamelLogo } from "@/components/enamel-logo"
import { OTPInput } from "@/components/otp-input"
import { passwordResetService } from "@/lib/api/password-reset"
import { Spinner } from "@/components/ui/spinner"

function OTPVerifyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = (searchParams.get("email") ?? "").trim()
  const [otp, setOtp] = useState(Array(6).fill(""))
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const extractResetToken = (raw: unknown): string => {
    const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
    const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>
    const maybe = data.reset_token ?? data.resetToken ?? root.reset_token ?? root.resetToken ?? data.token ?? root.token
    return typeof maybe === "string" ? maybe : ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const otpCode = otp.join("")
    if (!email) {
      setError("Email is missing. Please start from forgot password.")
      return
    }
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP.")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await passwordResetService.verifyOtp({ email, otp: otpCode })
      const resetToken = extractResetToken(res)
      const query = new URLSearchParams({ email })
      if (resetToken) query.set("reset_token", resetToken)
      router.push(`/update-password?${query.toString()}`)
    } catch {
      setError("OTP verification failed. Please check code and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#e8e8e8] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center mb-10">
          <EnamelLogo className="mb-6" />
          <p className="text-[#6b7280] text-sm text-center">
            Verification code sent to your email.{" "}
            <span className="text-[#8b5cf6] font-medium">Check Inbox</span>
          </p>
          {email && <p className="text-xs text-[#6b7280] mt-2">{email}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <OTPInput value={otp} onChange={setOtp} />

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-16 py-3 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#7c3aed] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  Verifying...
                </span>
              ) : (
                "Verify OTP"
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default function OTPVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#e8e8e8] flex items-center justify-center p-4">
          <div className="w-full max-w-xl text-center text-sm text-[#6b7280]">Loading OTP verification...</div>
        </main>
      }
    >
      <OTPVerifyPageContent />
    </Suspense>
  )
}
