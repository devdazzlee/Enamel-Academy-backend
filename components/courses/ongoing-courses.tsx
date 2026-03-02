"use client"

import { useEffect, useState } from "react"
import { FileText } from "lucide-react"
import { useRouter } from "next/navigation"

import { coursesService, type ApiCourse } from "@/lib/api/courses"

export function OngoingCourses() {
  const router = useRouter()
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setIsLoading(true)
      setHasError(false)
      try {
        const data = await coursesService.ongoing()
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
              <div className="h-32 sm:h-40 bg-muted" />
              <div className="p-3 sm:p-4 space-y-2">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {courses.map((course) => {
          const progress = course.progress ?? 0
          const image = course.thumbnail ?? course.image
          return (
            <div key={course.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="relative h-32 sm:h-40">
                <img
                  src={image ?? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=200&fit=crop"}
                  alt={course.title ?? "Course"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base line-clamp-2">
                  {course.title ?? "Untitled Course"}
                </h3>
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
                <button
                  onClick={() => handleResumeCourse(course.id)}
                  className="w-full py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-xs sm:text-sm"
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
