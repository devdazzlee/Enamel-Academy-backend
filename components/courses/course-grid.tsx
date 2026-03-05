"use client"

import { useEffect, useState } from "react"
import { Clock, LayoutGrid, Star, Users, Tag, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  coursesService,
  type LibraryCourse,
} from "@/lib/api/courses"

export function CourseGrid({ activeFilters, searchQuery }: { 
  activeFilters: Record<string, string[]>
  searchQuery: string 
}) {
  const router = useRouter()
  const [courses, setCourses] = useState<LibraryCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setIsLoading(true)
      setHasError(false)
      try {
        // Convert activeFilters to the format expected by API
        const filterParams: Record<string, string> = {};
        Object.entries(activeFilters).forEach(([key, values]) => {
          if (values.length > 0) {
            filterParams[key] = values[0]; // Take first selected value for each filter
          }
        });
        
        const data = await coursesService.libraryWithMeta(filterParams)
        if (!alive) return
        setCourses(data.courses)
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

  const toTitle = (value: string | undefined): string => {
    if (!value) return ""
    return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const progressPercent = (course: LibraryCourse): number => {
    const p = course.user_progress?.percentage
    if (typeof p !== "number" || Number.isNaN(p)) return 0
    return Math.max(0, Math.min(100, p))
  }

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
          {hasError ? "Unable to load courses. Please try again." : "No courses found."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="relative h-28 sm:h-32">
                <img
                  src={course.thumbnail ?? course.banner_image ?? course.image ?? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=200&fit=crop"}
                  alt={course.title ?? "Course"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5 sm:p-3">
                <h3 className="font-medium text-foreground text-xs sm:text-sm mb-2 line-clamp-2">
                  {course.title ?? "Untitled Course"}
                </h3>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(course.categories?.[0]?.name || course.plan) && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-foreground">
                      Category: {course.categories?.[0]?.name ?? toTitle(course.plan)}
                    </span>
                  )}
                  {course.price?.display && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${course.price.type === "free" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      Price: {course.price.display}
                    </span>
                  )}
                  {course.is_new && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-100 text-purple-700">
                      New
                    </span>
                  )}
                </div>
                {course.excerpt && (
                  <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{course.excerpt}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mb-2">
                  {course.format && (
                    <span className="inline-flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {toTitle(course.format)}
                    </span>
                  )}
                  {course.difficulty && (
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {toTitle(course.difficulty)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-2 sm:mb-3">
                  {typeof course.rating === "number" && (
                    <span className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                      {course.rating}
                      {typeof course.reviews_count === "number" && (
                        <span>({course.reviews_count})</span>
                      )}
                    </span>
                  )}
                  {typeof course.students_count === "number" && (
                    <span className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                      <Users className="h-3 w-3" /> {course.students_count}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-2 sm:mb-3">
                  {course.duration && course.duration !== "Not specified" ? (
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {course.duration}
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {course.format ? toTitle(course.format) : "Self-paced"}
                    </span>
                  )}
                  <span className="font-medium text-primary">{progressPercent(course)}% progress</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2 sm:mb-3">
                  <div
                    className="h-full bg-linear-to-r from-primary to-accent rounded-full"
                    style={{ width: `${progressPercent(course)}%` }}
                  />
                </div>
                {/* Feature tags hidden per UI request; keep code for future re-enable.
                <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                  {(course.features ?? []).slice(0, 3).map((feature) => (
                    <span key={feature} className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">
                      {feature}
                    </span>
                  ))}
                  {(course.features?.length ?? 0) > 3 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">
                      +{(course.features?.length ?? 0) - 3} more
                    </span>
                  )}
                </div>
                */}
                <div className="text-[11px] text-muted-foreground mb-2 sm:mb-3">
                  {course.is_completed ? "Completed" : course.is_enrolled ? "Enrolled" : "Not enrolled"}
                </div>
                <button 
                  onClick={() => handleViewCourse(course.id)}
                  className="w-full py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  {course.is_enrolled ? "Continue Course" : "View Course"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
