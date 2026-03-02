"use client"

import React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EnamelLogo } from "@/components/enamel-logo"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { passwordResetService } from "@/lib/api/password-reset"
import { Spinner } from "@/components/ui/spinner"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      await passwordResetService.forgotPassword({ email: email.trim() })
      setSubmitted(true)
      setTimeout(() => {
        router.push(`/otp-verify?email=${encodeURIComponent(email.trim())}`)
      }, 600)
    } catch {
      setError("Unable to send OTP right now. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#e8e8e8] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center mb-10">
          <EnamelLogo className="mb-2" />
          <p className="text-[#6b7280] text-sm">Reset your password</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <p className="text-[#6b7280] text-sm text-center mb-4">
              Enter your email address and we will send you a link to reset your password.
            </p>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-white border border-[#e5e7eb] rounded-full text-[#1a1a1a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-12 py-3 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#7c3aed] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Sending...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>
              <Link
                href="/login"
                className="flex items-center gap-2 text-[#1a1a1a] text-sm hover:text-[#8b5cf6] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-[#8b5cf6]/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-[#8b5cf6]" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#1a1a1a] mb-2">Check your email</h2>
              <p className="text-[#6b7280] text-sm">
                We have sent a password reset link to <span className="font-medium text-[#1a1a1a]">{email}</span>
              </p>
            </div>
            <p className="text-[#9ca3af] text-xs">
              {"Didn't receive the email? Check your spam folder or "}
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-[#8b5cf6] hover:underline"
              >
                try again
              </button>
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[#1a1a1a] text-sm hover:text-[#8b5cf6] transition-colors mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
