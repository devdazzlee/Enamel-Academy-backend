"use client"

import { useEffect, useState } from "react"
import { Clock, FileText, LayoutGrid } from "lucide-react"
import { useRouter } from "next/navigation"

import { coursesService, type LibraryCourse } from "@/lib/api/courses"

export function CourseGrid({ activeFilters, searchQuery }: { 
  activeFilters: Record<string, string[]>
  searchQuery: string 
}) {
  const router = useRouter()
  const [courses, setCourses] = useState<LibraryCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setIsLoading(true)
      try {
        // Convert activeFilters to the format expected by API
        const filterParams: Record<string, string> = {};
        Object.entries(activeFilters).forEach(([key, values]) => {
          if (values.length > 0) {
            filterParams[key] = values[0]; // Take first selected value for each filter
          }
        });
        
        const data = await coursesService.library(filterParams)
        if (!alive) return
        setCourses(data)
      } catch {
        if (!alive) return
        setCourses([])
      } finally {
        if (!alive) return
        setIsLoading(false)
      }
    }
    void run()
    return () => { alive = false }
  }, [activeFilters])

  const handleViewCourse = (courseId: string | number) => {
    router.push(`/course-detail?id=${courseId}`)
  }

  // API handles filtering, so just apply search filter if needed
  const filteredCourses = courses.filter(course => {
    if (searchQuery && !course.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <section>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        <span className="text-primary">{String(filteredCourses.length).padStart(2, "0")}</span>{" "}
        <span className="text-muted-foreground">Courses</span>
      </h2>
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
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No courses found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="relative h-28 sm:h-32">
                <img
                  src={course.image ?? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=200&fit=crop"}
                  alt={course.title ?? "Course"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5 sm:p-3">
                <h3 className="font-medium text-foreground text-xs sm:text-sm mb-2 line-clamp-2">
                  {course.title ?? "Untitled Course"}
                </h3>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-2 sm:mb-3">
                  {course.rating && (
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      ⭐ {course.rating}
                      {course.reviews_count && (
                        <span>({course.reviews_count})</span>
                      )}
                    </span>
                  )}
                  {course.students_count && (
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      👥 {course.students_count} students
                    </span>
                  )}
                  {course.price?.display && (
                    <span className="flex items-center gap-0.5 sm:gap-1 font-medium text-green-600">
                      {course.price.display}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-2 sm:mb-3">
                  {course.duration && course.duration !== "Not specified" ? (
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {course.duration}
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      Self-paced
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
    </section>
  )
}
