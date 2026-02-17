"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import { EnamelLogo } from "@/components/enamel-logo"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useAuthStore } from "@/lib/stores/auth-store"

export default function SignupPage() {
  const router = useRouter()
  const { register, isLoading } = useAuthStore()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    iAmA: "",
  })

  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.password || formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (!formData.iAmA) {
      setError("Please select your profession.")
      return
    }

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.iAmA,
      })
      router.push("/dashboard")
    } catch {
      setError("Signup failed. Please try again.")
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center mb-10">
          <EnamelLogo className="mb-2" />
          <p className="text-muted-foreground text-sm">Sign up into your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">First Name :</label>
              <input
                type="text"
                name="firstName"
                placeholder="Enter your name.."
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-card border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Last Name :</label>
              <input
                type="text"
                name="lastName"
                placeholder="Enter your name.."
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-card border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Email Id :</label>
              <input
                type="email"
                name="email"
                placeholder="info@xyz.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-card border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Mobile No. :</label>
              <input
                type="tel"
                name="mobile"
                placeholder="+1 - (555) 123-4567"
                value={formData.mobile}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-card border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Password :</label>
              <input
                type="password"
                name="password"
                placeholder="xxxxxxxxxx"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-card border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Confirm Password :</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="xxxxxxxxxx"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-card border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-muted-foreground mb-2">I am a :</label>
              <Select value={formData.iAmA} onValueChange={(value) => setFormData({ ...formData, iAmA: value })}>
                <SelectTrigger className="w-full rounded-lg md:rounded-full bg-white">
                  <SelectValue placeholder="Select your profession" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                  <SelectItem value="dentist">Dentist</SelectItem>
                  <SelectItem value="dental-nurse">Dental Nurse</SelectItem>
                  <SelectItem value="dental-care-professional">Dental Care Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white py-3 rounded-lg font-medium transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner />
                  Creating Account...
                </div>
              ) : (
                "Create Account"
              )}
            </button>
          </div>

          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign In Now
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
