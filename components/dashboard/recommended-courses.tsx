"use client"

import { Clock, FileText, Users, Award } from "lucide-react"
import { useRouter } from "next/navigation"

import { useEffect, useState } from "react"

import { dashboardService, type CourseProgressDetail, type RecommendedCourse } from "@/lib/api/dashboard"

export function RecommendedCourses() {
  const router = useRouter()

  const [courses, setCourses] = useState<RecommendedCourse[]>([])
  const [progressCourses, setProgressCourses] = useState<CourseProgressDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const handleStartCourse = (courseId: string | number) => {
    router.push(`/course-detail?id=${courseId}`)
  }

  useEffect(() => {
    let alive = true

    const run = async () => {
      setIsLoading(true)
      try {
        const data = await dashboardService.root()
        if (!alive) return
        setCourses(data.recommended ?? [])
        setProgressCourses(data.courseProgressDetails ?? [])
      } catch {
        if (!alive) return
        setCourses([])
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

  if (isLoading) {
    return (
      <section className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span className="text-primary">Recommended</span>{" "}
          <span className="text-muted-foreground">Courses</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
              <div className="h-40 sm:h-48 bg-muted" />
              <div className="p-3 sm:p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-6 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  const showProgressFallback = courses.length === 0 && progressCourses.length > 0

  if (courses.length === 0 && !showProgressFallback) {
    return (
      <section className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span className="text-primary">Recommended</span>{" "}
          <span className="text-muted-foreground">Courses</span>
        </h2>
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No recommended courses available.</p>
          <p className="text-xs mt-1">Check back later for new courses.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-6 sm:mb-8">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        <span className="text-primary">Recommended</span>{" "}
        <span className="text-muted-foreground">Courses</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {showProgressFallback
          ? (
            // Fallback to course_progress_details when recommended_courses is empty (API currently returns only progress).
            progressCourses.map((course) => {
              const progress = course.progressPercentage ?? 0
              const canNavigate = Boolean(course.courseId)
              return (
                <div
                  key={course.courseId}
                  className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-40 sm:h-48">
                    <img
                      src={"https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=200&fit=crop"}
                      alt={course.title ?? "Course"}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base line-clamp-2">
                      {course.title ?? "Untitled Course"}
                    </h3>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-2 sm:mb-3">
                      <span className="flex items-center gap-0.5 sm:gap-1">
                        <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {course.status ?? "Not available"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground">{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-3 sm:mb-4">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mb-3 sm:mb-4">
                      Last activity: {course.lastActivity ?? "Not available"}
                    </div>
                    <button
                      onClick={() => canNavigate && handleStartCourse(course.courseId)}
                      disabled={!canNavigate}
                      className="w-full py-2 sm:py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-xs sm:text-sm disabled:opacity-50"
                    >
                      View Course
                    </button>
                  </div>
                </div>
              )
            })
          )
          : courses.map((course) => (
            <div key={course.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-40 sm:h-48">
                <img
                  src={course.thumbnail ?? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=200&fit=crop"}
                  alt={course.title ?? "Course"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base line-clamp-2">
                  {course.title ?? "Untitled Course"}
                </h3>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-2 sm:mb-3">
                  {course.rating !== undefined && (
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {course.rating}
                    </span>
                  )}
                  {course.instructor && (
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {course.instructor}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-3 sm:mb-4">
                  {course.duration && course.duration !== "Not specified" && (
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {course.duration}
                    </span>
                  )}
                  {course.category && (
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {course.category}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => handleStartCourse(course.id)}
                  className="w-full py-2 sm:py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-xs sm:text-sm"
                >
                  Start Course
                </button>
              </div>
            </div>
          ))}
      </div>
    </section>
  )
}
