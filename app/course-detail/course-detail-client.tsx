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
  const [dashboardCourse, setDashboardCourse] = useState<ContinueLearningCourse | RecommendedCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<number | null>(null)
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState('')
  const [enrollSuccess, setEnrollSuccess] = useState(false)

  useEffect(() => {
    if (!courseIdOrSlug) return
    let alive = true
    const run = async () => {
      setLoading(true)
      try {
        const data = await coursesService.details(courseIdOrSlug)
        if (!alive) return
        setCourse(data)
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
        const response = await authApi.get(`/wp-json/reactapi/v1/courses/?id=${courseIdOrSlug}`)
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
      await coursesService.enroll(course.id)
      setEnrollSuccess(true)
      setTimeout(() => setEnrollSuccess(false), 3000)
    } catch {
      setEnrollError('Failed to enroll. Please try again.')
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleAddToPDP = () => {
    router.push('/pdp');
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
  const calculateTotalDuration = () => {
    if (!courseData?.curriculum) return "Data not available";
    
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
    
    if (totalMinutes === 0) {
      return courseData.course?.duration || "Data not available";
    }
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
    }
  };

  const courseStats = [
    { icon: <Clock />, value: calculateTotalDuration(), label: "Duration" },
    { icon: <BookOpen />, value: courseData?.curriculum?.length ? `${courseData.curriculum.length} Lessons` : "Data not available", label: "Content" },
    { icon: <Users />, value: course.students_count ? String(course.students_count) : "Data not available", label: "Students" },
    { icon: <Award />, value: courseData?.course?.cpd_points ? `${courseData.course.cpd_points} CPD` : "Data not available", label: "Points" }
  ];

  const courseIncludes = [
    `${calculateTotalDuration()} on-demand video`,
    courseData?.course?.features?.includes("Lifetime Access") ? "Lifetime access" : "Data not available",
    courseData?.course?.cpd_points ? `${courseData.course.cpd_points} CPD points` : "Data not available",
    courseData?.course?.features?.includes("Certificate of Completion") ? "Certificate of completion" : "Data not available",
    "Data not available"
  ];

  const learningObjectives = courseData?.course?.learning_objectives ?? [];
  const requirements = courseData?.course?.requirements ?? [];
  const curriculum = courseData?.curriculum ?? [];
  const relatedCourses = courseData?.related_courses ?? [];
  const instructor = courseData?.instructor ?? null;

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
                  <h1 className="text-xl sm:text-2xl md:text-4xl font-bold mb-1 sm:mb-2">{course.title ?? "Untitled Course"}</h1>
                  <p className="text-sm sm:text-base md:text-lg text-gray-200">{(course as any).excerpt ?? ""}</p>
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
                <div className="flex items-center gap-2 text-gray-600">
                  <BarChart size={16} />
                  <span>Level: {(course as any).level ?? "Data not available"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Globe size={16} />
                  <span>Language: {(courseData?.course as any)?.language ?? "Data not available"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} />
                  <span>Updated: {(courseData?.course as any)?.updated_date ? new Date((courseData?.course as any).updated_date).toLocaleDateString() : "Data not available"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Target size={16} />
                  <span>CPD Points: {courseData?.course?.cpd_points ?? "Data not available"}</span>
                </div>
              </div>
            </div>

            {/* This course includes */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">This course includes:</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Monitor size={16} className="sm:hidden" />
                    <Monitor size={20} className="hidden sm:block" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">{course.duration ? `${course.duration} on-demand video` : "Data not available"}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Repeat size={16} className="sm:hidden" />
                    <Repeat size={20} className="hidden sm:block" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">{courseData?.course?.features?.includes("Lifetime Access") ? "Lifetime access" : "Data not available"}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Award size={16} className="sm:hidden" />
                    <Award size={20} className="hidden sm:block" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">{courseData?.course?.cpd_points ? `${courseData.course.cpd_points} CPD points` : "Data not available"}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="sm:hidden" />
                    <FileText size={20} className="hidden sm:block" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">{courseData?.course?.features?.includes("Certificate of Completion") ? "Certificate of completion" : "Data not available"}</span>
                </div>
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
              ) : (
                <p className="text-sm sm:text-base text-gray-500">Data not available</p>
              )}
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
              ) : (
                <p className="text-sm sm:text-base text-gray-500">Data not available</p>
              )}
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
              ) : (
                <p className="text-sm sm:text-base text-gray-500">Data not available</p>
              )}
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
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">{instructor.name}</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-2">{instructor.expertise}</p>
                    <p className="text-sm sm:text-base text-gray-700 mb-3">{instructor.bio}</p>
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
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 line-clamp-2">{relatedCourse.title ?? "Untitled Course"}</h3>
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-2">
                            <Award size={12} />
                            <span>{relatedCourse.rating ?? "N/A"}</span>
                            {relatedCourse.reviews_count && <span>({relatedCourse.reviews_count})</span>}
                          </div>
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-2">
                            <Users size={12} />
                            <span>{relatedCourse.students_count ?? "N/A"} students</span>
                          </div>
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
              {typeof (dashboardCourse as any).progress === "number" && (
                <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
                  <div className="flex items-center justify-between text-sm sm:text-base mb-2">
                    <span className="text-gray-700 font-medium">Your progress</span>
                    <span className="text-gray-900 font-semibold">{(dashboardCourse as any).progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${(dashboardCourse as any).progress ?? 0}%` }}
                    />
                  </div>
                  {(dashboardCourse as any).lastAccessed && (
                    <p className="text-xs text-gray-500 mt-2">Last accessed: {(dashboardCourse as any).lastAccessed}</p>
                  )}
                </div>
              )}
              {/* Enroll/Start CTA */}
              {(course as any).enrolled ? (
                <button 
                  onClick={handleStartCourse}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Play size={18} className="sm:hidden" />
                  <Play size={20} className="hidden sm:block" />
                  Start Course
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
                className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition text-sm sm:text-base"
              >
                Add to PDP
              </button>

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
