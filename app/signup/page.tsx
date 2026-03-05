"use client"

import React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useAuthStore } from "@/lib/stores/auth-store"
import { rolesService } from "@/lib/api/roles"

const SIGNUP_ALLOWED_ROLES: Array<{ value: string; label: string }> = [
  { value: "dentist", label: "Dentist" },
  { value: "dental_nurse", label: "Dental Nurse" },
  { value: "dental_care_professional", label: "Dental Care Professional" },
]

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
  const [roleOptions, setRoleOptions] = useState<Array<{ value: string; label: string }>>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [rolesError, setRolesError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setRolesLoading(true)
      setRolesError("")
      try {
        const roles = await rolesService.roles()
        if (!alive) return
        const mapped = roles
          .map((r) => {
            const label = r.name || ""
            const value = (r.slug && r.slug.length > 0)
              ? r.slug
              : label.toLowerCase().replace(/\s+/g, "_")
            return { value, label }
          })
          .filter((r) => r.value && r.label)
        const allowedMap = new Map(mapped.map((r) => [r.value, r.label]))
        const allowedOnly = SIGNUP_ALLOWED_ROLES
          .map((role) => ({
            value: role.value,
            label: allowedMap.get(role.value) || role.label,
          }))
          .filter((role) => allowedMap.has(role.value))

        // Keep signup strict to only three professional roles.
        setRoleOptions(allowedOnly)
      } catch {
        if (!alive) return
        // Safe fallback in case roles API fails.
        setRoleOptions(SIGNUP_ALLOWED_ROLES)
        setRolesError("Unable to load profession list. Please refresh and try again.")
      } finally {
        if (alive) setRolesLoading(false)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [])

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
          <img 
            src="/logo.svg" 
            alt="Enamel Academy" 
            className="h-16 w-auto mb-2"
          />
          <p className="text-muted-foreground text-sm">Sign up into your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {rolesError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              {rolesError}
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="xxxxxxxxxx"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-card border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-4 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Confirm Password :</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="xxxxxxxxxx"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-card border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-4 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-muted-foreground mb-2">I am a :</label>
              <Select value={formData.iAmA} onValueChange={(value) => setFormData({ ...formData, iAmA: value })}>
                <SelectTrigger className="w-full rounded-lg md:rounded-full bg-white">
                  <SelectValue placeholder={rolesLoading ? "Loading professions..." : "Select your profession"} />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white py-3 rounded-lg font-medium transition-colors"
              disabled={isLoading || rolesLoading || roleOptions.length === 0}
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
