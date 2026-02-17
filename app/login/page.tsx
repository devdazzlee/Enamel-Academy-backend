"use client"

import React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { EnamelLogo } from "@/components/enamel-logo"
import { Mail, Lock } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { useAuthStore } from "@/lib/stores/auth-store"

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      await login({ email, password })
      router.push("/dashboard")
    } catch {
      setError("Invalid email or password. Please try again.")
    }
  }

  return (
    <main className="min-h-screen bg-[#e8e8e8] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center mb-10">
          <EnamelLogo className="mb-2" />
          <p className="text-[#6b7280] text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
              <Mail className="h-5 w-5" />
            </div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-14 pr-5 py-5 bg-white border-0 rounded-[20px] text-[#1a1a1a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 transition-all shadow-sm"
            />
          </div>

          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
              <Lock className="h-5 w-5" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-14 pr-14 py-5 bg-white border-0 rounded-[20px] text-[#1a1a1a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 transition-all shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#1a1a1a] transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-6">
            <button
              type="submit"
              className="px-16 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white py-3.5 rounded-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner />
                  Signing in...
                </div>
              ) : (
                "Log In"
              )}
            </button>
            <Link
              href="/forgot-password"
              className="text-[#1a1a1a] underline text-sm hover:text-[#8b5cf6] transition-colors ml-auto"
            >
              Forgot Password
            </Link>
          </div>

          <p className="text-sm text-[#6b7280] pt-4">
            {"Don't have an account? "}
            <Link href="/signup" className="text-[#8b5cf6] hover:underline">
              Sign Up Now
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}