"use client"

import { useEffect, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Clock, FileText, LayoutGrid } from "lucide-react"
import { useRouter } from "next/navigation"

import { coursesService, type ApiCourse } from "@/lib/api/courses"

export default function AllCoursesPage() {
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
        const data = await coursesService.list()
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

  const handleViewCourse = (courseId: string | number) => {
    router.push(`/course-detail?id=${courseId}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
        <h1 className="text-2xl font-bold mb-4 sm:mb-6">All Courses</h1>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
                <div className="h-28 sm:h-32 bg-muted" />
                <div className="p-2.5 sm:p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-6 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {hasError ? "Unable to load courses. Please try again." : "No courses found."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {courses.map((course) => (
              <div key={course.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="relative h-28 sm:h-32">
                  <img
                    src={course.thumbnail ?? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=200&fit=crop"}
                    alt={course.title ?? "Course"}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="p-2.5 sm:p-3">
                  <h3 className="font-medium text-foreground text-xs sm:text-sm mb-2 line-clamp-2">
                    {course.title ?? "Untitled Course"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-2 sm:mb-3">
                    {course.duration && (
                      <span className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span className="truncate">{course.duration}</span>
                      </span>
                    )}
                    {course.lessons && (
                      <span className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                        <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {course.lessons} lessons
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleViewCourse(course.id)}
                    className="w-full py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    View Course
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
