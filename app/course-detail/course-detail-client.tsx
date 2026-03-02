"use client"

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Play, 
  Clock, 
  BookOpen, 
  Users, 
  Award, 
  CheckCircle,
  ChevronRight,
  BarChart,
  Globe,
  Target,
  Calendar,
  Monitor,
  Infinity,
  FileText,
  Smartphone,
  Repeat
} from 'lucide-react';

import { coursesService, type ApiCourse, type LibraryCourse } from "@/lib/api/courses"
import { dashboardService, type ContinueLearningCourse, type RecommendedCourse } from "@/lib/api/dashboard"
import { pdpService } from "@/lib/api/pdp"
import { authApi } from "@/lib/api/http";
import { Spinner } from "@/components/ui/spinner";

type CurriculumTopic = {
  title?: string;
  duration?: string;
  is_preview?: boolean;
};

type CurriculumSection = {
  title?: string;
  topics?: CurriculumTopic[];
};

type RelatedCourse = {
  id?: string | number;
  course_id?: string | number;
  courseId?: string | number;
  ID?: string | number;
  thumbnail?: string;
  image?: string;
  featured_image?: string;
  title?: string;
  rating?: number;
  reviews_count?: number;
  students_count?: number;
  price?: {
    display?: string;
  };
};

type CourseInstructor = {
  avatar?: string;
  name?: string;
  expertise?: string;
  bio?: string;
  rating?: number;
  courses_count?: number;
};

type CourseData = {
  curriculum?: CurriculumSection[];
  course?: {
    duration?: string;
    cpd_points?: number;
    features?: string[];
    learning_objectives?: string[];
    requirements?: string[];
  };
  related_courses?: RelatedCourse[];
  instructor?: CourseInstructor | null;
};

export function CourseDetailClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseIdOrSlug = searchParams.get('id') ?? ''
  const [course, setCourse] = useState<ApiCourse | LibraryCourse | null>(null)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrollConfirmedByAction, setEnrollConfirmedByAction] = useState(false)
  const [dashboardCourse, setDashboardCourse] = useState<ContinueLearningCourse | RecommendedCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<number | null>(null)
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState('')
  const [enrollSuccess, setEnrollSuccess] = useState(false)
  const [isStartingCourse, setIsStartingCourse] = useState(false)
  const [isAddingToPdp, setIsAddingToPdp] = useState(false)
  const [addToPdpError, setAddToPdpError] = useState('')
  const [addToPdpSuccess, setAddToPdpSuccess] = useState('')
  const [addedPdpId, setAddedPdpId] = useState<string>('')
  const [isOpeningLinkedPdp, setIsOpeningLinkedPdp] = useState(false)

  useEffect(() => {
    if (!courseIdOrSlug) return
    let alive = true
    const run = async () => {
      setLoading(true)
      try {
        const isNumericId = /^\d+$/.test(courseIdOrSlug)
        const data = isNumericId
          ? await coursesService.details(courseIdOrSlug)
          : await coursesService.detailsBySlug(courseIdOrSlug)
        if (!alive) return
        setEnrollConfirmedByAction(false)
        setCourse(data)
        setIsEnrolled(Boolean((data as any)?.enrolled ?? (data as any)?.is_enrolled))
        setDashboardCourse(null)
        if (data?.id !== undefined && data?.id !== null) {
          try {
            const dashCourse = await dashboardService.courseById(data.id)
            if (alive) setDashboardCourse(dashCourse)
          } catch {
            if (alive) setDashboardCourse(null)
          }
        }
        // Store the full API response to access curriculum and related courses
        // Use the same endpoint to get the full response structure
        const response = await authApi.get("/wp-json/reactapi/v1/courses/", {
          params: isNumericId ? { id: courseIdOrSlug } : { slug: courseIdOrSlug },
        })
        if (response.data?.success && alive) {
          setCourseData(response.data.data)
        }
      } catch (e) {
        if (!alive) return
        setError('Failed to load course')
        console.error(e)
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [courseIdOrSlug])

  const handleStartCourse = () => {
    if (!course?.id || isStartingCourse) return
    setIsStartingCourse(true)
    if (course?.id) {
      router.push(`/course/${course.id}`)
    }
  };

  const handleEnroll = async () => {
    if (!course?.id) return
    setEnrollError('')
    setEnrollSuccess(false)
    setIsEnrolling(true)
    try {
      const enrollResult = await coursesService.enroll(course.id)
      if (!enrollResult.success) {
        setEnrollError(enrollResult.message || "Enrollment failed. Please try again.")
        return
      }

      // Enroll endpoint is the source of truth for this action.
      setEnrollConfirmedByAction(true)
      setIsEnrolled(true)
      setCourse((prev) => (prev ? ({ ...prev, enrolled: true } as ApiCourse | LibraryCourse) : prev))
      setEnrollSuccess(true)
      setTimeout(() => setEnrollSuccess(false), 2500)

      // Non-blocking refresh so UI can absorb any extra server-side fields.
      void coursesService.details(String(course.id))
        .then((refreshedCourse) => {
          if (refreshedCourse) {
            setCourse(refreshedCourse as ApiCourse | LibraryCourse)
            // Do not downgrade a confirmed-enrolled state based on stale detail response.
            setIsEnrolled((prev) => prev || Boolean((refreshedCourse as any)?.enrolled ?? (refreshedCourse as any)?.is_enrolled))
          }
        })
        .catch(() => {
          // Ignore refresh failure; enroll call already succeeded.
        })
    } catch (error) {
      const errObj = (error && typeof error === "object" ? error : {}) as Record<string, unknown>
      const response = (errObj.response && typeof errObj.response === "object"
        ? errObj.response
        : {}) as Record<string, unknown>
      const data = (response.data && typeof response.data === "object"
        ? response.data
        : {}) as Record<string, unknown>
      const apiMessage = (typeof data.message === "string" && data.message.trim()) || (typeof data.error === "string" && data.error.trim())
      setEnrollError(apiMessage || 'Failed to enroll. Please try again.')
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleAddToPDP = async () => {
    if (!course?.id) return
    setAddToPdpError('')
    setAddToPdpSuccess('')
    setAddedPdpId('')
    setIsAddingToPdp(true)

    const getObj = (raw: unknown): Record<string, unknown> => (
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
    )
    const getText = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback)
    const parseHours = (value: string | undefined): number => {
      if (!value) return 0
      const lower = value.toLowerCase()
      const hourMatch = lower.match(/(\d+(\.\d+)?)\s*h/)
      if (hourMatch) return Number.parseFloat(hourMatch[1]) || 0
      const minuteMatch = lower.match(/(\d+)\s*m/)
      if (minuteMatch) return Number.parseInt(minuteMatch[1], 10) / 60
      const numeric = Number.parseFloat(lower)
      return Number.isFinite(numeric) ? numeric : 0
    }
    const pickData = (raw: unknown): Record<string, unknown> => {
      const root = getObj(raw)
      const data = root.data
      return data && typeof data === "object" ? (data as Record<string, unknown>) : root
    }

    try {
      // 1) Use active PDP if available; otherwise create one so user action always does something concrete.
      const pdpList = await pdpService.list({ status: "active", perPage: 20, page: 1 })
      const existing = Array.isArray(pdpList.items) ? pdpList.items[0] : null
      let pdpId = ""
      if (existing && typeof existing === "object") {
        const obj = existing as Record<string, unknown>
        const id = obj.id
        if (typeof id === "string" || typeof id === "number") pdpId = String(id)
      }
      if (!pdpId) {
        const created = await pdpService.create({
          name: `PDP - ${(course.title ?? "Course").toString()}`,
          description: "Auto-created from course detail Add to PDP action",
          status: "active",
          year: String(new Date().getFullYear()),
        })
        const createdData = pickData(created)
        pdpId = String(createdData.id ?? "")
      }
      if (!pdpId) throw new Error("Unable to find or create a PDP plan.")

      // 2) Use service-layer transactional flow: add learning activity + link course.
      const parsedHours = parseHours((course as ApiCourse).duration)
      const safeHours = parsedHours > 0 ? parsedHours : 1
      const safeDurationLabel =
        ((course as ApiCourse).duration && String((course as ApiCourse).duration).trim())
        || `${safeHours} hour${safeHours === 1 ? "" : "s"}`
      await pdpService.addCourseToPdp(pdpId, {
        courseId: course.id,
        courseTitle: (course.title ?? `Course ${course.id}`).toString(),
        durationHours: safeHours,
        durationLabel: safeDurationLabel,
        status: "planned",
      })

      setAddedPdpId(pdpId)
      setAddToPdpSuccess("Course added to PDP successfully.")
    } catch (error) {
      const errObj = getObj(error)
      const response = getObj(errObj.response)
      const responseData = getObj(response.data)
      const message =
        getText(responseData.message)
        || getText(responseData.error)
        || getText(errObj.message)
        || "Failed to add course to PDP. Please try again."
      setAddToPdpError(message)
    } finally {
      setIsAddingToPdp(false)
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="h-6 bg-gray-200 rounded w-32" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            <div className="lg:col-span-2 space-y-4 sm:space-y-8">
              <div className="h-64 bg-gray-200 rounded-lg" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-lg" />)}
              </div>
              <div className="h-48 bg-gray-200 rounded-lg" />
            </div>
            <div className="lg:col-span-1 space-y-4">
              <div className="h-12 bg-gray-200 rounded-lg" />
              <div className="h-12 bg-gray-200 rounded-lg" />
              <div className="h-32 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Course not found.</p>
          <button onClick={() => router.back()} className="mt-4 text-purple-600 hover:underline">Go back</button>
        </div>
      </div>
    )
  }

  // Calculate total duration from curriculum topics
  const calculateTotalDuration = (): string | null => {
    if (!courseData?.curriculum) return null;
    
    let totalMinutes = 0;
    courseData.curriculum.forEach((lesson: CurriculumSection) => {
      if (lesson.topics && lesson.topics.length > 0) {
        lesson.topics.forEach((topic: CurriculumTopic) => {
          if (topic.duration && topic.duration.includes('min')) {
            const minutes = parseInt(topic.duration.replace('min', '').trim());
            if (!isNaN(minutes)) {
              totalMinutes += minutes;
            }
          }
        });
      }
    });
    
    if (totalMinutes === 0) return courseData.course?.duration ?? null;
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
    }
  };

  const durationLabel = calculateTotalDuration()
  const courseStats = [
    durationLabel ? { icon: <Clock />, value: durationLabel, label: "Duration" } : null,
    courseData?.curriculum?.length ? { icon: <BookOpen />, value: `${courseData.curriculum.length} Lessons`, label: "Content" } : null,
    course.students_count ? { icon: <Users />, value: String(course.students_count), label: "Students" } : null,
    courseData?.course?.cpd_points ? { icon: <Award />, value: `${courseData.course.cpd_points} CPD`, label: "Points" } : null,
  ].filter(Boolean) as Array<{ icon: React.ReactNode; value: string; label: string }>

  const learningObjectives = courseData?.course?.learning_objectives ?? [];
  const requirements = courseData?.course?.requirements ?? [];
  const curriculum = courseData?.curriculum ?? [];
  const relatedCourses = courseData?.related_courses ?? [];
  const instructor = courseData?.instructor ?? null;
  const courseIncludes = [
    durationLabel ? `${durationLabel} on-demand video` : null,
    courseData?.course?.features?.includes("Lifetime Access") ? "Lifetime access" : null,
    courseData?.course?.cpd_points ? `${courseData.course.cpd_points} CPD points` : null,
    courseData?.course?.features?.includes("Certificate of Completion") ? "Certificate of completion" : null,
    "Access on mobile and desktop",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition text-sm sm:text-base"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
            {/* Hero Image */}
            <div className="relative rounded-lg overflow-hidden shadow-lg">
              <img 
                src={(course as any).thumbnail ?? course.image ?? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=400&fit=crop"}
                alt={course.title ?? "Course"} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                <div className="p-4 sm:p-6 md:p-8 text-white">
                  <h1 className="text-xl sm:text-2xl md:text-4xl font-bold mb-1 sm:mb-2 break-words line-clamp-3">{course.title ?? "Untitled Course"}</h1>
                  <p className="text-sm sm:text-base md:text-lg text-gray-200 break-words line-clamp-3">{(course as any).excerpt ?? ""}</p>
                </div>
              </div>
            </div>

            {/* Course Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {courseStats.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg p-3 sm:p-4 md:p-6 text-center border border-gray-200">
                  <div className="flex justify-center mb-1.5 sm:mb-2 text-purple-600 [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6">
                    {stat.icon}
                  </div>
                  <div className="text-sm sm:text-base md:text-xl font-bold text-gray-900 truncate">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* About This Course */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">About This Course</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {(course as any).excerpt ?? (course as any).description ?? "No description available."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                {(course as any).level && (
                <div className="flex items-center gap-2 text-gray-600">
                  <BarChart size={16} />
                    <span>Level: {(course as any).level}</span>
                </div>
                )}
                {(courseData?.course as any)?.language && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Globe size={16} />
                    <span>Language: {(courseData?.course as any).language}</span>
                </div>
                )}
                {(courseData?.course as any)?.updated_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} />
                    <span>Updated: {new Date((courseData?.course as any).updated_date).toLocaleDateString()}</span>
                </div>
                )}
                {courseData?.course?.cpd_points && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Target size={16} />
                    <span>CPD Points: {courseData.course.cpd_points}</span>
                </div>
                )}
              </div>
            </div>

            {/* This course includes */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">This course includes:</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {durationLabel && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Monitor size={16} className="sm:hidden" />
                    <Monitor size={20} className="hidden sm:block" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">{durationLabel} on-demand video</span>
                </div>
                )}
                {courseData?.course?.features?.includes("Lifetime Access") && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Repeat size={16} className="sm:hidden" />
                    <Repeat size={20} className="hidden sm:block" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">Lifetime access</span>
                </div>
                )}
                {courseData?.course?.cpd_points && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Award size={16} className="sm:hidden" />
                    <Award size={20} className="hidden sm:block" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">{courseData.course.cpd_points} CPD points</span>
                </div>
                )}
                {courseData?.course?.features?.includes("Certificate of Completion") && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="sm:hidden" />
                    <FileText size={20} className="hidden sm:block" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">Certificate of completion</span>
                </div>
                )}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Smartphone size={16} className="sm:hidden" />
                    <Smartphone size={20} className="hidden sm:block" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">Access on mobile and desktop</span>
                </div>
              </div>
            </div>

            {/* What You'll Learn */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">What You'll Learn</h2>
              {learningObjectives.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {learningObjectives.map((objective: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <div className="text-green-600 mt-0.5 flex-shrink-0">
                        <CheckCircle size={18} className="sm:hidden" />
                        <CheckCircle size={20} className="hidden sm:block" />
                      </div>
                      <span className="text-sm sm:text-base text-gray-700">{objective}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm sm:text-base text-gray-500">No learning objectives returned by API.</p>}
            </div>

          {/* Course Curriculum */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Course Curriculum</h2>
              {curriculum.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {curriculum.map((section, sectionIndex: number) => (
                    <div key={sectionIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSection(expandedSection === sectionIndex ? null : sectionIndex)}
                        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                            {sectionIndex + 1}
                          </div>
                          <span className="font-semibold text-gray-900 text-sm sm:text-base text-left truncate">{section.title}</span>
                        </div>
                        <div className={`transform transition-transform flex-shrink-0 ml-2 ${expandedSection === sectionIndex ? 'rotate-90' : ''}`}>
                          <ChevronRight size={16} />
                        </div>
                      </button>
                      {expandedSection === sectionIndex && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          {(section.topics || []).map((lesson, lessonIndex: number) => (
                            <div key={lessonIndex} className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-100 transition gap-2">
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                <div className="text-gray-400 flex-shrink-0">
                                  <Play size={14} className="sm:hidden" />
                                  <Play size={16} className="hidden sm:block" />
                                </div>
                                <span className="text-sm sm:text-base text-gray-700 truncate">{lesson.title}</span>
                                {lesson.is_preview && (
                                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 text-purple-700 text-[10px] sm:text-xs font-semibold rounded flex-shrink-0">
                                    Preview
                                  </span>
                                )}
                              </div>
                              <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0 whitespace-nowrap">{lesson.duration}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm sm:text-base text-gray-500">No curriculum returned by API.</p>}
            </div>

          {/* Requirements */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Requirements</h2>
              {requirements.length > 0 ? (
                <div className="space-y-3">
                  {requirements.map((requirement: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <div className="text-purple-600 mt-0.5 flex-shrink-0">
                        <CheckCircle size={18} className="sm:hidden" />
                        <CheckCircle size={20} className="hidden sm:block" />
                      </div>
                      <span className="text-sm sm:text-base text-gray-700">{requirement}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm sm:text-base text-gray-500">No requirements returned by API.</p>}
            </div>

            {/* Instructor */}
            {instructor && (
              <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Instructor</h2>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <img 
                    src={instructor.avatar} 
                    alt={instructor.name} 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 break-words">{instructor.name}</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-2">{instructor.expertise}</p>
                    <p className="text-sm sm:text-base text-gray-700 mb-3 break-words">{instructor.bio}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Award size={14} />
                        <span className="text-gray-600">Rating: {instructor.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen size={14} />
                        <span className="text-gray-600">Courses: {instructor.courses_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Related Courses */}
            {relatedCourses.length > 0 && (
              <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Related Courses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {relatedCourses.map((relatedCourse) => {
                    const targetId = relatedCourse.id ?? relatedCourse.course_id ?? relatedCourse.courseId ?? relatedCourse.ID
                    return (
                      <button
                        key={relatedCourse.id ?? relatedCourse.course_id ?? relatedCourse.courseId ?? relatedCourse.ID}
                        type="button"
                        onClick={() => targetId && router.push(`/course-detail?id=${targetId}`)}
                        className="text-left border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                      >
                        <img
                          src={relatedCourse.thumbnail ?? relatedCourse.image ?? relatedCourse.featured_image}
                          alt={relatedCourse.title ?? "Related course"}
                          className="w-full h-32 sm:h-40 object-cover"
                        />
                        <div className="p-3 sm:p-4">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 line-clamp-2">{relatedCourse.title ?? "Course"}</h3>
                          {typeof relatedCourse.rating === "number" && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-2">
                            <Award size={12} />
                              <span>{relatedCourse.rating}</span>
                            {relatedCourse.reviews_count && <span>({relatedCourse.reviews_count})</span>}
                          </div>
                          )}
                          {typeof relatedCourse.students_count === "number" && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-2">
                            <Users size={12} />
                              <span>{relatedCourse.students_count} students</span>
                          </div>
                          )}
                          <div className="text-xs sm:text-sm font-medium text-purple-600">
                            {relatedCourse.price?.display || "Free"}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Right Side (stacks on mobile, shows before main content options) */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="lg:sticky lg:top-6 space-y-3 sm:space-y-4">
              {typeof (dashboardCourse as any)?.progress === "number" && (
                <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
                  <div className="flex items-center justify-between text-sm sm:text-base mb-2">
                    <span className="text-gray-700 font-medium">Your progress</span>
                    <span className="text-gray-900 font-semibold">{(dashboardCourse as any)?.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${(dashboardCourse as any)?.progress ?? 0}%` }}
                    />
                  </div>
                  {(dashboardCourse as any)?.lastAccessed && (
                    <p className="text-xs text-gray-500 mt-2">Last accessed: {(dashboardCourse as any)?.lastAccessed}</p>
                  )}
                </div>
              )}
              {/* Enroll/Start CTA */}
              {isEnrolled || enrollConfirmedByAction ? (
                <button 
                  onClick={handleStartCourse}
                  disabled={isStartingCourse}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50"
                >
                  {isStartingCourse ? (
                    <>
                      <Spinner />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play size={18} className="sm:hidden" />
                      <Play size={20} className="hidden sm:block" />
                      Start Course
                    </>
                  )}
                </button>
              ) : (
                <button 
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isEnrolling ? (
                    <>
                      <Spinner />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <Play size={18} className="sm:hidden" />
                      <Play size={20} className="hidden sm:block" />
                      Enroll Now
                    </>
                  )}
                </button>
              )}

              {enrollSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Enrolled successfully!
                </div>
              )}
              {enrollError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {enrollError}
                </div>
              )}
              
              <button 
                onClick={handleAddToPDP}
                disabled={isAddingToPdp}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingToPdp ? "Adding to PDP..." : "Add to PDP"}
              </button>
              {addToPdpSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {addToPdpSuccess}
                </div>
              )}
              {addToPdpError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {addToPdpError}
                </div>
              )}
              {addedPdpId && (
                <button
                  onClick={() => {
                    if (isOpeningLinkedPdp) return
                    setIsOpeningLinkedPdp(true)
                    router.push(`/pdp?view=detail&id=${addedPdpId}`)
                  }}
                  disabled={isOpeningLinkedPdp}
                  className="w-full px-4 sm:px-6 py-2.5 border border-purple-300 text-purple-700 rounded-lg font-medium hover:bg-purple-50 transition text-sm disabled:opacity-50"
                >
                  {isOpeningLinkedPdp ? "Opening PDP..." : "View Linked PDP"}
                </button>
              )}

              {/* Course Includes */}
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">This course includes:</h3>
                <div className="space-y-2 sm:space-y-3">
                  {courseIncludes.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <div className="text-green-600 mt-0.5 flex-shrink-0">
                        <CheckCircle size={18} className="sm:hidden" />
                        <CheckCircle size={20} className="hidden sm:block" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
