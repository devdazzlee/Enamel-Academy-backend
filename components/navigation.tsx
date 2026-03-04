"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth-store"
import { userService } from "@/lib/api/user"
import { Spinner } from "@/components/ui/spinner"
import {
  LayoutGrid,
  CreditCard,
  BookOpen,
  FileText,
  Activity,
  Award,
  HelpCircle,
  ChevronDown,
  User,
  Settings,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Users,
  BarChart3,
  Clock,
  CheckCircle,
  Star,
  Shield,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
  { href: "/dashboard", label: "Learning Hub", icon: LayoutGrid },
  { href: "/pricing", label: "Subscription Plans", icon: CreditCard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/pdp", label: "Your PDP", icon: FileText },
  { href: "/track-cpd", label: "Track CPD", icon: Activity },
  { href: "/certificates", label: "CPD Certificates", icon: Award },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
  { href: "/contact", label: "Contact Us", icon: MessageSquare },
]

interface NavigationProps {
  activeItem?: string
}

export function Navigation({ activeItem }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const logout = useAuthStore((s) => s.logout)
  const [displayName, setDisplayName] = useState("")

  useEffect(() => {
    let alive = true

    const run = async () => {
      setIsProfileLoading(true)
      try {
        const me = await userService.me()
        if (!alive) return
        setDisplayName(`${me.firstName ?? ""} ${me.lastName ?? ""}`.trim())
      } catch {
        if (!alive) return
        setDisplayName("")
      } finally {
        if (!alive) return
        setIsProfileLoading(false)
      }
    }

    void run()

    return () => {
      alive = false
    }
  }, [])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
      setIsMobileMenuOpen(false)
      router.push("/login")
    }
  }

  return (
    <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50">
      <div className="w-full px-4">
        <nav className="flex items-center h-16 gap-1">
          <Link href="/dashboard" className="flex-shrink-0 mr-1">
            <img
              src="/logo.svg"
              alt="Enamel Academy"
              className="h-12 w-auto"
            />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center flex-1 min-w-0 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeItem === item.label || pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 xl:px-2 2xl:px-3 py-2 text-xs 2xl:text-sm whitespace-nowrap rounded-lg transition-colors",
                    isActive
                      ? "bg-[#8b5cf6]/10 text-[#8b5cf6] font-medium"
                      : "text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]"
                  )}
                >
                  <Icon className="h-4 w-4 2xl:h-5 2xl:w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="xl:hidden flex items-center gap-2 ml-auto">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#6b7280] hover:text-[#1a1a1a] rounded-lg hover:bg-[#f5f5f5] transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {/* Desktop User Menu */}
          <div className="hidden xl:flex items-center gap-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 text-sm text-[#6b7280] hover:text-[#1a1a1a] rounded-lg hover:bg-[#f5f5f5] transition-colors">
                  <User className="h-4 w-4" />
                  <span>
                    {isProfileLoading ? "Loading..." : displayName || "User"}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => {
                  e.preventDefault()
                  void handleLogout()
                }}>
                  {isLoggingOut ? "Signing out..." : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
          </div>
        </nav>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden border-t border-[#e5e7eb] bg-white">
            <div className="py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeItem === item.label || pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors",
                      isActive
                        ? "bg-[#8b5cf6]/10 text-[#8b5cf6] font-medium"
                        : "text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              <div className="border-t border-[#e5e7eb] mt-4 pt-4">
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                >
                  {isLoggingOut ? (
                    <>
                      <Spinner />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />
                      Log out
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
