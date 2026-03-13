"use client"

import { Play } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { dashboardService, type ContinueLearningCourse } from "@/lib/api/dashboard"

export function ContinueLearning() {
  const router = useRouter()
  const [courses, setCourses] = useState<ContinueLearningCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleResume = (courseId: string) => {
    router.push(`/course-detail?id=${courseId}`)
  }

  useEffect(() => {
    let alive = true

    const run = async () => {
      setIsLoading(true)
      setHasError(false)
      try {
        const data = await dashboardService.continueLearning()
        if (!alive) return
        setCourses(data)
      } catch {
        if (!alive) return
        setCourses([])
        setHasError(true)
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
      <section className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-2">
          <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          <span className="text-primary">Complete Your</span>{" "}
          <span className="text-muted-foreground">On-Going Courses</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border overflow-hidden animate-pulse">
              <div className="h-24 sm:h-28 bg-muted" />
              <div className="p-2.5 sm:p-3 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-1/2" />
                <div className="h-1.5 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (courses.length === 0) {
    return (
      <section className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-2">
          <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          <span className="text-primary">Complete Your</span>{" "}
          <span className="text-muted-foreground">On-Going Courses</span>
        </h2>
        <div className="text-center py-8 text-muted-foreground">
          {hasError ? (
            <>
              <p className="text-xs sm:text-sm">Unable to load ongoing courses.</p>
              <p className="text-xs mt-1">Please refresh and try again.</p>
            </>
          ) : (
            <>
              <p className="text-xs sm:text-sm">No ongoing courses yet.</p>
              <p className="text-xs mt-1">Start a course to see your progress here.</p>
            </>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="mb-4 sm:mb-6">
      <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-2">
        <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        <span className="text-primary">Complete Your</span>{" "}
        <span className="text-muted-foreground">On-Going Courses</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {courses.map((course) => (
          <div key={course.id} className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="relative h-24 sm:h-28">
              <img
                src={course.thumbnail ?? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=200&fit=crop"}
                alt={course.title ?? "Course"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="p-2.5 sm:p-3">
              <h3 className="font-semibold text-foreground mb-1.5 sm:mb-2 text-xs sm:text-sm line-clamp-2">
                {course.title ?? "Untitled Course"}
              </h3>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground font-medium">{Math.round(course.progress ?? 0)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2 sm:mb-2.5">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  style={{ width: `${course.progress ?? 0}%` }}
                />
              </div>
              <button 
                onClick={() => handleResume(String(course.id))}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-xs"
              >
                Resume Course
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
