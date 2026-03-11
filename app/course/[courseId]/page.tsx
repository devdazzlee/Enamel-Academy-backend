"use client"

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Target,
  BookOpen,
  Award,
  Eye,
  Link2,
  Star,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  Settings,
  Maximize2,
  XCircle,
  Menu,
  X,
  FileText
} from "lucide-react"
import { authApi } from "@/lib/api/http"
import { coursesService } from "@/lib/api/courses"
import { assignmentService } from "@/lib/api/assignments"
import { certificatesService } from "@/lib/api/certificates"
import { API_PATHS } from "@/lib/api/endpoints"
import ReactPlayer from "react-player"

type Section = "about" | "learn" | "assess" | "evaluate"
type EvaluateSubPage = "resources" | "feedback" | "completed"

interface Answer {
  questionId: number
  selectedOption: number | null
}

type AssessmentQuestion = {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

type AssessmentSummaryItem = {
  id: string
  title: string
  status: string
  apiId: string | null
}

type CourseResourceItem = {
  id: string
  title: string
  description: string
  url?: string
}

type LessonStep = {
  id: string
  title: string
  description: string
  videoUrl: string
  topics: Array<{ id?: string; title: string; duration: string }>
}

const decodeHtmlEntities = (input: string): string => {
  if (!input) return ""
  const namedMap: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  }
  const namedDecoded = Object.entries(namedMap).reduce(
    (text, [entity, value]) => text.split(entity).join(value),
    input
  )
  return namedDecoded.replace(/&#(\d+);/g, (_, code) => {
    const num = Number(code)
    return Number.isFinite(num) ? String.fromCharCode(num) : ""
  })
}

const sanitizeApiText = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback
  const cleaned = decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["']+|["']+$/g, "")
  return cleaned || fallback
}

const extractVideoUrl = (html: unknown): string => {
  if (typeof html !== "string" || !html.trim()) return ""
  const decoded = decodeHtmlEntities(html)
  const directMatch = decoded.match(/https?:\/\/[^\s<>"']+/i)
  return directMatch ? directMatch[0] : ""
}

const feedbackCriteria = [
  "Overall Course Experience",
  "Content Quality & Clarity",
  "Instructor Effectiveness",
  "Course Difficulty Level",
  "Time Commitment & Pacing",
  "Course Materials Quality",
  "Support & Accessibility",
  "Relevance to Practice",
]

// ─── Component ─────────────────────────────────────────────────────

export default function CoursePlayerPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = params.courseId as string
  const resumeLessonParam = sanitizeApiText(searchParams.get("resume") ?? "", "")
  const [course, setCourse] = useState<any>(null)
  const [courseContent, setCourseContent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [quizQuestions, setQuizQuestions] = useState<AssessmentQuestion[]>([])
  const [resources, setResources] = useState<CourseResourceItem[]>([])
  const [assignmentItems, setAssignmentItems] = useState<AssessmentSummaryItem[]>([])
  const [quizItems, setQuizItems] = useState<AssessmentSummaryItem[]>([])
  const [quizStatsSummary, setQuizStatsSummary] = useState<{ total: number; passed: number; attempted: number }>({
    total: 0,
    passed: 0,
    attempted: 0,
  })
  const [assignmentStatsSummary, setAssignmentStatsSummary] = useState<{ total: number; completed: number; pending: number }>({
    total: 0,
    completed: 0,
    pending: 0,
  })
  const [assignmentDetailSummary, setAssignmentDetailSummary] = useState("")
  const [quizDetailSummary, setQuizDetailSummary] = useState("")
  const [quizAttemptsSummary, setQuizAttemptsSummary] = useState("")
  const [assessmentMetaLoading, setAssessmentMetaLoading] = useState(false)
  const [assessmentMetaError, setAssessmentMetaError] = useState("")
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("")
  const [selectedQuizId, setSelectedQuizId] = useState("")
  const [insightActionLoading, setInsightActionLoading] = useState(false)
  const [insightActionError, setInsightActionError] = useState("")
  const [resourceActionLoadingId, setResourceActionLoadingId] = useState("")
  const [resourceActionError, setResourceActionError] = useState("")

  // Navigation
  const [activeSection, setActiveSection] = useState<Section>("about")
  const [contentsOpen, setContentsOpen] = useState(true)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Learn
  const [learnPage, setLearnPage] = useState(0)
  const [consentChecked, setConsentChecked] = useState(false)
  const [learnCompleted, setLearnCompleted] = useState(false)
  const [assessmentCompleted, setAssessmentCompleted] = useState(false)
  const [navGuardMessage, setNavGuardMessage] = useState("")
  const [resumeApplied, setResumeApplied] = useState(false)

  // Assess
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [showResult, setShowResult] = useState(false)
  const [showAlert, setShowAlert] = useState(false)

  // Evaluate
  const [evaluateSubPage, setEvaluateSubPage] = useState<EvaluateSubPage>("resources")

  // Assess
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([])
  const [showResults, setShowResults] = useState(false)
  const [assessmentScore, setAssessmentScore] = useState(0)

  // Evaluate additional state
  const [ratings, setRatings] = useState<number[]>(feedbackCriteria.map(() => 0))
  const [feedbackComment, setFeedbackComment] = useState("")
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackSubmitError, setFeedbackSubmitError] = useState("")
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackStatusNote, setFeedbackStatusNote] = useState("")
  const [isCourseCompletedByApi, setIsCourseCompletedByApi] = useState(false)
  const [isCertificateAvailable, setIsCertificateAvailable] = useState(false)
  
  // Track completed lessons and topics to avoid marking them complete multiple times
  // Use refs instead of state to prevent infinite loops in useEffect
  const completedLessonIdsRef = useRef<Set<number>>(new Set())
  const completedTopicIdsRef = useRef<Set<number>>(new Set())
  // Track the last page we tracked to prevent duplicate API calls
  const lastTrackedPageRef = useRef<number | null>(null)
  // Track which pages are currently being tracked to prevent concurrent calls
  const trackingPagesRef = useRef<Set<number>>(new Set())
  // Store latest lessonSteps in ref to avoid function recreation
  // Initialize with empty array - will be updated when lessonSteps is defined
  const lessonStepsRef = useRef<any[]>([])

  // Fetch course data from API
  useEffect(() => {
    const toRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === "object" ? (value as Record<string, unknown>) : {}
    const toArrayFromRoot = (payload: unknown, keys: string[]) => {
      const root = toRecord(payload)
      const data = toRecord(root.data)
      for (const key of keys) {
        if (Array.isArray(data[key])) return data[key] as unknown[]
        if (Array.isArray(root[key])) return root[key] as unknown[]
      }
      return [] as unknown[]
    }
    const pickString = (value: unknown, fallback = "") =>
      sanitizeApiText(value, fallback)
    const toIdString = (row: Record<string, unknown>) => {
      const possible = [row.id, row.quiz_id, row.assignment_id, row.slug]
      const found = possible.find((v) => typeof v === "string" || typeof v === "number")
      return found !== undefined ? String(found) : ""
    }
    const toStatus = (row: Record<string, unknown>) =>
      pickString(row.status, pickString(row.state, "unknown"))
    const getApiErrorMessage = (error: unknown) => {
      const err = (error && typeof error === "object" ? error : {}) as Record<string, unknown>
      const response = (err.response && typeof err.response === "object"
        ? err.response
        : {}) as Record<string, unknown>
      const data = (response.data && typeof response.data === "object"
        ? response.data
        : {}) as Record<string, unknown>
      const message = data.message
      return typeof message === "string" ? message : ""
    }
    const toResourceArray = (payload: Record<string, unknown>) => {
      const candidates: unknown[] = []
      const directKeys = ["resources", "downloadable_resources", "materials", "files"]
      for (const key of directKeys) {
        if (Array.isArray(payload[key])) candidates.push(...(payload[key] as unknown[]))
      }
      return candidates
    }
    const normalizeResource = (item: unknown, index: number): CourseResourceItem | null => {
      if (typeof item === "string") {
        const title = sanitizeApiText(item, "")
        if (!title) return null
        return {
          id: `resource-${index + 1}`,
          title,
          description: "Course resource",
        }
      }
      const row = toRecord(item)
      const title = pickString(row.title ?? row.name ?? row.label ?? row.file_name, "")
      if (!title) return null
      const description = pickString(row.description ?? row.type ?? row.category ?? row.mime_type, "Course resource")
      const url = pickString(row.url ?? row.link ?? row.download_url ?? row.file, "")
      return {
        id: String(row.id ?? `resource-${index + 1}`),
        title,
        description,
        url: url || undefined,
      }
    }
    const extractCurriculumResources = (curriculumRaw: unknown): CourseResourceItem[] => {
      const curriculum = Array.isArray(curriculumRaw) ? curriculumRaw : []
      const results: CourseResourceItem[] = []
      curriculum.forEach((section, sectionIndex) => {
        const sectionObj = toRecord(section)
        const topics = Array.isArray(sectionObj.topics) ? sectionObj.topics : []
        topics.forEach((topic, topicIndex) => {
          const topicObj = toRecord(topic)
          const topicTitle = pickString(topicObj.title, `Topic ${sectionIndex + 1}.${topicIndex + 1}`)
          const directUrl = pickString(
            topicObj.resource_url
            ?? topicObj.download_url
            ?? topicObj.file_url
            ?? topicObj.url
            ?? topicObj.link
            ?? topicObj.attachment_url
            ?? topicObj.video_url
            ?? topicObj.content_url
            ?? topicObj.lesson_url
            ?? topicObj.pdf_url,
            ""
          )
          if (directUrl) {
            results.push({
              id: `topic-${sectionIndex + 1}-${topicIndex + 1}`,
              title: topicTitle,
              description: "Topic resource",
              url: directUrl,
            })
          }
          const nested = [
            ...(Array.isArray(topicObj.resources) ? topicObj.resources : []),
            ...(Array.isArray(topicObj.materials) ? topicObj.materials : []),
            ...(Array.isArray(topicObj.downloadable_resources) ? topicObj.downloadable_resources : []),
            ...(Array.isArray(topicObj.attachments) ? topicObj.attachments : []),
          ]
          nested.forEach((item, nestedIndex) => {
            const normalized = normalizeResource(item, nestedIndex)
            if (!normalized) return
            results.push({
              ...normalized,
              id: normalized.id || `topic-${sectionIndex + 1}-${topicIndex + 1}-resource-${nestedIndex + 1}`,
              title: normalized.title || topicTitle,
            })
          })
        })
      })
      return results
    }

    const fetchCourse = async () => {
      try {
        setAssessmentMetaLoading(true)
        setAssessmentMetaError("")
        const optionalApiErrors: string[] = []
        const [courseResponse, assessmentsResponse, assignmentsResponse, quizzesResponse, quizStatsResponse, assignmentStatsResponse] = await Promise.all([
          authApi.get(API_PATHS.courses.details, { params: { id: courseId } }),
          assignmentService.courseAssessments(courseId).catch((error) => {
            optionalApiErrors.push(getApiErrorMessage(error))
            return null
          }),
          assignmentService.courseAssignments(courseId).catch((error) => {
            optionalApiErrors.push(getApiErrorMessage(error))
            return null
          }),
          assignmentService.courseQuizzes(courseId).catch((error) => {
            optionalApiErrors.push(getApiErrorMessage(error))
            return null
          }),
          assignmentService.quizStats(courseId).catch((error) => {
            optionalApiErrors.push(getApiErrorMessage(error))
            return null
          }),
          assignmentService.assignmentStats(courseId).catch((error) => {
            optionalApiErrors.push(getApiErrorMessage(error))
            return null
          }),
        ])
        const data = courseResponse.data
        if (data?.success && data?.data) {
          setCourse(data.data)
          setCourseContent(data.data.course ?? {})
          setIsCourseCompletedByApi(Boolean((data.data.course as Record<string, unknown> | undefined)?.is_completed))

          // Fetch assessment questions from API only - no hardcoded fallback
          const assessmentsRoot = (assessmentsResponse && typeof assessmentsResponse === "object" ? assessmentsResponse : {}) as Record<string, unknown>
          const assessmentsData = (assessmentsRoot.data && typeof assessmentsRoot.data === "object"
            ? assessmentsRoot.data
            : assessmentsRoot) as Record<string, unknown>
          const assessmentItems = Array.isArray(assessmentsData.assessments)
            ? assessmentsData.assessments
            : Array.isArray(assessmentsData.items)
              ? assessmentsData.items
              : Array.isArray(assessmentsData.questions)
                ? assessmentsData.questions
                : []
          // Only use questions from API - no hardcoded fallback
          const apiQuestions: AssessmentQuestion[] = (assessmentItems as unknown[])
            .map((item, index) => {
              const q = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
              const options = Array.isArray(q.options)
                ? q.options.map((o) => sanitizeApiText(o, ""))
                : []
              const question = sanitizeApiText(q.question, "")
              if (!question || options.length < 2) return null
              const correctAnswer = typeof q.correct_answer_index === "number"
                ? q.correct_answer_index
                : typeof q.correct_answer === "number"
                  ? q.correct_answer
                  : 0
              return {
                id: typeof q.id === "number" ? q.id : index + 1,
                question,
                options,
                correctAnswer,
                explanation: sanitizeApiText(
                  q.explanation,
                  "Review the course content and retry this question."
                ),
              }
            })
            .filter(Boolean) as AssessmentQuestion[]
          
          // Only set quiz questions if API returns questions - no hardcoded fallback
          setQuizQuestions(apiQuestions)

          const rootResources = toResourceArray(toRecord(data.data))
          const courseResources = toResourceArray(toRecord(data.data.course))
          const curriculumResources = extractCurriculumResources(data.data.curriculum)
          let certificatePreviewUrl = ""
          try {
            const previewPayload = await certificatesService.preview(courseId)
            const previewRoot = toRecord(previewPayload)
            const previewData = toRecord(previewRoot.data)
            certificatePreviewUrl = pickString(
              previewData.preview_url
              ?? previewData.previewUrl
              ?? previewData.certificate_url
              ?? previewData.certificateUrl
              ?? previewData.url
              ?? previewRoot.preview_url
              ?? previewRoot.previewUrl
              ?? previewRoot.certificate_url
              ?? previewRoot.certificateUrl
              ?? previewRoot.url,
              ""
            )
          } catch {
            certificatePreviewUrl = ""
          }

          const rawResources = [...rootResources, ...courseResources]
            .map((item, idx) => normalizeResource(item, idx))
            .filter(Boolean) as CourseResourceItem[]
          const withCurriculum = [...rawResources, ...curriculumResources]
          const deduped = withCurriculum.filter((item, index, arr) =>
            arr.findIndex((x) => x.title === item.title && (x.url ?? "") === (item.url ?? "")) === index
          )
          const apiResources = certificatePreviewUrl
            ? deduped.map((item) =>
                item.url || !item.title.toLowerCase().includes("certificate")
                  ? item
                  : { ...item, url: certificatePreviewUrl }
              )
            : deduped

          if (apiResources.length > 0) {
            setResources(apiResources)
          } else {
            const features = Array.isArray(data.data.course?.features) ? data.data.course.features : []
            const fallbackResources = (features as unknown[])
              .map((feature, idx) => normalizeResource(feature, idx))
              .filter(Boolean) as CourseResourceItem[]
            setResources(fallbackResources)
          }

          const assignmentList = toArrayFromRoot(assignmentsResponse, ["assignments", "items", "results"])
          const quizList = toArrayFromRoot(quizzesResponse, ["quizzes", "items", "results"])

          const mappedAssignments: AssessmentSummaryItem[] = assignmentList.map((item, idx) => {
            const row = toRecord(item)
            const apiId = toIdString(row) || null
            const id = apiId || `assignment-${idx + 1}`
            return {
              id,
              title: pickString(row.title, `Assignment ${idx + 1}`),
              status: toStatus(row),
              apiId,
            }
          })
          const mappedQuizzes: AssessmentSummaryItem[] = quizList.map((item, idx) => {
            const row = toRecord(item)
            const apiId = toIdString(row) || null
            const id = apiId || `quiz-${idx + 1}`
            return {
              id,
              title: pickString(row.title, `Quiz ${idx + 1}`),
              status: toStatus(row),
              apiId,
            }
          })
          setAssignmentItems(mappedAssignments)
          setQuizItems(mappedQuizzes)

          const quizStatsRoot = toRecord(quizStatsResponse)
          const quizStatsData = toRecord(quizStatsRoot.data)
          setQuizStatsSummary({
            total: Number(quizStatsData.total ?? quizStatsRoot.total ?? mappedQuizzes.length ?? 0),
            passed: Number(quizStatsData.passed ?? quizStatsRoot.passed ?? 0),
            attempted: Number(quizStatsData.attempted ?? quizStatsRoot.attempted ?? 0),
          })
          const assignmentStatsRoot = toRecord(assignmentStatsResponse)
          const assignmentStatsData = toRecord(assignmentStatsRoot.data)
          setAssignmentStatsSummary({
            total: Number(assignmentStatsData.total ?? assignmentStatsRoot.total ?? mappedAssignments.length ?? 0),
            completed: Number(assignmentStatsData.completed ?? assignmentStatsRoot.completed ?? 0),
            pending: Number(assignmentStatsData.pending ?? assignmentStatsRoot.pending ?? 0),
          })

          const firstAssignmentId = mappedAssignments[0]?.apiId
          const firstQuizId = mappedQuizzes[0]?.apiId
          if (firstAssignmentId) setSelectedAssignmentId(firstAssignmentId)
          if (firstQuizId) setSelectedQuizId(firstQuizId)
          const detailCalls: Promise<unknown>[] = []
          const detailKeys: Array<"assignment" | "quiz" | "attempts"> = []
          if (firstAssignmentId) {
            detailCalls.push(assignmentService.assignmentDetails(firstAssignmentId))
            detailKeys.push("assignment")
          }
          if (firstQuizId) {
            detailCalls.push(assignmentService.quizDetails(firstQuizId))
            detailKeys.push("quiz")
          }
          if (firstQuizId) {
            detailCalls.push(assignmentService.quizAttempts(firstQuizId))
            detailKeys.push("attempts")
          }
          const detailResponses = detailCalls.length ? await Promise.allSettled(detailCalls) : []
          const detailMap: Record<string, unknown> = {}
          detailResponses.forEach((result, index) => {
            const key = detailKeys[index]
            if (!key) return
            detailMap[key] = result.status === "fulfilled" ? result.value : null
          })

          const assignmentDetailRes = detailMap.assignment
          const quizDetailRes = detailMap.quiz
          const quizAttemptsRes = detailMap.attempts

          const assignmentDetailData = toRecord(toRecord(assignmentDetailRes).data)
          const quizDetailData = toRecord(toRecord(quizDetailRes).data)
          const attempts = toArrayFromRoot(quizAttemptsRes, ["attempts", "items", "results"])

          setAssignmentDetailSummary(
            firstAssignmentId
              ? pickString(assignmentDetailData.title, `Assignment ${firstAssignmentId} loaded from API`)
              : "No assignment details available."
          )
          setQuizDetailSummary(
            firstQuizId
              ? pickString(quizDetailData.title, `Quiz ${firstQuizId} loaded from API`)
              : "No quiz details available."
          )
          setQuizAttemptsSummary(
            firstQuizId ? `${attempts.length} attempt(s) loaded for quiz ${firstQuizId}.` : "No quiz attempts available."
          )
          const filteredErrors = optionalApiErrors.filter((msg) => msg.trim().length > 0)
          if (filteredErrors.length > 0) {
            const hasEnrollmentError = filteredErrors.some((msg) => msg.toLowerCase().includes("not enrolled"))
            setAssessmentMetaError(
              hasEnrollmentError
                ? "Assessment details are locked until enrollment is fully active. Please wait a moment and refresh."
                : "Some assessment details are temporarily unavailable."
            )
          }
          try {
            const feedbackRes = await coursesService.getFeedback(courseId)
            const feedbackRoot = (feedbackRes && typeof feedbackRes === "object" ? feedbackRes : {}) as Record<string, unknown>
            const feedbackData = (feedbackRoot.data && typeof feedbackRoot.data === "object" ? feedbackRoot.data : feedbackRoot) as Record<string, unknown>
            const feedback = (feedbackData.feedback && typeof feedbackData.feedback === "object"
              ? feedbackData.feedback
              : feedbackData) as Record<string, unknown>
            const ratingsObj = (feedback.ratings && typeof feedback.ratings === "object"
              ? feedback.ratings
              : {}) as Record<string, unknown>
            const fromKey = (k: string) => {
              const v = ratingsObj[k]
              return typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : 0)
            }
            const prefill = [
              fromKey("overall"),
              fromKey("content_quality"),
              fromKey("instructor_effectiveness"),
              fromKey("difficulty_level"),
              fromKey("time_commitment"),
              fromKey("materials_quality"),
              fromKey("support"),
              fromKey("relevance"),
            ]
            if (prefill.some((x) => x > 0)) setRatings(prefill)
            const comment = typeof feedback.comment === "string" ? feedback.comment : ""
            if (comment) setFeedbackComment(comment)
          } catch {
            // Ignore if no prior feedback exists for the user/course.
          }

          try {
            const certAvailability = await certificatesService.checkAvailability(courseId)
            const certRoot = (certAvailability && typeof certAvailability === "object" ? certAvailability : {}) as Record<string, unknown>
            const certData = (certRoot.data && typeof certRoot.data === "object" ? certRoot.data : certRoot) as Record<string, unknown>
            setIsCertificateAvailable(Boolean(certData.available))
          } catch {
            setIsCertificateAvailable(false)
          }
        } else {
          setError("Course not found")
        }
      } catch (err) {
        setError("Failed to load course")
        setAssessmentMetaError("Failed to load assignment/quiz data from API.")
      } finally {
        setAssessmentMetaLoading(false)
        setLoading(false)
      }
    }

    if (courseId) {
      fetchCourse()
    }
  }, [courseId])

  useEffect(() => {
    setSelectedAnswers(quizQuestions.map(() => null))
    setShowResults(false)
    setAssessmentScore(0)
    setAssessmentCompleted(false)
  }, [quizQuestions])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [activeSection, learnPage, evaluateSubPage])

  const handleSelectAssignment = async (assignmentId: string) => {
    setInsightActionError("")
    setInsightActionLoading(true)
    setSelectedAssignmentId(assignmentId)
    try {
      const detail = await assignmentService.assignmentDetails(assignmentId)
      const root = (detail && typeof detail === "object" ? detail : {}) as Record<string, unknown>
      const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>
      const title = typeof data.title === "string" && data.title.trim() ? data.title : `Assignment ${assignmentId}`
      setAssignmentDetailSummary(`${title} loaded from API.`)
    } catch {
      setInsightActionError("Unable to load selected assignment details.")
    } finally {
      setInsightActionLoading(false)
    }
  }

  const handleSelectQuiz = async (quizId: string) => {
    setInsightActionError("")
    setInsightActionLoading(true)
    setSelectedQuizId(quizId)
    try {
      const [detail, attemptsRes] = await Promise.all([
        assignmentService.quizDetails(quizId),
        assignmentService.quizAttempts(quizId),
      ])
      const detailRoot = (detail && typeof detail === "object" ? detail : {}) as Record<string, unknown>
      const detailData = (detailRoot.data && typeof detailRoot.data === "object" ? detailRoot.data : detailRoot) as Record<string, unknown>
      const title = typeof detailData.title === "string" && detailData.title.trim() ? detailData.title : `Quiz ${quizId}`
      setQuizDetailSummary(`${title} loaded from API.`)

      const attemptsRoot = (attemptsRes && typeof attemptsRes === "object" ? attemptsRes : {}) as Record<string, unknown>
      const attemptsData = (attemptsRoot.data && typeof attemptsRoot.data === "object" ? attemptsRoot.data : attemptsRoot) as Record<string, unknown>
      const attempts = Array.isArray(attemptsData.attempts)
        ? attemptsData.attempts
        : Array.isArray(attemptsData.items)
          ? attemptsData.items
          : Array.isArray(attemptsRoot.attempts)
            ? attemptsRoot.attempts
            : []
      setQuizAttemptsSummary(`${attempts.length} attempt(s) loaded for quiz ${quizId}.`)
    } catch {
      setInsightActionError("Unable to load selected quiz details/attempts.")
    } finally {
      setInsightActionLoading(false)
    }
  }

  // ─── Helpers ────────────────────────────────────

  const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  const courseDescription =
    stripHtml(String(courseContent?.description ?? ""))
    || sanitizeApiText(courseContent?.curriculum_overview, "")
    || sanitizeApiText(courseContent?.excerpt, "")
  const curriculumSections = Array.isArray(course?.curriculum) ? course.curriculum : []
  const lessonSteps = useMemo<LessonStep[]>(() => (
    curriculumSections.map((section: any, index: number) => {
      const title = sanitizeApiText(section?.title, `Lesson ${index + 1}`)
      const description = sanitizeApiText(section?.description, "")
      const videoUrl = extractVideoUrl(section?.html_content)
      const topics = Array.isArray(section?.topics)
        ? section.topics.map((t: any) => ({
            id: t?.id !== undefined ? String(t.id) : undefined,
            title: sanitizeApiText(t?.title, ""),
            duration: sanitizeApiText(t?.duration, "Not specified"),
          })).filter((t) => t.title)
        : []
      return {
        id: String(section?.id ?? `lesson-${index + 1}`),
        title,
        description,
        videoUrl,
        topics,
      }
    })
  ), [curriculumSections])

  // Update lessonStepsRef whenever lessonSteps changes
  useEffect(() => {
    lessonStepsRef.current = lessonSteps
  }, [lessonSteps])

  // Helper to extract numeric ID from string or number (used in multiple places)
  const extractNumericId = useCallback((id: string | number | undefined): number | undefined => {
    if (id === undefined || id === null) return undefined
    if (typeof id === 'number' && !isNaN(id)) return id
    if (typeof id === 'string') {
      // Try to extract number from strings like "lesson-1" or "123"
      const numMatch = id.match(/\d+/)
      if (numMatch) {
        const num = Number(numMatch[0])
        return !isNaN(num) ? num : undefined
      }
      // Try direct conversion
      const num = Number(id)
      return !isNaN(num) ? num : undefined
    }
    return undefined
  }, [])

  // Fire-and-forget progress tracking helper - tracks on every step
  // Made stable by using refs for all dependencies - only depends on courseId and extractNumericId
  const trackCourseProgress = useCallback(async (stepIndex: number, progressPercentage: number, completed = false, watchedSeconds?: number) => {
    // Validate inputs - require at least courseId and valid stepIndex
    if (!courseId || !stepIndex || stepIndex < 1) {
      console.log('[Track] Skipping - invalid inputs:', { courseId, stepIndex })
      return
    }

    // Prevent concurrent tracking calls for the same step
    if (trackingPagesRef.current.has(stepIndex)) {
      console.log('[Track] Already tracking this step, skipping duplicate call:', stepIndex)
      return
    }

    trackingPagesRef.current.add(stepIndex)

    try {
      // Use ref to get latest lessonSteps without making this function depend on it
      const lessonStep = lessonStepsRef.current[stepIndex - 1]
      // Allow tracking even if lessonStep doesn't exist (for overview page, etc.)

      const lessonId = lessonStep ? extractNumericId(lessonStep.id) : undefined
      const topicId = lessonStep?.topics && lessonStep.topics.length > 0 
        ? extractNumericId(lessonStep.topics[0].id)
        : undefined
      
      // Build payload - always include step_index and progress_percentage
      const payload: Record<string, unknown> = {
        step_index: stepIndex,
        progress_percentage: Math.max(0, Math.min(100, progressPercentage ?? 0)),
        completed: completed ?? false,
      }

      // Only add lesson_id if we have a valid numeric ID
      if (lessonId !== undefined && lessonId !== null && !isNaN(lessonId) && lessonId > 0) {
        payload.lesson_id = lessonId
      }

      // Only add topic_id if we have a valid numeric ID
      if (topicId !== undefined && topicId !== null && !isNaN(topicId) && topicId > 0) {
        payload.topic_id = topicId
      }

      if (watchedSeconds !== undefined && watchedSeconds !== null && watchedSeconds >= 0) {
        payload.watched_seconds = Math.round(watchedSeconds)
      }
      
      // Always call track API - even if lesson_id/topic_id are missing, step_index is required
      console.log('[Track] Calling trackProgress API:', { courseId, payload })
      await coursesService.trackProgress(courseId, payload as any)
      console.log('[Track] Successfully tracked progress')
      
      // Mark lesson complete ONLY ONCE per lesson (if we have valid ID and haven't marked it before)
      if (lessonId && lessonStep && !completedLessonIdsRef.current.has(lessonId)) {
        try {
          console.log('[Track] Marking lesson complete (first time):', { courseId, lessonId })
          await coursesService.markLessonComplete(courseId, lessonId)
          completedLessonIdsRef.current.add(lessonId)
          console.log('[Track] Successfully marked lesson complete')
        } catch (error) {
          console.error('[Track] Failed to mark lesson complete:', error)
        }
      } else if (lessonId && completedLessonIdsRef.current.has(lessonId)) {
        console.log('[Track] Skipping lesson complete - already marked:', { courseId, lessonId })
      }
      
      // Mark topics complete ONLY ONCE per topic (if we have valid IDs and haven't marked them before)
      if (lessonStep?.topics && lessonStep.topics.length > 0) {
        const topicPromises = lessonStep.topics
          .filter(topic => topic.id)
          .map(async (topic) => {
            const topicIdNum = extractNumericId(topic.id)
            if (topicIdNum && !completedTopicIdsRef.current.has(topicIdNum)) {
              try {
                console.log('[Track] Marking topic complete (first time):', { courseId, topicId: topicIdNum })
                await coursesService.markTopicComplete(courseId, topicIdNum)
                completedTopicIdsRef.current.add(topicIdNum)
                console.log('[Track] Successfully marked topic complete')
              } catch (error) {
                console.error('[Track] Failed to mark topic complete:', error)
              }
            } else if (topicIdNum && completedTopicIdsRef.current.has(topicIdNum)) {
              console.log('[Track] Skipping topic complete - already marked:', { courseId, topicId: topicIdNum })
            }
          })
        
        await Promise.all(topicPromises)
      }
    } catch (error) {
      console.error('Failed to track course progress:', error)
    } finally {
      trackingPagesRef.current.delete(stepIndex)
    }
  }, [courseId, extractNumericId]) // Removed lessonSteps - now using ref

  const objectives = Array.isArray(courseContent?.learning_objectives) ? courseContent.learning_objectives : []
  const features = Array.isArray(courseContent?.features) ? courseContent.features : []
  const topics = lessonSteps.flatMap((step) => step.topics.map((t) => t.title))
  const categories = Array.isArray(courseContent?.categories) ? courseContent.categories.map((c: any) => String(c?.name ?? "")) : []

  const courseDetails = useMemo(() => ({
    cpdHours: Number(courseContent?.cpd_points ?? 0),
    category: categories[0] || "General",
    level: String(courseContent?.difficulty ?? "Not specified"),
    aims: objectives.length ? objectives : [courseDescription || "No aims provided by API."],
    objectives: objectives.length ? objectives : ["No objectives provided by API."],
    learningOutcomes: objectives.length ? objectives : ["No learning outcomes provided by API."],
    gdcOutcomes: categories.length ? categories.map((c: string) => `Category: ${c}`) : ["No GDC outcomes provided by API."],
    topics: topics.filter(Boolean).length ? Array.from(new Set(topics.filter(Boolean))) : ["No topics provided by API."],
  }), [courseContent, objectives, categories, courseDescription, topics])

  const learnPages = useMemo(() => ([
    {
      title: "Course Overview",
      content: (
        <div className="space-y-4 text-gray-700 leading-relaxed text-sm sm:text-base">
          <p>{courseDescription || "Overview will be available soon."}</p>
          {courseDetails.objectives.length > 0 && (
            <div>
              <p className="font-semibold text-gray-900 mb-2">Learning Objectives</p>
              <ol className="space-y-1">
                {courseDetails.objectives.map((item: string, i: number) => (
                  <li key={i}>{i + 1}. {item}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ),
    },
    ...lessonSteps.map((step, idx) => ({
      title: `Step ${idx + 1}: ${step.title}`,
      content: (
        <div className="space-y-4">
          {step.videoUrl ? (
            <div className="aspect-video overflow-hidden rounded-lg border border-gray-200 bg-black">
              <ReactPlayer src={step.videoUrl} controls width="100%" height="100%" style={{ maxWidth: "100%" }} />
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              No video URL returned by API for this lesson.
            </div>
          )}
          {step.description && <p className="text-sm sm:text-base text-gray-700">{step.description}</p>}
          <div>
            <p className="font-semibold text-gray-900 mb-2">Topics</p>
            {step.topics.length > 0 ? (
              <div className="space-y-2">
                {step.topics.map((topic, i) => (
                  <div
                    key={`${step.id}-topic-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm sm:text-base text-gray-700 truncate">{topic.title}</span>
                    </div>
                    <span className="text-[11px] sm:text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full shrink-0">
                      {topic.duration}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No topics returned for this lesson.</p>
            )}
          </div>
        </div>
      ),
    })),
    {
      title: "Course Resources",
      content: (
        <ol className="space-y-2 text-sm sm:text-base text-gray-700">
          {(resources.length ? resources : [{ title: "No resources available" }]).map((item, i) => (
            <li key={i}>{i + 1}. {item.title}</li>
          ))}
        </ol>
      ),
    },
    {
      title: "Consent and Declaration",
      content: "consent",
    },
  ]), [courseDescription, courseDetails.objectives, lessonSteps, resources])

  // Track progress on every step change (learnPage change)
  // Only track when learnPage or activeSection actually changes, not when functions change
  useEffect(() => {
    // Only track in learn section with valid page
    if (activeSection !== "learn" || learnPage <= 0 || learnPages.length === 0) {
      return
    }

    // Prevent duplicate tracking for the same page
    if (lastTrackedPageRef.current === learnPage) {
      console.log('[Track] Skipping duplicate tracking for page:', learnPage)
      return
    }

    // Mark this page as tracked immediately to prevent race conditions
    lastTrackedPageRef.current = learnPage

    // Calculate progress based on completed steps and current position
    const actualLessonSteps = learnPages.length - 1 // Exclude overview page
    const currentLessonIndex = learnPage - 1 // Convert to 0-based index
    const progressPct = actualLessonSteps > 0 
      ? Math.round((currentLessonIndex / actualLessonSteps) * 100)
      : 0

    console.log('[Track] useEffect triggered - tracking progress:', { 
      learnPage, 
      progressPct, 
      activeSection,
      currentLessonIndex,
      actualLessonSteps,
      completedLessons: completedLessonIdsRef.current.size
    })

    // Call tracking function directly - it's stable and uses refs internally
    void trackCourseProgress(learnPage, progressPct, false, 0)
  }, [learnPage, activeSection]) // Only depend on actual state changes, not functions

  useEffect(() => {
    if (!resumeLessonParam || resumeApplied || lessonSteps.length === 0) return
    const target = resumeLessonParam.toLowerCase()
    const stepIndex = lessonSteps.findIndex((step) => {
      const title = sanitizeApiText(step.title, "").toLowerCase()
      return title === target || title.includes(target) || target.includes(title)
    })
    if (stepIndex >= 0) {
      setActiveSection("learn")
      // learnPages[0] is Course Overview, so lessons start at index 1
      setLearnPage(stepIndex + 1)
      setNavGuardMessage("")
    }
    setResumeApplied(true)
  }, [resumeLessonParam, resumeApplied, lessonSteps])

  const sectionItems: { key: Section; label: string; number: number }[] = [
    { key: "about", label: "About", number: 1 },
    { key: "learn", label: "Learn", number: 2 },
    { key: "assess", label: "Assess", number: 3 },
    { key: "evaluate", label: "Evaluate", number: 4 },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || "Course not found"}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-purple-600 hover:text-purple-700 underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const handleCheckAnswers = () => {
    const unanswered = selectedAnswers.filter((a) => a === null).length
    if (unanswered > 0) return
    let correct = 0
    quizQuestions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctAnswer) correct++
    })
    const isPassed = quizQuestions.length > 0 ? (correct / quizQuestions.length) * 100 >= 80 : false
    setAssessmentScore(correct)
    setShowResults(true)
    setAssessmentCompleted(isPassed)
  }

  const handleRetry = () => {
    setSelectedAnswers(quizQuestions.map(() => null))
    setShowResults(false)
    setAssessmentScore(0)
    setAssessmentCompleted(false)
  }

  const passed = quizQuestions.length > 0 ? (assessmentScore / quizQuestions.length) * 100 >= 80 : false
  const scorePercent = quizQuestions.length > 0 ? ((assessmentScore / quizQuestions.length) * 100).toFixed(1) : "0.0"

  const handleSectionNavigation = (target: Section) => {
    setNavGuardMessage("")

    if (target === "about" || target === "learn") {
      setActiveSection(target)
      return
    }

    if (target === "assess" && !learnCompleted) {
      setNavGuardMessage("Complete all Learn steps and confirm declaration before opening Assess.")
      return
    }

    if (target === "evaluate" && !assessmentCompleted) {
      setNavGuardMessage("Pass the assessment before opening Evaluate.")
      return
    }

    // Track progress when navigating between sections
    if (target === "assess" && learnCompleted && lessonSteps.length > 0) {
      // Track completion of learn section - use the last lesson step
      const lastStepIndex = lessonSteps.length
      trackCourseProgress(lastStepIndex, 100, true)
    } else if (target === "evaluate" && assessmentCompleted && lessonSteps.length > 0) {
      // Track completion of assess section - use the last lesson step
      const lastStepIndex = lessonSteps.length
      const assessProgressPct = 100; // Assessment completed
      trackCourseProgress(lastStepIndex, assessProgressPct, true)
    } else if (target === "learn" && learnPage > 0 && learnPage <= lessonSteps.length) {
      // Track current learn progress when returning to learn
      const progressPct = Math.round((learnPage / learnPages.length) * 100)
      trackCourseProgress(learnPage, progressPct)
    }

    setActiveSection(target)
    if (target === "evaluate") setEvaluateSubPage("resources")
  }

  const refreshCompletionStatus = async (): Promise<{ completed: boolean; certificateAvailable: boolean }> => {
    const courseRes = await authApi.get(API_PATHS.courses.details, { params: { id: courseId } })
    const courseRoot = (courseRes.data && typeof courseRes.data === "object" ? courseRes.data : {}) as Record<string, unknown>
    const courseData = (courseRoot.data && typeof courseRoot.data === "object" ? courseRoot.data : {}) as Record<string, unknown>
    const courseObj = (courseData.course && typeof courseData.course === "object" ? courseData.course : {}) as Record<string, unknown>
    const completed = Boolean(courseObj.is_completed)

    let certificateAvailable = false
    try {
      const certAvailability = await certificatesService.checkAvailability(courseId)
      const certRoot = (certAvailability && typeof certAvailability === "object" ? certAvailability : {}) as Record<string, unknown>
      const certData = (certRoot.data && typeof certRoot.data === "object" ? certRoot.data : certRoot) as Record<string, unknown>
      certificateAvailable = Boolean(certData.available)
    } catch {
      certificateAvailable = false
    }

    setCourse((prev) => (prev ? ({ ...prev, course: { ...(prev.course ?? {}), is_completed: completed } }) : prev))
    setIsCourseCompletedByApi(completed)
    setIsCertificateAvailable(certificateAvailable)
    return { completed, certificateAvailable }
  }

  const handleSubmitFeedback = async () => {
    setFeedbackSubmitError("")
    setFeedbackSubmitted(false)
    setFeedbackStatusNote("")

    const hasUnratedItems = ratings.some((rating) => rating <= 0)
    if (hasUnratedItems) {
      setFeedbackSubmitError("Please rate all feedback criteria before submitting.")
      return
    }

    setIsSubmittingFeedback(true)
    try {
      await coursesService.saveFeedback(courseId, {
        ratings: {
          overall: ratings[0] ?? 0,
          content_quality: ratings[1] ?? 0,
          instructor_effectiveness: ratings[2] ?? 0,
          difficulty_level: ratings[3] ?? 0,
          time_commitment: ratings[4] ?? 0,
          materials_quality: ratings[5] ?? 0,
          support: ratings[6] ?? 0,
          relevance: ratings[7] ?? 0,
        },
        comment: feedbackComment.trim() || "",
      })

      setFeedbackSubmitted(true)
      const status = await refreshCompletionStatus()
      if (status.completed) {
        setEvaluateSubPage("completed")
      } else {
        setFeedbackStatusNote(
          "Feedback submitted, but backend still shows this course as not completed. " +
          "Certificate will be available only after API marks completion."
        )
      }
    } catch {
      setFeedbackSubmitError("Unable to submit feedback right now. Please try again.")
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const handleOpenResource = (resource: CourseResourceItem) => {
    setResourceActionError("")
    if (!resource.url) return
    setResourceActionLoadingId(resource.id)
    try {
      window.open(resource.url, "_blank", "noopener,noreferrer")
    } finally {
      setResourceActionLoadingId("")
    }
  }


  // ─── Sidebar ───────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Back */}
      <button
        onClick={() => router.push("/courses")}
        className="flex items-center gap-2 text-gray-700 hover:text-purple-700 transition-colors px-4 py-4 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Courses
      </button>

      {/* Contents */}
      <div className="px-4">
        <button
          onClick={() => setContentsOpen(!contentsOpen)}
          className="flex items-center justify-between w-full py-3 text-sm font-bold text-gray-900"
        >
          Contents
          {contentsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {contentsOpen && (
          <div className="space-y-1 pb-4">
            {sectionItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleSectionNavigation(item.key)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeSection === item.key
                    ? "bg-purple-50 text-purple-700 font-medium"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    activeSection === item.key
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {item.number}
                </span>
                {item.label}
              </button>
            ))}
            {navGuardMessage && (
              <p className="px-1 pt-1 text-xs text-amber-700">{navGuardMessage}</p>
            )}
          </div>
        )}
      </div>

      {/* Resources */}
      <div className="px-4 border-t border-gray-200">
          <button 
          onClick={() => setResourcesOpen(!resourcesOpen)}
          className="flex items-center justify-between w-full py-3 text-sm font-bold text-gray-900"
          >
          Resources
          {resourcesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        {resourcesOpen && (
          <div className="space-y-3 pb-4">
            {resources.map((r, i) => (
              <button
                key={r.id || i}
                type="button"
                onClick={() => handleOpenResource(r)}
                disabled={!r.url}
                className={`flex items-start gap-2 text-left text-sm transition-colors ${
                  r.url ? "text-purple-600 hover:text-purple-800" : "text-gray-500 disabled:cursor-not-allowed"
                }`}
              >
                <Link2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="leading-tight">{i + 1}. {r.title}</span>
              </button>
            ))}
            {resourceActionError && (
              <p className="text-xs text-red-600">{resourceActionError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // ─── Main content ───────────────────────────────

  const renderAbout = () => (
    <div>
      <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
        {course.title}
      </h1>
      <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
        <span className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
          {courseDetails.cpdHours} CPD Hours
        </span>
        <span className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-full">
          {courseDetails.category}
        </span>
        <span className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-full">
          {courseDetails.level}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-8 space-y-6 sm:space-y-8">
        <h2 className="text-purple-600 font-semibold text-base sm:text-lg">Course Details</h2>

        {/* Aims */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">Aims</h3>
          </div>
          <ul className="space-y-2 ml-1">
            {courseDetails.aims.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        {/* Objectives */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">Objectives</h3>
          </div>
          <ul className="space-y-2 ml-1">
            {courseDetails.objectives.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                {o}
              </li>
            ))}
          </ul>
        </div>

        {/* Learning Outcomes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">Learning Outcomes</h3>
          </div>
          <ul className="space-y-2 ml-1">
            {courseDetails.learningOutcomes.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                {l}
              </li>
            ))}
          </ul>
        </div>

        {/* GDC Development Outcomes */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">GDC Development Outcomes</h3>
          <ul className="space-y-2 ml-1">
            {courseDetails.gdcOutcomes.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                {g}
              </li>
            ))}
          </ul>
                </div>

        {/* Topics Covered */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">Topics Covered</h3>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {courseDetails.topics.map((t, i) => (
              <li key={i} className="text-sm text-gray-700">{i + 1}. {t}</li>
            ))}
          </ol>
        </div>
          </div>

      {/* Start Course Button */}
      <div className="flex justify-end mt-6">
              <button 
          onClick={() => {
            setActiveSection("learn")
            setLearnPage(0)
          }}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
        >
          Start Course
          <ArrowRight className="w-4 h-4" />
              </button>
      </div>
    </div>
  )

  const renderLearn = () => {
    const page = learnPages[learnPage]
    const isConsent = page.content === "consent"
    const isLastPage = learnPage === learnPages.length - 1

    return (
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{page.title}</h1>
          <span className="text-xs sm:text-sm text-gray-500 border border-gray-300 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0">
            Page {learnPage + 1} of {learnPages.length}
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-8">
          {isConsent ? (
            /* Consent & Declaration */
            <div className="space-y-4">
              <p className="text-gray-700 text-sm sm:text-base">
                Before proceeding to the assessment, please confirm that you have:
              </p>
              <ul className="space-y-2 ml-4">
                {[
                  "Completed all learning materials",
                  "Understood the key concepts and procedures",
                  "Reviewed the emergency protocols",
                  "Are ready to demonstrate your knowledge in the assessment",
                ].map((item, i) => (
                  <li key={i} className="text-gray-700 text-sm sm:text-base">{item}</li>
                ))}
              </ul>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700 text-sm">
                  By clicking the checkbox below and proceeding, you confirm that you have engaged with all course content and
                  are ready to complete the assessment.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                  />
                  <span className="text-gray-700 text-sm sm:text-base">
                    I confirm that I have completed all learning materials and am ready to proceed to the assessment
                  </span>
                </label>
              </div>
            </div>
          ) : (
            page.content as React.ReactNode
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 sm:mt-6 gap-3">
          <button
            onClick={() => {
              if (learnPage > 0) setLearnPage(learnPage - 1)
              else setActiveSection("about")
            }}
            className="px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Previous
          </button>

          {isLastPage ? (
                <button
              onClick={() => {
                if (consentChecked) {
                  // Track completion using the last lesson step index
                  if (lessonSteps.length > 0) {
                    trackCourseProgress(lessonSteps.length, 100, true)
                  }
                  setLearnCompleted(true)
                  setActiveSection("assess")
                  setShowResults(false)
                  setSelectedAnswers(quizQuestions.map(() => null))
                  setNavGuardMessage("")
                }
              }}
              disabled={!consentChecked}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-semibold flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-colors ${
                consentChecked
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span className="hidden sm:inline">Proceed to Assessment</span>
              <span className="sm:hidden">Assessment</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                const nextPage = learnPage + 1
                const progressPct = Math.round((nextPage / learnPages.length) * 100)
                // Only track if nextPage is within valid lesson steps range
                if (nextPage <= lessonSteps.length) {
                  trackCourseProgress(nextPage, progressPct)
                }
                setLearnPage(nextPage)
              }}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderAssess = () => {
    if (showResults) return renderAssessResults()
    if (quizQuestions.length === 0) {
      return (
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">Assessment</h1>
          <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">No assessment questions available from API yet.</p>
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-8">
            <p className="text-sm text-gray-700">You can continue to resources and feedback.</p>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setActiveSection("evaluate")}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )
    }
    const allAnswered = selectedAnswers.every((a) => a !== null)
    const hasAssignmentDetail = Boolean(
      assignmentDetailSummary && assignmentDetailSummary !== "No assignment details available."
    )
    const hasQuizDetail = Boolean(
      quizDetailSummary && quizDetailSummary !== "No quiz details available."
    )
    const hasQuizAttemptsDetail = Boolean(
      quizAttemptsSummary && quizAttemptsSummary !== "No quiz attempts available."
    )

    return (
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">Assessment</h1>
        <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">Answer all questions to complete this section</p>
        <div className="mb-4 sm:mb-6 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Assessment Insights</h2>
          {assessmentMetaLoading && <p className="text-xs sm:text-sm text-gray-500">Loading assignments and quizzes...</p>}
          {assessmentMetaError && <p className="text-xs sm:text-sm text-red-600">{assessmentMetaError}</p>}
          {!assessmentMetaLoading && !assessmentMetaError && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Quiz Attempts</p>
                  <p className="text-sm font-semibold text-gray-900">{quizStatsSummary.attempted} / {quizStatsSummary.total}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Quiz Passed</p>
                  <p className="text-sm font-semibold text-gray-900">{quizStatsSummary.passed}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Assignments Completed</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {assignmentStatsSummary.completed} / {assignmentStatsSummary.total}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Assignments Pending</p>
                  <p className="text-sm font-semibold text-gray-900">{assignmentStatsSummary.pending}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-700">Assignments ({assignmentItems.length})</p>
                  <div className="space-y-1">
                    {assignmentItems.length === 0 && (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                        No assignments found from API.
                      </div>
                    )}
                    {assignmentItems.map((item) => (
                      <button
                        key={item.id}
                        disabled={!item.apiId}
                        onClick={() => item.apiId && handleSelectAssignment(item.apiId)}
                        className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                          selectedAssignmentId === item.apiId
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gray-200 text-gray-700 hover:border-purple-300"
                        } ${!item.apiId ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <div className="font-medium">{item.title}</div>
                        <div className="text-[11px] text-gray-500">Status: {item.status}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-700">Quizzes ({quizItems.length})</p>
                  <div className="space-y-1">
                    {quizItems.length === 0 && (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                        No quizzes found from API.
                      </div>
                    )}
                    {quizItems.map((item) => (
                      <button
                        key={item.id}
                        disabled={!item.apiId}
                        onClick={() => item.apiId && handleSelectQuiz(item.apiId)}
                        className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                          selectedQuizId === item.apiId
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gray-200 text-gray-700 hover:border-purple-300"
                        } ${!item.apiId ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <div className="font-medium">{item.title}</div>
                        <div className="text-[11px] text-gray-500">Status: {item.status}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(hasAssignmentDetail || hasQuizDetail || hasQuizAttemptsDetail || insightActionLoading || insightActionError) && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs sm:text-sm text-gray-700 space-y-1">
                  {hasAssignmentDetail && <p>{assignmentDetailSummary}</p>}
                  {hasQuizDetail && <p>{quizDetailSummary}</p>}
                  {hasQuizAttemptsDetail && <p>{quizAttemptsSummary}</p>}
                  {insightActionLoading && <p className="text-xs text-gray-500">Loading selected item details...</p>}
                  {insightActionError && <p className="text-xs text-red-600">{insightActionError}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6 sm:space-y-8">
          {quizQuestions.map((q, qi) => (
            <div key={q.id}>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
                <span className="font-bold">{qi + 1}</span> {q.question}
              </h3>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button 
                    key={oi}
                    onClick={() => {
                      const copy = [...selectedAnswers]
                      copy[qi] = oi
                      setSelectedAnswers(copy)
                    }}
                    className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border text-xs sm:text-sm transition-colors ${
                      selectedAnswers[qi] === oi
                        ? "border-purple-600 bg-purple-50 text-purple-700 font-medium"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!allAnswered && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-amber-700 text-sm">Please answer all questions before submitting your assessment.</p>
          </div>
        )}

        <div className="flex justify-end mt-6">
                        <button
            onClick={handleCheckAnswers}
            disabled={!allAnswered}
            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-colors ${
              allAnswered
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Check Your Answers
          </button>
        </div>
      </div>
    )
  }

  const renderAssessResults = () => {
    const pct = parseFloat(scorePercent)
    const circumference = 2 * Math.PI * 45
    const strokeDashoffset = circumference - (pct / 100) * circumference

    return (
      <div>
        {/* Score Circle */}
        <div className="text-center mb-6">
          <div className="inline-block relative">
            <svg className="w-28 h-28" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="#e5e7eb" strokeWidth="6" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke={passed ? "#22c55e" : "#ef4444"}
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
                className="transition-all duration-700"
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${passed ? "text-green-600" : "text-red-600"}`}>
              {scorePercent}%
            </span>
          </div>
          <h2 className={`text-xl font-bold mt-3 ${passed ? "text-green-700" : "text-red-700"}`}>
            {passed ? "Congratulations!" : "Assessment Not Passed"}
          </h2>
          <p className={`text-sm mt-1 ${passed ? "text-green-600" : "text-red-600"}`}>
            {passed
              ? "You have successfully passed this assessment"
              : "You need 80% to pass. Please review the material and try again."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mb-8">
          {passed ? (
            <button
              onClick={() => {
                setActiveSection("evaluate")
                setEvaluateSubPage("resources")
              }}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setActiveSection("learn")
                  setLearnPage(0)
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                Review Content
              </button>
              <button
                onClick={handleRetry}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors text-sm"
              >
                Retry Assessment
                        </button>
            </>
          )}
                    </div>

        {/* Answer Review */}
        <h3 className="text-purple-600 font-semibold text-lg mb-4">Answer Review</h3>
        <div className="space-y-6">
          {quizQuestions.map((q, qi) => {
            const userAnswer = selectedAnswers[qi]
            const isCorrect = userAnswer === q.correctAnswer

            return (
              <div key={q.id} className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-5">
                <div className="flex items-start gap-2 mb-3">
                  {isCorrect ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <h4 className="font-semibold text-gray-900 text-xs sm:text-base">
                    Q{qi + 1} {q.question}
                  </h4>
                </div>

                <div className="space-y-2 mb-3">
                  {q.options.map((opt, oi) => {
                    const isCorrectOpt = oi === q.correctAnswer
                    const isUserOpt = oi === userAnswer
                    let classes = "border-gray-200 bg-white"
                    if (isCorrectOpt) classes = "border-green-300 bg-green-50"
                    else if (isUserOpt && !isCorrect) classes = "border-red-300 bg-red-50"

                    return (
                      <div key={oi} className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 ${classes}`}>
                        <span className="text-gray-900">{opt}</span>
                        <div className="flex gap-2 flex-shrink-0">
                          {isUserOpt && !isCorrect && (
                            <span className="text-[10px] sm:text-xs font-medium text-red-600 bg-red-100 px-1.5 sm:px-2 py-0.5 rounded-full">Your Answer</span>
                          )}
                          {isCorrectOpt && (
                            <span className="text-[10px] sm:text-xs font-medium text-green-700 bg-green-100 px-1.5 sm:px-2 py-0.5 rounded-full">Correct</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="text-sm">
                  <span className="font-semibold text-red-600">Explanation:</span>
                  <p className="text-gray-600 mt-1">{q.explanation}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderEvaluate = () => {
    if (evaluateSubPage === "resources") return renderResources()
    if (evaluateSubPage === "feedback") return renderFeedback()
    return renderCompleted()
  }

  const renderResources = () => (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">Resources</h1>
      <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">Additional resources and further reading</p>

      <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-6 space-y-2 sm:space-y-3">
        {resources.map((r, i) => (
          <button
            key={r.id || i}
            type="button"
            onClick={() => handleOpenResource(r)}
            disabled={!r.url}
            className={`w-full flex items-center justify-between p-3 sm:p-4 border rounded-lg sm:rounded-xl transition-colors group ${
              r.url
                ? "border-gray-200 hover:border-purple-300 hover:bg-purple-50/30"
                : "border-gray-200 bg-gray-50 cursor-not-allowed"
            }`}
          >
            <div className="flex items-start gap-3 text-left">
              <Link2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${r.url ? "text-purple-600" : "text-gray-400"}`} />
              <div>
                <h3 className={`font-semibold text-sm sm:text-base transition-colors ${r.url ? "text-gray-900 group-hover:text-purple-700" : "text-gray-700"}`}>
                  {i + 1}. {r.title}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{r.description}</p>
              </div>
            </div>
            <span className={`text-xs sm:text-sm font-medium ${r.url ? "text-purple-600" : "text-gray-400"}`}>
              {resourceActionLoadingId === r.id ? "Opening..." : r.url ? "Open" : "No link"}
            </span>
          </button>
        ))}
        {resourceActionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700">
            {resourceActionError}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={() => setEvaluateSubPage("feedback")}
          className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  const renderFeedback = () => (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">Feedback</h1>
      <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">Please rate your experience with this course</p>

      <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-8 space-y-5 sm:space-y-6">
        {feedbackCriteria.map((criteria, ci) => (
          <div key={ci}>
            <p className="text-gray-700 text-sm mb-2">{criteria}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => {
                    const copy = [...ratings]
                    copy[ci] = star
                    setRatings(copy)
                  }}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 sm:w-8 sm:h-8 ${
                      star <= ratings[ci] ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="text-gray-700 text-sm mb-2">Additional Comments (Optional)</p>
          <textarea
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Share any additional feedback or suggestions..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
          />
            </div>
        {feedbackSubmitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700">
            {feedbackSubmitError}
          </div>
        )}
        {feedbackSubmitted && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs sm:text-sm text-green-700">
            Feedback submitted successfully.
          </div>
        )}
        {feedbackStatusNote && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs sm:text-sm text-amber-700">
            {feedbackStatusNote}
          </div>
        )}
          </div>

      <div className="flex items-center justify-between mt-4 sm:mt-6 gap-3">
        <button
          onClick={() => setEvaluateSubPage("resources")}
          className="px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Previous
        </button>
        <button
          onClick={handleSubmitFeedback}
          disabled={isSubmittingFeedback}
          className="px-3 sm:px-5 py-2 sm:py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
        >
          {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
      </div>
    </div>
  )

  const renderCompleted = () => (
    <div>
      {/* Course Completed Banner */}
      <div className={`${isCourseCompletedByApi ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"} border rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6`}>
        <div className="flex items-start gap-2 sm:gap-3">
          <CheckCircle className={`w-5 h-5 sm:w-6 sm:h-6 ${isCourseCompletedByApi ? "text-green-600" : "text-amber-600"} flex-shrink-0 mt-0.5`} />
          <div>
            <h2 className={`text-base sm:text-lg font-bold ${isCourseCompletedByApi ? "text-green-800" : "text-amber-800"}`}>
              {isCourseCompletedByApi ? "Course Completed!" : "Completion Pending in API"}
            </h2>
            <p className={`${isCourseCompletedByApi ? "text-green-700" : "text-amber-700"} text-xs sm:text-sm`}>
              {isCourseCompletedByApi
                ? "Congratulations on completing this CPD course"
                : "You passed in UI, but backend has not finalized completion yet."}
            </p>
            {!isCertificateAvailable && (
              <p className="text-xs sm:text-sm text-amber-700 mt-1">
                Certificate is not available yet according to API.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-purple-600 font-semibold text-sm sm:text-base mb-3">Next Steps</h3>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 mb-4">
          <p className="text-purple-700 text-xs sm:text-sm">
            Add a reflection to your training to receive your CPD certificate and log these hours to your CPD record.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <button
            onClick={async () => {
              try {
                if (navigator.share) {
                  await navigator.share({
                    title: `CPD Course Completed - ${course.title}`,
                    text: `I have successfully completed the ${course.title} course and earned ${courseDetails.cpdHours} CPD hours!`,
                    url: window.location.href,
                  })
                } else {
                  await navigator.clipboard.writeText(window.location.href)
                  alert("Link copied to clipboard!")
                }
              } catch (err) {
                console.log("Share cancelled", err)
              }
            }}
            className="px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <Award className="w-4 h-4" />
            Share Achievement
                  </button>
          <button
            onClick={() => router.push(`/course/${courseId}/reflection`)}
            className="px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <FileText className="w-4 h-4" />
            Add Reflection
          </button>
                              </div>
                          </div>

      {/* Course Summary */}
      <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-purple-600 font-semibold text-sm sm:text-base mb-3 sm:mb-4">Course Summary</h3>
        <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-3">What You Learned</h4>
        <ul className="space-y-2 mb-6">
          {courseDetails.learningOutcomes.slice(0, 3).map((l, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              {l}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="border border-green-200 bg-green-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <p className="text-green-600 text-[10px] sm:text-xs font-medium flex items-center gap-1 mb-1">
              <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> CPD Hours
            </p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{courseDetails.cpdHours}</p>
                        </div>
          <div className="border border-green-200 bg-green-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <p className="text-green-600 text-[10px] sm:text-xs font-medium flex items-center gap-1 mb-1">
              <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Score
            </p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{scorePercent}%</p>
                    </div>
                </div>
            </div>

    </div>
  )

  // ─── Layout ─────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
        <button
              onClick={() => router.push('/course-detail?id=' + courseId)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
        >
              <ArrowLeft size={16} />
              <span>Back to Course</span>
        </button>
            <h1 className="text-xl font-semibold text-gray-900">{course?.course?.title || "Course"}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Award size={16} />
              <span>{course?.course?.duration || "Not specified"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 bg-white border-r border-gray-200 flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 max-w-4xl">
          {activeSection === "about" && renderAbout()}
          {activeSection === "learn" && renderLearn()}
          {activeSection === "assess" && renderAssess()}
          {activeSection === "evaluate" && renderEvaluate()}
        </main>
      </div>
    </div>
  )
}
