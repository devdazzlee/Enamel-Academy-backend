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
  Monitor,
  Tag
} from 'lucide-react';

import { coursesService, type ApiCourse, type LibraryCourse } from "@/lib/api/courses"
import { dashboardService, type ContinueLearningCourse, type RecommendedCourse } from "@/lib/api/dashboard"
import { pdpService } from "@/lib/api/pdp"
import { authApi } from "@/lib/api/http";
import { API_PATHS } from "@/lib/api/endpoints"
import { Spinner } from "@/components/ui/spinner";
import ReactPlayer from "react-player";

type CurriculumTopic = {
  title?: string;
  duration?: string;
  type?: string;
  is_preview?: boolean | number;
};

type CurriculumSection = {
  id?: number | string;
  title?: string;
  description?: string;
  html_content?: string;
  total_topics?: number;
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
    id?: number | string;
    slug?: string;
    excerpt?: string;
    description?: string;
    thumbnail?: string;
    banner_image?: string;
    duration?: string;
    duration_minutes?: number;
    format?: string;
    plan?: string;
    difficulty?: string;
    rating?: number;
    reviews_count?: number;
    students_count?: number;
    categories?: Array<{ id?: number | string; slug?: string; name?: string }>;
    tags?: Array<{ id?: number | string; slug?: string; name?: string }>;
    cpd_points?: number;
    price?: {
      type?: string;
      amount?: number;
      currency?: string;
      display?: string;
    };
    features?: string[];
    is_featured?: boolean;
    is_new?: boolean;
    created_date?: string;
    is_enrolled?: boolean;
    is_completed?: boolean;
    enrollment_date?: string | null;
    user_progress?: {
      percentage?: number;
      completed?: number;
      total?: number;
      status?: string;
    };
    learning_objectives?: string[];
    requirements?: string[];
    prerequisites?: string[];
    target_audience?: string[];
    curriculum_overview?: string;
    language?: string;
    updated_date?: string;
    settings?: {
      short_description?: string;
      duration?: {
        minutes?: number;
        text?: string;
      };
      price_type?: string;
      certificate?: string;
      disable_lesson_progression?: boolean;
      raw_settings?: Record<string, unknown>;
    };
  };
  related_courses?: RelatedCourse[];
  instructor?: CourseInstructor | null;
};

type DashboardCourseDetail = {
  progress: {
    overallPercentage: number;
    completedSteps: number;
    totalSteps: number;
    lastActivityDate: string;
  };
  modules: Array<{
    id: string;
    title: string;
    totalTopics: number;
    completedTopics: number;
    progress: number;
  }>;
  nextLesson: string;
};

const decodeHtmlEntities = (input: string): string => {
  if (!input) return "";
  const entityMap: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  const namedDecoded = Object.entries(entityMap).reduce(
    (result, [entity, value]) => result.split(entity).join(value),
    input
  );
  return namedDecoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
};

const sanitizeApiText = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  const stripped = decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["']+|["']+$/g, "");
  return stripped || fallback;
};

const extractVideoUrl = (html: unknown): string => {
  if (typeof html !== "string" || !html.trim()) return "";
  const decoded = decodeHtmlEntities(html);
  const directMatch = decoded.match(/https?:\/\/[^\s<>"']+/i);
  return directMatch ? directMatch[0] : "";
};

export function CourseDetailClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseIdOrSlug = searchParams.get('id') ?? ''
  const [course, setCourse] = useState<ApiCourse | LibraryCourse | null>(null)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrollConfirmedByAction, setEnrollConfirmedByAction] = useState(false)
  const [dashboardCourse, setDashboardCourse] = useState<ContinueLearningCourse | RecommendedCourse | null>(null)
  const [dashboardDetail, setDashboardDetail] = useState<DashboardCourseDetail | null>(null)
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

  const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
    return fallback;
  };

  const normalizeDashboardDetail = (raw: unknown): DashboardCourseDetail | null => {
    if (!raw || typeof raw !== "object") return null;
    const root = raw as Record<string, unknown>;
    const data = (root.data && typeof root.data === "object"
      ? root.data
      : root) as Record<string, unknown>;
    const progressRaw = (data.progress && typeof data.progress === "object"
      ? data.progress
      : {}) as Record<string, unknown>;
    const modulesRaw = Array.isArray(data.modules) ? data.modules : [];
    const modules = modulesRaw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const m = item as Record<string, unknown>;
        return {
          id: String(m.id ?? ""),
          title: sanitizeApiText(m.title, "Untitled Module"),
          totalTopics: toNumber(m.total_topics),
          completedTopics: toNumber(m.completed_topics),
          progress: toNumber(m.progress),
        };
      })
      .filter(Boolean) as DashboardCourseDetail["modules"];
    return {
      progress: {
        overallPercentage: toNumber(progressRaw.overall_percentage),
        completedSteps: toNumber(progressRaw.completed_steps),
        totalSteps: toNumber(progressRaw.total_steps),
        lastActivityDate: sanitizeApiText(progressRaw.last_activity_date, "No activity"),
      },
      modules,
      nextLesson: sanitizeApiText((data.next_lesson as Record<string, unknown> | null)?.title ?? data.next_lesson, ""),
    };
  };

  const formatDate = (value: string | null | undefined): string => {
    if (!value) return "Not available";
    const dt = new Date(value.replace(" ", "T"));
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleString();
  };

  useEffect(() => {
    if (!courseIdOrSlug) return
    let alive = true
    const run = async () => {
      setLoading(true)
      try {
        const isNumericId = /^\d+$/.test(courseIdOrSlug)
        // Fetch full API response to get curriculum, related_courses, instructor, etc.
        const fullResponse = await authApi.get(API_PATHS.courses.details, {
          params: isNumericId ? { id: courseIdOrSlug } : { slug: courseIdOrSlug },
        })
        if (!alive) return
        
        // Get normalized course for compatibility
        const data = isNumericId
          ? await coursesService.details(courseIdOrSlug)
          : await coursesService.detailsBySlug(courseIdOrSlug)
        if (!alive) return
        
        setEnrollConfirmedByAction(false)
        setCourse(data)
        setIsEnrolled(Boolean((data as any)?.enrolled ?? (data as any)?.is_enrolled))
        setDashboardCourse(null)
        setDashboardDetail(null)
        if (data?.id !== undefined && data?.id !== null) {
          try {
            const dashCourse = await dashboardService.courseById(data.id)
            if (alive) setDashboardCourse(dashCourse)
            const dashRaw = await authApi.get(API_PATHS.dashboard.courseById(data.id))
            if (alive) setDashboardDetail(normalizeDashboardDetail(dashRaw.data))
          } catch {
            if (alive) {
              setDashboardCourse(null)
              setDashboardDetail(null)
            }
          }
        }
        // Store the full API response to access curriculum, related_courses, instructor, etc.
        if (fullResponse.data && alive) {
          const apiData = fullResponse.data?.data ?? fullResponse.data
          setCourseData(apiData as any)
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
      const resumeFromNextLesson = sanitizeApiText(dashboardDetail?.nextLesson, "")
      const firstIncompleteModule = (dashboardDetail?.modules ?? []).find((m) => m.progress < 100)
      const resumeTitle = resumeFromNextLesson || sanitizeApiText(firstIncompleteModule?.title, "")
      if (resumeTitle) {
        const params = new URLSearchParams({ resume: resumeTitle })
        router.push(`/course/${course.id}?${params.toString()}`)
        return
      }
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

  const apiCourse = courseData?.course ?? {};
  const learningObjectives = apiCourse.learning_objectives ?? [];
  const requirements = apiCourse.requirements ?? [];
  const prerequisites = apiCourse.prerequisites ?? [];
  const targetAudience = apiCourse.target_audience ?? [];
  
  // Standard API uses 'curriculum' - define before calculateTotalDuration
  const curriculum = courseData?.curriculum ?? [];

  // Calculate total duration from curriculum topics
  const calculateTotalDuration = (): string | null => {
    if (curriculum.length === 0) {
      return (courseData?.course as any)?.duration ?? null;
    }
    
    let totalMinutes = 0;
    curriculum.forEach((lesson: any) => {
      if (lesson.topics && lesson.topics.length > 0) {
        lesson.topics.forEach((topic: any) => {
          if (topic.duration && topic.duration.includes('min')) {
            const minutes = parseInt(topic.duration.replace('min', '').trim());
            if (!isNaN(minutes)) {
              totalMinutes += minutes;
            }
          }
        });
      }
    });
    
    if (totalMinutes === 0) return (courseData?.course as any)?.duration ?? null;
    
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
    curriculum.length > 0 ? { icon: <BookOpen />, value: `${curriculum.length} Lessons`, label: "Content" } : null,
    course.students_count ? { icon: <Users />, value: String(course.students_count), label: "Students" } : null,
    courseData?.course?.cpd_points ? { icon: <Award />, value: `${courseData.course.cpd_points} CPD`, label: "Points" } : null,
  ].filter(Boolean) as Array<{ icon: React.ReactNode; value: string; label: string }>
  const relatedCourses = courseData?.related_courses ?? [];
  const instructor = courseData?.instructor ?? null;
  const featureIncludes = (apiCourse.features ?? [])
    .map((item) => sanitizeApiText(item, ""))
    .filter(Boolean);
  const courseIncludes = [
    durationLabel ? `${durationLabel} on-demand video` : null,
    apiCourse.cpd_points ? `${apiCourse.cpd_points} CPD points` : null,
    ...featureIncludes,
  ].filter(Boolean) as string[];
  const uniqueCourseIncludes = Array.from(new Set(courseIncludes));
  const bannerImage = sanitizeApiText(
    apiCourse.banner_image ?? (course as any).thumbnail ?? course.image ?? "",
    ""
  );
  const excerptText = sanitizeApiText(apiCourse.excerpt ?? (course as any).excerpt ?? "", "");
  // Check multiple sources for description, prioritizing settings.short_description
  // Access settings directly from courseData to ensure we get it even if type checking is strict
  const settingsFromCourse = (courseData?.course as any)?.settings;
  const settingsDescription = sanitizeApiText(settingsFromCourse?.short_description ?? apiCourse.settings?.short_description ?? "", "");
  // Standard API: description is in courseData.course.description (may contain HTML)
  const mainDescriptionRaw = apiCourse.description ?? (courseData?.course as any)?.description ?? (course as any).description ?? "";
  const mainDescription = typeof mainDescriptionRaw === 'string' && mainDescriptionRaw.trim() 
    ? mainDescriptionRaw 
    : "";
  // Use raw HTML if available, otherwise use sanitized text
  const descriptionHtml = mainDescription || settingsDescription || "";
  const descriptionText = descriptionHtml || "No description returned by API.";
  const hasDescriptionHtml = descriptionHtml && descriptionHtml !== "No description returned by API." && descriptionHtml.includes('<');
  const difficultyLabel = sanitizeApiText(apiCourse.difficulty ?? (course as any).level ?? "", "");
  const formatLabel = sanitizeApiText(apiCourse.format ?? "", "");
  const planLabel = sanitizeApiText(apiCourse.plan ?? "", "");
  const priceLabel = sanitizeApiText(apiCourse.price?.display ?? "", "");
  const categoryNames = (apiCourse.categories ?? [])
    .map((item) => sanitizeApiText(item?.name, ""))
    .filter(Boolean);
  const tagNames = (apiCourse.tags ?? [])
    .map((item) => sanitizeApiText(item?.name, ""))
    .filter(Boolean);
  // Get progress from enhanced API: data.progress.overall_percentage
  const hasInProgressSignal =
    toNumber(apiCourse.user_progress?.percentage) > 0
    || toNumber(dashboardDetail?.progress.overallPercentage) > 0
    || Boolean(sanitizeApiText(dashboardDetail?.nextLesson, ""));

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
              {bannerImage ? (
              <img 
                  src={bannerImage}
                alt={course.title ?? "Course"} 
                className="w-full h-full object-cover"
              />
              ) : (
                <div className="w-full h-64 bg-gray-200" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                <div className="p-4 sm:p-6 md:p-8 text-white">
                  <h1 className="text-xl sm:text-2xl md:text-4xl font-bold mb-1 sm:mb-2 break-words line-clamp-3">{course.title ?? "Course"}</h1>
                  <p className="text-sm sm:text-base md:text-lg text-gray-200 break-words line-clamp-3">{excerptText}</p>
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
              {hasDescriptionHtml ? (
                <div 
                  className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed">
                  {descriptionText}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                {difficultyLabel && (
                <div className="flex items-center gap-2 text-gray-600">
                  <BarChart size={16} />
                    <span>Level: {difficultyLabel}</span>
                </div>
                )}
                {formatLabel && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Monitor size={16} />
                    <span>Format: {formatLabel}</span>
                </div>
                )}
                {planLabel && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Target size={16} />
                    <span>Plan: {planLabel}</span>
                </div>
                )}
                {priceLabel && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Award size={16} />
                    <span>Price: {priceLabel}</span>
                </div>
                )}
                {apiCourse.language && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Globe size={16} />
                    <span>Language: {apiCourse.language}</span>
                </div>
                )}
                {apiCourse.cpd_points && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Target size={16} />
                    <span>CPD Points: {apiCourse.cpd_points}</span>
                </div>
                )}
                {typeof apiCourse.rating === "number" && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Award size={16} />
                    <span>Rating: {apiCourse.rating} ({apiCourse.reviews_count ?? 0} reviews)</span>
                </div>
                )}
                {categoryNames.length > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Tag size={16} />
                    <span>Categories: {categoryNames.join(", ")}</span>
                  </div>
                )}
                {tagNames.length > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Tag size={16} />
                    <span>Tags: {tagNames.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Curriculum Overview */}
            {sanitizeApiText(apiCourse.curriculum_overview, "") && (
              <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Curriculum Overview</h2>
                <p className="text-sm sm:text-base text-gray-700">
                  {sanitizeApiText(apiCourse.curriculum_overview, "")}
                </p>
              </div>
            )}

            {/* Progress & Completion */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Progress & Completion</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div className="text-gray-700">Enrollment Status: <span className="font-medium">{apiCourse.is_enrolled ? "Enrolled" : "Not enrolled"}</span></div>
                <div className="text-gray-700">Completion Status: <span className="font-medium">{apiCourse.is_completed ? "Completed" : "In progress"}</span></div>
                <div className="text-gray-700">Enrolled On: <span className="font-medium">{formatDate(apiCourse.enrollment_date)}</span></div>
                <div className="text-gray-700">Progress Status: <span className="font-medium">{sanitizeApiText(apiCourse.user_progress?.status, "not-started")}</span></div>
                <div className="text-gray-700">User Progress: <span className="font-medium">{toNumber(apiCourse.user_progress?.percentage) ?? 0}%</span></div>
                <div className="text-gray-700">Completed Steps: <span className="font-medium">{toNumber(apiCourse.user_progress?.completed) ?? 0} / {toNumber(apiCourse.user_progress?.total) ?? 0}</span></div>
                {dashboardDetail && (
                  <>
                    <div className="text-gray-700">Dashboard Progress: <span className="font-medium">{dashboardDetail.progress.overallPercentage}%</span></div>
                    <div className="text-gray-700">Dashboard Steps: <span className="font-medium">{dashboardDetail.progress.completedSteps} / {dashboardDetail.progress.totalSteps}</span></div>
                    <div className="text-gray-700 sm:col-span-2">Last Activity: <span className="font-medium">{dashboardDetail.progress.lastActivityDate}</span></div>
                    {dashboardDetail.nextLesson && (
                      <div className="text-gray-700 sm:col-span-2">Next Lesson: <span className="font-medium">{dashboardDetail.nextLesson}</span></div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* This course includes */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">This course includes:</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {uniqueCourseIncludes.map((item) => (
                  <div key={item} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={16} className="sm:hidden" />
                      <CheckCircle size={20} className="hidden sm:block" />
                  </div>
                    <span className="text-sm sm:text-base text-gray-700">{item}</span>
                  </div>
                ))}
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
                          <span className="font-semibold text-gray-900 text-sm sm:text-base text-left truncate">
                            {sanitizeApiText(section.title, `Lesson ${sectionIndex + 1}`)}
                          </span>
                        </div>
                        <div className={`transform transition-transform flex-shrink-0 ml-2 ${expandedSection === sectionIndex ? 'rotate-90' : ''}`}>
                          <ChevronRight size={16} />
                        </div>
                      </button>
                      {expandedSection === sectionIndex && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          {extractVideoUrl(section.html_content) && (
                            <div className="p-3 sm:p-4 border-b border-gray-200">
                              <div className="aspect-video overflow-hidden rounded-lg border border-gray-200 bg-black">
                                <ReactPlayer
                                  src={extractVideoUrl(section.html_content)}
                                  controls
                                  width="100%"
                                  height="100%"
                                  style={{ maxWidth: "100%" }}
                                />
                              </div>
                            </div>
                          )}
                          {(section.topics || []).map((lesson, lessonIndex: number) => (
                            <div key={lessonIndex} className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-100 transition gap-2">
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-100 text-purple-700 text-[11px] sm:text-xs font-semibold flex items-center justify-center shrink-0">
                                  {lessonIndex + 1}
                                </div>
                                <span className="text-sm sm:text-base text-gray-700 truncate">
                                  {sanitizeApiText(lesson.title, `Topic ${lessonIndex + 1}`)}
                                </span>
                                {lesson.is_preview && (
                                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 text-purple-700 text-[10px] sm:text-xs font-semibold rounded shrink-0">
                                    Preview
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] sm:text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full shrink-0 whitespace-nowrap">
                                {sanitizeApiText(lesson.duration, "N/A")}
                              </span>
                            </div>
                          ))}
                          {(section.topics || []).length === 0 && (
                            <div className="p-3 sm:p-4 text-sm text-gray-500">
                              No topics returned by API for this lesson.
                            </div>
                          )}
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

            {/* Prerequisites */}
            {prerequisites.length > 0 && (
              <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Prerequisites</h2>
                <div className="space-y-3">
                  {prerequisites.map((item: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <div className="text-purple-600 mt-0.5 flex-shrink-0">
                        <CheckCircle size={18} className="sm:hidden" />
                        <CheckCircle size={20} className="hidden sm:block" />
                      </div>
                      <span className="text-sm sm:text-base text-gray-700">{sanitizeApiText(item, "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience */}
            {targetAudience.length > 0 && (
              <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Target Audience</h2>
                <div className="space-y-3">
                  {targetAudience.map((item: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <div className="text-purple-600 mt-0.5 flex-shrink-0">
                        <CheckCircle size={18} className="sm:hidden" />
                        <CheckCircle size={20} className="hidden sm:block" />
                      </div>
                      <span className="text-sm sm:text-base text-gray-700">{sanitizeApiText(item, "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                      {hasInProgressSignal ? "Resume Course" : "Start Course"}
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
                  {uniqueCourseIncludes.map((item, index) => (
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
