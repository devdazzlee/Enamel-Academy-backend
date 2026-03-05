"use client"

import React, { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle } from "lucide-react"

export default function PasswordSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push("/login")
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [router])

  return (
    <main className="min-h-screen bg-[#e8e8e8] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center text-center">
          <img 
            src="/logo.svg" 
            alt="Enamel Academy" 
            className="h-16 w-auto mb-8"
          />
          
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-3">
            Password Changed Successfully!
          </h1>
          
          <p className="text-[#6b7280] text-sm mb-8 max-w-md">
            Your password has been successfully changed. You can now use your new password to login to your account.
          </p>
          <p className="text-[#6b7280] text-xs mb-4">Redirecting to login in 3 seconds...</p>

          <Link
            href="/login"
            className="px-16 py-3 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#7c3aed] transition-colors inline-block"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  )
}
