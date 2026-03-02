"use client"

import { useEffect, useState } from "react"

import { userService, type ApiUser } from "@/lib/api/user"
import { dashboardService, type DashboardStats } from "@/lib/api/dashboard"

export function WelcomeBanner() {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [statsData, setStatsData] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true

    const run = async () => {
      setIsLoading(true)
      try {
        const [me, stats] = await Promise.all([
          userService.me(),
          dashboardService.stats(),
        ])
        if (!alive) return
        setUser(me)
        setStatsData(stats)
      } catch {
        if (!alive) return
        setUser(null)
        setStatsData(null)
      } finally {
        if (!alive) return
        setIsLoading(false)
      }
    }

    void run()

    return () => {
      alive = false
    }
  }, [])

  const stats = [
    { value: String(statsData?.totalCourses ?? 0), label: "Total Courses" },
    { value: String(statsData?.ongoingCourses ?? 0), label: "Ongoing Courses" },
    { value: String(statsData?.completedCourses ?? 0), label: "Completed Courses" },
    { value: statsData?.totalTimeSpent ?? "0h 0m", label: "Total Time Spent" },
  ]

  const displayName = [user?.title, user?.firstName, user?.lastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ")

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] rounded-2xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">
              <span className="font-bold">Welcome back</span>,{" "}
              <span className="animate-pulse inline-block w-20 h-6 bg-white/30 rounded"></span>
            </h1>
            <p className="text-white/80 text-sm sm:text-base">
              Explore new courses and complete your on-going courses.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((_, i) => (
              <div key={i} className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 sm:px-6 sm:py-4 text-center animate-pulse">
                <div className="h-6 bg-white/30 rounded w-12 mx-auto mb-1"></div>
                <div className="h-4 bg-white/30 rounded w-16 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-[#8b5cf6] via-[#8b5cf6] to-[#a855f7] rounded-2xl p-4 sm:p-6 mb-8">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="text-white">
          <h1 className="text-xl sm:text-2xl font-bold mb-1 break-words">
            Welcome back{displayName ? `, ${displayName}` : ""}!
          </h1>
          <p className="text-white/80 text-sm sm:text-base">
            Explore new courses and complete your on-going courses.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 sm:px-6 sm:py-4 text-center"
            >
              <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-xs sm:text-sm text-white/80">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
