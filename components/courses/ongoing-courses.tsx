"use client"

import { useEffect, useState } from "react"
import { FileText } from "lucide-react"
import { useRouter } from "next/navigation"

import { coursesService, type OngoingCourse, type OngoingCoursesSummary } from "@/lib/api/courses"

export function OngoingCourses() {
  const router = useRouter()
  const [courses, setCourses] = useState<OngoingCourse[]>([])
  const [summary, setSummary] = useState<OngoingCoursesSummary>({
    totalOngoing: 0,
    totalEnrolled: 0,
    averageCompletion: 0,
    totalCompletionPercentage: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setIsLoading(true)
      setHasError(false)
      try {
        const data = await coursesService.ongoingWithSummary()
        if (!alive) return
        setCourses(data.courses)
        setSummary(data.summary)
      } catch {
        if (!alive) return
        setCourses([])
        setSummary({
          totalOngoing: 0,
          totalEnrolled: 0,
          averageCompletion: 0,
          totalCompletionPercentage: 0,
        })
        setHasError(true)
      } finally {
        if (!alive) return
        setIsLoading(false)
      }
    }
    void run()
    return () => { alive = false }
  }, [])

  const handleResumeCourse = (courseId: string | number) => {
    router.push(`/course-detail?id=${courseId}`)
  }

  if (isLoading) {
    return (
      <section className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span className="text-primary">Complete Your</span>{" "}
          <span className="text-muted-foreground">On-Going Courses</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 sm:h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
              <div className="h-28 sm:h-32 bg-muted" />
              <div className="p-2.5 sm:p-3 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (courses.length === 0) {
    return (
      <section className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span className="text-primary">Continue Your</span>{" "}
          <span className="text-muted-foreground">On-Going Courses</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs text-muted-foreground">Total Ongoing</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground">{summary.totalOngoing}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs text-muted-foreground">Total Enrolled</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground">{summary.totalEnrolled}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs text-muted-foreground">Average Completion</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground">{summary.averageCompletion}%</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs text-muted-foreground">Total Completion</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground">{summary.totalCompletionPercentage}%</p>
          </div>
        </div>
        <div className="text-center py-10 text-muted-foreground">
          {hasError ? (
            <p className="text-sm">Unable to load ongoing courses right now.</p>
          ) : (
            <p className="text-sm">You do not have any ongoing courses yet.</p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="mb-6 sm:mb-8">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        <span className="text-primary">Continue Your</span>{" "}
        <span className="text-muted-foreground">On-Going Courses</span>
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-muted-foreground">Total Ongoing</p>
          <p className="text-lg sm:text-xl font-semibold text-foreground">{summary.totalOngoing}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-muted-foreground">Total Enrolled</p>
          <p className="text-lg sm:text-xl font-semibold text-foreground">{summary.totalEnrolled}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-muted-foreground">Average Completion</p>
          <p className="text-lg sm:text-xl font-semibold text-foreground">{summary.averageCompletion}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-muted-foreground">Total Completion</p>
          <p className="text-lg sm:text-xl font-semibold text-foreground">{summary.totalCompletionPercentage}%</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {courses.map((course) => {
          const progress = course.progress_percentage ?? course.progress ?? 0
          const image = course.thumbnail ?? course.image
          const lastActivity = course.last_activity
          return (
            <div key={course.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="relative h-28 sm:h-32">
                <img
                  src={image ?? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=200&fit=crop"}
                  alt={course.title ?? "Course"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5 sm:p-3">
                <h3 className="font-semibold text-foreground mb-2 text-sm line-clamp-2">
                  {course.title ?? "Untitled Course"}
                </h3>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {lastActivity && lastActivity !== "No activity" && (
                  <div className="text-xs text-muted-foreground mb-2">
                    Last: {lastActivity}
                  </div>
                )}
                <button
                  onClick={() => handleResumeCourse(course.id)}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-xs sm:text-sm"
                >
                  Resume Course
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
