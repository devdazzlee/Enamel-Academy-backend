"use client"

import React, { useState } from "react"
import { PasswordInput } from "@/components/password-input"

export default function ChangePasswordPage() {
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmNewPassword: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle change password logic
    console.log("Change password:", formData)
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
          <p className="text-[#6b7280] text-sm">Enter New Password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="px-16 py-3 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#7c3aed] transition-colors"
            >
              Change Password
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
