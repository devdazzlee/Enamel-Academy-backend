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
  FileText,
  Download,
  AlertTriangle
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
  questionId?: string | number // Original question ID from API
  question: string
  questionTitle?: string
  description?: string
  options: string[]
  optionIds?: (number | string)[] // Option IDs from API (matching correct_answers format)
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

const pickString = (value: unknown, fallback = ""): string => {
  if (typeof value === "string" && value.trim()) return value.trim()
  return fallback
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
  const [currentQuizTitle, setCurrentQuizTitle] = useState("")
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
  const [quizSubmissionResponse, setQuizSubmissionResponse] = useState<{
    attempt_id?: number
    attempt_number?: number
    score?: number
    earned_points?: number
    total_points?: number
    passed?: boolean
    passing_score?: number
    time_taken?: number
    question_results?: Record<string, {
      question_id: number
      title?: string
      type?: string
      user_answer: number | number[] | string
      correct_answer: number[] | string[]
      is_correct: boolean
      points?: number
      points_earned?: number
    }>
    course_progress?: {
      completed_steps?: number
      total_steps?: number
      percentage?: number
      is_completed?: boolean
    }
  } | null>(null)

  // Evaluate additional state
  const [ratings, setRatings] = useState<number[]>(feedbackCriteria.map(() => 0))
  const [feedbackComment, setFeedbackComment] = useState("")
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackSubmitError, setFeedbackSubmitError] = useState("")
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackStatusNote, setFeedbackStatusNote] = useState("")
  const [isCourseCompletedByApi, setIsCourseCompletedByApi] = useState(false)
  const [isCertificateAvailable, setIsCertificateAvailable] = useState(false)
  const [certificateUrl, setCertificateUrl] = useState<string>("")
  const [certificateDownloadUrl, setCertificateDownloadUrl] = useState<string>("")
  const [quizBlockingCompletion, setQuizBlockingCompletion] = useState<{ quizId: string; quizTitle: string } | null>(null)
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false)
  const [quizSubmitError, setQuizSubmitError] = useState("")
  
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

  // Helper function to convert unknown to Record - used in multiple places
    const toRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  // Fetch course data from API
  useEffect(() => {
    const toArrayFromRoot = (payload: unknown, keys: string[]) => {
      const root = toRecord(payload)
      const data = toRecord(root.data)
      for (const key of keys) {
        if (Array.isArray(data[key])) return data[key] as unknown[]
        if (Array.isArray(root[key])) return root[key] as unknown[]
      }
      return [] as unknown[]
    }
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
        const [courseResponse, dashboardResponse, assessmentsResponse, assignmentsResponse, quizzesResponse, quizStatsResponse, assignmentStatsResponse] = await Promise.all([
          authApi.get(API_PATHS.courses.details, { params: { id: courseId } }),
          authApi.get(API_PATHS.dashboard.courseById(courseId)).catch((error) => {
            optionalApiErrors.push(getApiErrorMessage(error))
            return null
          }),
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
          // Merge dashboard data if available (contains resume_point and progress)
          let mergedData = data.data
          if (dashboardResponse?.data?.success && dashboardResponse.data.data) {
            const dashboardData = dashboardResponse.data.data as Record<string, unknown>
            mergedData = { ...data.data, ...dashboardData }
          }
          setCourse(mergedData)
          setCourseContent(mergedData.course ?? {})
          setIsCourseCompletedByApi(Boolean((mergedData.course as Record<string, unknown> | undefined)?.is_completed))

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
              const description = sanitizeApiText(q.description, "")
              if (!question || options.length < 2) return null
              const correctAnswer = typeof q.correct_answer_index === "number"
                ? q.correct_answer_index
                : typeof q.correct_answer === "number"
                  ? q.correct_answer
                  : 0
              return {
                id: typeof q.id === "number" ? q.id : index + 1,
                question,
                description: description && description !== question ? description : undefined,
                options,
                correctAnswer,
                explanation: sanitizeApiText(
                  q.explanation,
                  "Review the course content and retry this question."
                ),
              }
            })
            .filter(Boolean) as AssessmentQuestion[]
          
          // Don't set quiz questions here - we'll set them after extracting from quizzes API
          // setQuizQuestions(apiQuestions) - moved to after quiz extraction

          const rootResources = toResourceArray(toRecord(data.data))
          const courseResources = toResourceArray(toRecord(data.data.course))
          const curriculumResources = extractCurriculumResources(data.data.curriculum)

          const rawResources = [...rootResources, ...courseResources]
            .map((item, idx) => normalizeResource(item, idx))
            .filter(Boolean) as CourseResourceItem[]
          const withCurriculum = [...rawResources, ...curriculumResources]
          const deduped = withCurriculum.filter((item, index, arr) =>
            arr.findIndex((x) => x.title === item.title && (x.url ?? "") === (item.url ?? "")) === index
          )
          const apiResources = deduped

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
            const id = apiId || String(idx + 1)
            const assignmentTitle = pickString(row.title, "")
            return {
              id,
              title: assignmentTitle || id,
              status: toStatus(row),
              apiId,
            }
          })
          const mappedQuizzes: AssessmentSummaryItem[] = quizList.map((item, idx) => {
            const row = toRecord(item)
            const apiId = toIdString(row) || null
            const id = apiId || String(idx + 1)
            const quizTitle = pickString(row.title, "")
            return {
              id,
              title: quizTitle || id,
              status: toStatus(row),
              apiId,
            }
          })
          setAssignmentItems(mappedAssignments)
          setQuizItems(mappedQuizzes)

          // Extract questions from quizzes API response
          // Always try to extract from quizzes, but prioritize quizzes if assessments didn't provide questions
          if (quizList.length > 0) {
            const quizQuestionsFromApi: AssessmentQuestion[] = []
            for (const quizItem of quizList) {
              const quiz = toRecord(quizItem)
              const quizTitle = pickString(quiz.title, "")
              // Store quiz title from first quiz if not already set
              if (quizTitle && !currentQuizTitle) {
                setCurrentQuizTitle(quizTitle)
              }
              const questions = Array.isArray(quiz.questions) ? quiz.questions : []
              for (const q of questions) {
                const question = toRecord(q)
                const rawTitle = pickString(question.title, "")
                const rawDescription = pickString(question.description, "")
                const sanitizedTitle = sanitizeApiText(rawTitle, "")
                // Strip HTML from description but keep the text content
                const sanitizedDescription = rawDescription 
                  ? rawDescription.replace(/<[^>]*>/g, "").trim()
                  : sanitizeApiText(rawDescription, "")

                // Store title and description separately
                // Title is usually "Question 1" or similar label
                // Description contains the actual question text
                let questionTitle: string | undefined = sanitizedTitle || undefined
                let questionText: string = sanitizedDescription || sanitizedTitle || ""

                // If description is empty but title has content, use title as question
                if (!sanitizedDescription && sanitizedTitle) {
                  questionText = sanitizedTitle
                  questionTitle = undefined
                }

                // If title is just "Question X", we can use it as a label or skip it
                if (questionTitle && /^question\s*\d*$/i.test(questionTitle.trim())) {
                  // It's just a label, we'll use it as the question title
                }

                if (!questionText) continue

                // Extract options and their IDs
                let options: string[] = []
                let optionIds: (number | string)[] = []
                if (Array.isArray(question.options)) {
                  question.options.forEach((opt: unknown, idx: number) => {
                    let optionText = ""
                    let optionId: number | string | undefined = undefined
                    
                    if (typeof opt === "string") {
                      optionText = sanitizeApiText(opt, "")
                      optionId = idx // Fallback to index if no ID
                    } else if (typeof opt === "object" && opt !== null) {
                      const optObj = opt as Record<string, unknown>
                      optionText = sanitizeApiText(optObj.label ?? optObj.text ?? optObj.option ?? optObj.value ?? "", "")
                      // Extract option ID (id, value, or index)
                      if (typeof optObj.id === "number" || typeof optObj.id === "string") {
                        optionId = optObj.id
                      } else if (typeof optObj.value === "number" || typeof optObj.value === "string") {
                        optionId = optObj.value
                      } else {
                        optionId = idx // Fallback to index
                      }
                    }
                    
                    if (optionText.length > 0) {
                      options.push(optionText)
                      optionIds.push(optionId ?? idx)
                    }
                  })
                }

                // If no options, detect yes/no from question text or type
                if (options.length === 0) {
                  const combined = `${sanitizedTitle} ${sanitizedDescription}`.toLowerCase()
                  if ((combined.includes("yes") && combined.includes("no")) || question.type === "single") {
                    options = ["Yes", "No"]
                    optionIds = [0, 1] // Default IDs for Yes/No
                  }
                }

                // Extract correct answer (as index, not option ID)
                let correctAnswer = 0
                if (Array.isArray(question.correct_answers) && question.correct_answers.length > 0) {
                  const firstCorrect = question.correct_answers[0]
                  if (typeof firstCorrect === "number") {
                    // This is an option ID, find the index that matches
                    if (optionIds.length > 0) {
                      const correctIdx = optionIds.findIndex(id => id === firstCorrect)
                      correctAnswer = correctIdx >= 0 ? correctIdx : 0
                    } else {
                      // Fallback: assume it's already an index
                      correctAnswer = firstCorrect
                    }
                  } else if (typeof firstCorrect === "string") {
                    const idx = options.findIndex(opt => opt.toLowerCase() === firstCorrect.toLowerCase())
                    if (idx >= 0) correctAnswer = idx
                  } else if (typeof firstCorrect === "object" && firstCorrect !== null) {
                    const co = firstCorrect as Record<string, unknown>
                    const cv = co.value ?? co.answer ?? co.label
                    if (typeof cv === "number") {
                      // This might be an option ID, find the index
                      if (optionIds.length > 0) {
                        const correctIdx = optionIds.findIndex(id => id === cv)
                        correctAnswer = correctIdx >= 0 ? correctIdx : 0
                      } else {
                        correctAnswer = cv
                      }
                    } else if (typeof cv === "string") {
                      const idx = options.findIndex(opt => opt.toLowerCase() === cv.toLowerCase())
                      if (idx >= 0) correctAnswer = idx
                    }
                  }
                } else if (typeof question.correct_answer === "number") {
                  // Check if this is an option ID or index
                  if (optionIds.length > 0) {
                    const correctIdx = optionIds.findIndex(id => id === question.correct_answer)
                    correctAnswer = correctIdx >= 0 ? correctIdx : question.correct_answer
                  } else {
                    correctAnswer = question.correct_answer
                  }
                } else if (typeof question.correct_answer_index === "number") {
                  correctAnswer = question.correct_answer_index
                }

                // Only add if it has at least 2 options
                if (options.length >= 2) {
                  const questionIdFromApi = (question.id ?? question.question_id ?? question.questionId) as string | number | undefined
                  quizQuestionsFromApi.push({
                    id: typeof question.id === "number" ? question.id : quizQuestionsFromApi.length + 1,
                    questionId: questionIdFromApi, // Store original question ID from API
                    question: questionText,
                    questionTitle: questionTitle,
                    description: undefined,
                    options,
                    optionIds: optionIds.length > 0 ? optionIds : undefined,
                    correctAnswer,
                    explanation: sanitizeApiText(question.explanation ?? question.feedback ?? "", "Review the course content and retry this question."),
                  })
                }
              }
            }
            
            // Prioritize quizzes over assessments
            if (quizQuestionsFromApi.length > 0) {
              setQuizQuestions(quizQuestionsFromApi)
            } else if (apiQuestions.length > 0) {
              setQuizQuestions(apiQuestions)
            }
          } else if (apiQuestions.length > 0) {
            // If no quizzes but assessments have questions, use them
            setQuizQuestions(apiQuestions)
          }

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
          const firstQuizTitle = mappedQuizzes[0]?.title || ""
          if (firstAssignmentId) setSelectedAssignmentId(firstAssignmentId)
          if (firstQuizId) {
            setSelectedQuizId(firstQuizId)
            setCurrentQuizTitle(firstQuizTitle)
          }
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

          const assignmentTitleFromDetail = pickString(assignmentDetailData.title, "")
          setAssignmentDetailSummary(
            firstAssignmentId
              ? assignmentTitleFromDetail ? `${assignmentTitleFromDetail} loaded from API` : `Assignment ${firstAssignmentId} loaded from API`
              : "No assignment details available."
          )
          const quizTitleFromDetail = pickString(quizDetailData.title, firstQuizTitle)
          if (quizTitleFromDetail) setCurrentQuizTitle(quizTitleFromDetail)
          setQuizDetailSummary(
            firstQuizId
              ? `${quizTitleFromDetail || firstQuizId} loaded from API`
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
            const certResponse = await certificatesService.getCourseCertificate(courseId)
            const certRoot = (certResponse && typeof certResponse === "object" ? certResponse : {}) as Record<string, unknown>
            const certData = (certRoot.data && typeof certRoot.data === "object" ? certRoot.data : certRoot) as Record<string, unknown>
            // Certificate is available if success is true and data exists
            const available = Boolean(certRoot.success) && Boolean(certData.certificate_url || certData.certificateUrl)
            setIsCertificateAvailable(available)
            // Store certificate URLs from API
            if (available) {
              const apiCertificateUrl = pickString(certData.certificate_url ?? certData.certificateUrl, "")
              const apiDownloadUrl = pickString(certData.download_url ?? certData.downloadUrl, "")
              setCertificateUrl(apiCertificateUrl)
              setCertificateDownloadUrl(apiDownloadUrl)
              // Update resources with certificate URL from API
              if (apiCertificateUrl) {
                setResources((prevResources) =>
                  prevResources.map((item) =>
                    item.title.toLowerCase().includes("certificate") && !item.url
                      ? { ...item, url: apiCertificateUrl }
                      : item
                  )
                )
              }
            } else {
              setCertificateUrl("")
              setCertificateDownloadUrl("")
            }
          } catch {
            setIsCertificateAvailable(false)
            setCertificateUrl("")
            setCertificateDownloadUrl("")
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
      const title = typeof data.title === "string" && data.title.trim() ? data.title : ""
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
      const title = typeof detailData.title === "string" && detailData.title.trim() ? detailData.title : ""
      if (title) setCurrentQuizTitle(title)
      setQuizDetailSummary(title ? `${title} loaded from API.` : `Quiz ${quizId} loaded from API.`)

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

      // Extract questions from quiz details
      const questions = Array.isArray(detailData.questions) ? detailData.questions : []
      if (questions.length > 0) {
        const quizQuestionsFromDetail: AssessmentQuestion[] = []
        for (const q of questions) {
          const question = toRecord(q)
          const rawTitle = pickString(question.title, "")
          const rawDescription = pickString(question.description, "")
          const sanitizedTitle = sanitizeApiText(rawTitle, "")
          // Strip HTML from description but keep the text content
          const sanitizedDescription = rawDescription 
            ? rawDescription.replace(/<[^>]*>/g, "").trim()
            : sanitizeApiText(rawDescription, "")

          // Store title and description separately
          let questionTitle: string | undefined = sanitizedTitle || undefined
          let questionText: string = sanitizedDescription || sanitizedTitle || ""

          // If description is empty but title has content, use title as question
          if (!sanitizedDescription && sanitizedTitle) {
            questionText = sanitizedTitle
            questionTitle = undefined
          }

          if (!questionText) continue

          // Extract options and their IDs
          let options: string[] = []
          let optionIds: (number | string)[] = []
          if (Array.isArray(question.options)) {
            question.options.forEach((opt: unknown, idx: number) => {
              let optionText = ""
              let optionId: number | string | undefined = undefined
              
              if (typeof opt === "string") {
                optionText = sanitizeApiText(opt, "")
                optionId = idx // Fallback to index if no ID
              } else if (typeof opt === "object" && opt !== null) {
                const optObj = opt as Record<string, unknown>
                optionText = sanitizeApiText(optObj.label ?? optObj.text ?? optObj.option ?? optObj.value ?? "", "")
                // Extract option ID (id, value, or index)
                if (typeof optObj.id === "number" || typeof optObj.id === "string") {
                  optionId = optObj.id
                } else if (typeof optObj.value === "number" || typeof optObj.value === "string") {
                  optionId = optObj.value
                } else {
                  optionId = idx // Fallback to index
                }
              }
              
              if (optionText.length > 0) {
                options.push(optionText)
                optionIds.push(optionId ?? idx)
              }
            })
          }

          // If no options, detect yes/no from question text or type
          if (options.length === 0) {
            const combined = `${sanitizedTitle} ${sanitizedDescription}`.toLowerCase()
            if ((combined.includes("yes") && combined.includes("no")) || question.type === "single") {
              options = ["Yes", "No"]
              optionIds = [0, 1] // Default IDs for Yes/No
            }
          }

          // Extract correct answer (as index, not option ID)
          let correctAnswer = 0
          if (Array.isArray(question.correct_answers) && question.correct_answers.length > 0) {
            const firstCorrect = question.correct_answers[0]
            if (typeof firstCorrect === "number") {
              // This is an option ID, find the index that matches
              if (optionIds.length > 0) {
                const correctIdx = optionIds.findIndex(id => id === firstCorrect)
                correctAnswer = correctIdx >= 0 ? correctIdx : 0
              } else {
                // Fallback: assume it's already an index
                correctAnswer = firstCorrect
              }
            } else if (typeof firstCorrect === "string") {
              const idx = options.findIndex(opt => opt.toLowerCase() === firstCorrect.toLowerCase())
              if (idx >= 0) correctAnswer = idx
            } else if (typeof firstCorrect === "object" && firstCorrect !== null) {
              const co = firstCorrect as Record<string, unknown>
              const cv = co.value ?? co.answer ?? co.label
              if (typeof cv === "number") {
                // This might be an option ID, find the index
                if (optionIds.length > 0) {
                  const correctIdx = optionIds.findIndex(id => id === cv)
                  correctAnswer = correctIdx >= 0 ? correctIdx : 0
                } else {
                  correctAnswer = cv
                }
              } else if (typeof cv === "string") {
                const idx = options.findIndex(opt => opt.toLowerCase() === cv.toLowerCase())
                if (idx >= 0) correctAnswer = idx
              }
            }
          } else if (typeof question.correct_answer === "number") {
            // Check if this is an option ID or index
            if (optionIds.length > 0) {
              const correctIdx = optionIds.findIndex(id => id === question.correct_answer)
              correctAnswer = correctIdx >= 0 ? correctIdx : question.correct_answer
            } else {
              correctAnswer = question.correct_answer
            }
          } else if (typeof question.correct_answer_index === "number") {
            correctAnswer = question.correct_answer_index
          }

          if (options.length >= 2) {
            const questionIdFromApi = (question.id ?? question.question_id ?? question.questionId) as string | number | undefined
            quizQuestionsFromDetail.push({
              id: typeof question.id === "number" ? question.id : quizQuestionsFromDetail.length + 1,
              questionId: questionIdFromApi, // Store original question ID from API
              question: questionText,
              questionTitle: questionTitle,
              description: undefined,
              options,
              optionIds: optionIds.length > 0 ? optionIds : undefined,
              correctAnswer,
              explanation: sanitizeApiText(question.explanation ?? question.feedback ?? "", "Review the course content and retry this question."),
            })
          }
        }

        if (quizQuestionsFromDetail.length > 0) {
          setQuizQuestions(quizQuestionsFromDetail)
        }
      }
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

  /**
   * Checks if an API response indicates success.
   * The backend returns HTTP 200 even on failure, so we must check the body.
   */
  const isApiSuccess = useCallback((response: unknown): boolean => {
    if (!response || typeof response !== "object") return false
    const r = response as Record<string, unknown>
    // Explicit success field takes priority
    if (typeof r.success === "boolean") return r.success
    // If there's no success field, assume true (some endpoints don't return it)
    return true
  }, [])

  /**
   * Attempts to mark all incomplete topics for a lesson, then the lesson itself.
   * Backend requires: ALL topics must be successfully marked complete BEFORE the lesson can be marked.
   * Returns true only if ALL topics AND the lesson were successfully marked complete.
   */
  const markLessonAndTopicsComplete = useCallback(async (
    lessonId: number,
    topicIds: number[]
  ): Promise<boolean> => {
    try {
      // Step 1: Mark each incomplete topic complete (sequentially for ordering)
      // Track which ones actually succeeded — lesson can only be marked if ALL topics succeed
      const topicsToMark = topicIds.filter(tid => !completedTopicIdsRef.current.has(tid))
      let allTopicsSucceeded = true

      for (const topicId of topicsToMark) {
        try {
          const topicRes = await coursesService.markTopicComplete(courseId, topicId)
          if (isApiSuccess(topicRes)) {
            completedTopicIdsRef.current.add(topicId)
          } else {
            // Topic mark returned success:false — backend rejected it
            console.warn('[Track] Topic mark failed (backend rejected):', { lessonId, topicId, response: topicRes })
            allTopicsSucceeded = false
          }
        } catch (err) {
          // Topic mark threw an error (network, 500, etc.)
          console.warn('[Track] Topic mark failed (error):', { lessonId, topicId, error: err })
          allTopicsSucceeded = false
        }
      }

      // If we marked any topics, give backend a moment to process them
      if (topicsToMark.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Step 2: Only mark lesson complete if ALL topics succeeded (or there were no topics)
      if (!completedLessonIdsRef.current.has(lessonId)) {
        // If there were topics to mark and any failed, don't try to mark the lesson
        if (topicsToMark.length > 0 && !allTopicsSucceeded) {
          console.warn('[Track] Skipping lesson mark — not all topics succeeded:', { lessonId, topicsToMark: topicsToMark.length, allSucceeded: allTopicsSucceeded })
          return false
    }

    try {
          const lessonRes = await coursesService.markLessonComplete(courseId, lessonId)
          if (isApiSuccess(lessonRes)) {
            completedLessonIdsRef.current.add(lessonId)
            return true
          }
          // Backend explicitly said success:false — log for debugging
          console.warn('[Track] Lesson mark failed (backend rejected):', { lessonId, response: lessonRes })
          return false
        } catch (err) {
          console.warn('[Track] Lesson mark failed (error):', { lessonId, error: err })
          return false
        }
      }
      return true // Already completed
    } catch (error) {
      console.error('[Track] markLessonAndTopicsComplete error:', { lessonId, error })
      return false
    }
  }, [courseId, isApiSuccess])

  /**
   * Fetches actual progress from backend (dashboard endpoint) and attempts to mark
   * every incomplete topic + lesson complete. Single attempt, no retries.
   * Returns true if backend already shows all complete or all marks succeeded.
   */
  const syncIncompleteModules = useCallback(async (): Promise<boolean> => {
    try {
      const dashboardRes = await authApi.get(API_PATHS.dashboard.courseById(courseId))
      const root = (dashboardRes.data && typeof dashboardRes.data === "object" ? dashboardRes.data : {}) as Record<string, unknown>
      const data = (root.data && typeof root.data === "object" ? root.data : {}) as Record<string, unknown>
      const progressData = (data.course_progress && typeof data.course_progress === "object" ? data.course_progress : data) as Record<string, unknown>
      const modules = (progressData.modules && Array.isArray(progressData.modules) ? progressData.modules : (data.modules && Array.isArray(data.modules) ? data.modules : [])) as Array<Record<string, unknown>>

      if (modules.length === 0) return true // Nothing to process

      let incompleteCount = 0
      let markedCount = 0

      for (const mod of modules) {
        const moduleId = typeof mod.id === "number" ? mod.id : null
        if (!moduleId) continue

        const moduleCompleted = Boolean(mod.completed)
        const topics = (mod.topics && Array.isArray(mod.topics) ? mod.topics : []) as Array<Record<string, unknown>>
        const incompleteTopicIds: number[] = []
        for (const topic of topics) {
          const topicId = typeof topic.id === "number" ? topic.id : null
          if (topicId && !Boolean(topic.completed)) {
            incompleteTopicIds.push(topicId)
          }
        }

        if (!moduleCompleted || incompleteTopicIds.length > 0) {
          incompleteCount++
          // Only pass incomplete topic IDs — don't try to re-mark already-completed topics
          // If lesson isn't complete but all topics are, just pass empty array (will only mark lesson)
          const topicIds = incompleteTopicIds.length > 0
            ? incompleteTopicIds
            : []

          const ok = await markLessonAndTopicsComplete(moduleId, topicIds)
          if (ok) markedCount++
        }
      }

      console.log('[Track] syncIncompleteModules:', { incomplete: incompleteCount, marked: markedCount })
      return incompleteCount === 0 || markedCount === incompleteCount
        } catch (error) {
      console.error('[Track] syncIncompleteModules failed:', error)
      return false
    }
  }, [courseId, markLessonAndTopicsComplete])

  /**
   * Determines course completion from MULTIPLE sources (not just is_completed flag).
   * Also checks certificate availability.
   * 
   * Sources of truth (in order):
   * 1. course.is_completed — the official backend flag
   * 2. Dashboard modules — if ALL modules+topics are completed, the course is effectively complete
   *    (handles the case where backend's step counter is broken, e.g. total_steps: 0)
   * 3. Dashboard progress.completed_steps === progress.total_steps (when total_steps > 0)
   */
  const checkCompletionAndCertificate = useCallback(async (): Promise<boolean> => {
    // Check 1: Official is_completed flag
    const courseRes = await authApi.get(API_PATHS.dashboard.courseById(courseId))
    const root = (courseRes.data && typeof courseRes.data === "object" ? courseRes.data : {}) as Record<string, unknown>
    const data = (root.data && typeof root.data === "object" ? root.data : {}) as Record<string, unknown>
    const courseObj = (data.course && typeof data.course === "object" ? data.course : {}) as Record<string, unknown>
    let isCompleted = Boolean(courseObj.is_completed)

    // Check 2: Fetch dashboard data once and use for both completion check and certificate check
    let derivedAllModulesComplete = false
    let completedSteps = 0
    let totalSteps = 0
    
    try {
      const dashRes = await authApi.get(API_PATHS.dashboard.courseById(courseId))
      const dashRoot = (dashRes.data && typeof dashRes.data === "object" ? dashRes.data : {}) as Record<string, unknown>
      const dashData = (dashRoot.data && typeof dashRoot.data === "object" ? dashRoot.data : {}) as Record<string, unknown>
      const progressObj = (dashData.progress && typeof dashData.progress === "object" ? dashData.progress : {}) as Record<string, unknown>
      const progressData = (dashData.course_progress && typeof dashData.course_progress === "object" ? dashData.course_progress : dashData) as Record<string, unknown>
      const modules = (progressData.modules && Array.isArray(progressData.modules) ? progressData.modules : (dashData.modules && Array.isArray(dashData.modules) ? dashData.modules : [])) as Array<Record<string, unknown>>

      // Check if all modules and topics are complete
      if (modules.length > 0) {
        derivedAllModulesComplete = modules.every((mod: Record<string, unknown>) => {
          if (!Boolean(mod.completed)) return false
          const topics = (mod.topics && Array.isArray(mod.topics) ? mod.topics : []) as Array<Record<string, unknown>>
          return topics.every((t: Record<string, unknown>) => Boolean(t.completed))
        })

        // Also check step-based progress (handles quiz completion)
        completedSteps = typeof progressObj.completed_steps === "number" ? progressObj.completed_steps : 0
        totalSteps = typeof progressObj.total_steps === "number" ? progressObj.total_steps : 0
        const stepsComplete = totalSteps > 0 && completedSteps >= totalSteps
        
        // Log dashboard progress for comparison with certificate API
        console.log('[Track] Dashboard API progress data:', {
          courseId,
          completedSteps,
          totalSteps,
          percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
          isCompleted: Boolean(progressObj.is_completed ?? dashData.is_completed),
          derivedAllModulesComplete,
          stepsComplete,
          modulesCount: modules.length,
          allModulesComplete: modules.every((mod: Record<string, unknown>) => Boolean(mod.completed))
        })

        if (!isCompleted && derivedAllModulesComplete && stepsComplete) {
          isCompleted = true
          console.log('[Track] Course derived as complete from dashboard modules + steps:', { modules: modules.length, completedSteps, totalSteps })
          setQuizBlockingCompletion(null) // Not blocking if steps are complete
        } else if (!isCompleted && derivedAllModulesComplete) {
          console.log('[Track] All modules complete but steps incomplete:', { completedSteps, totalSteps, allModulesComplete: derivedAllModulesComplete })
          
          // Check if quiz is blocking completion by checking actual quiz attempts
          try {
            // First, get all quizzes for this course
            const quizzesRes = await assignmentService.courseQuizzes(courseId)
            const quizzesRoot = (quizzesRes && typeof quizzesRes === "object" ? quizzesRes : {}) as Record<string, unknown>
            const quizzesData = (quizzesRoot.data && typeof quizzesRoot.data === "object" ? quizzesRoot.data : quizzesRoot) as Record<string, unknown>
            const quizzes = Array.isArray(quizzesData.quizzes) ? quizzesData.quizzes : []
            
            if (quizzes.length > 0) {
              // Check each quiz's attempts directly using the attempts endpoint
              let foundBlockingQuiz = false
              
              for (const quiz of quizzes) {
                const quizObj = quiz as Record<string, unknown>
                const quizId = typeof quizObj.id === "number" ? String(quizObj.id) : String(quizObj.id ?? "")
                const quizTitle = String(quizObj.title ?? "Quiz")
                
                try {
                  // Check actual attempts for this quiz using the attempts endpoint
                  console.log('[Track] Checking quiz attempts endpoint:', { 
                    quizId, 
                    quizTitle, 
                    endpoint: `/wp-json/reactapi/v1/quizzes/${quizId}/attempts` 
                  })
                  
                  const attemptsRes = await assignmentService.quizAttempts(quizId)
                  
                  // Log full response structure for debugging
                  console.log('[Track] Quiz attempts API response:', { 
                    quizId, 
                    quizTitle,
                    rawResponse: attemptsRes,
                    responseType: typeof attemptsRes,
                    isObject: typeof attemptsRes === "object",
                    responseKeys: typeof attemptsRes === "object" && attemptsRes !== null ? Object.keys(attemptsRes) : []
                  })
                  
                  const attemptsRoot = (attemptsRes && typeof attemptsRes === "object" ? attemptsRes : {}) as Record<string, unknown>
                  const attemptsData = (attemptsRoot.data && typeof attemptsRoot.data === "object" ? attemptsRoot.data : attemptsRoot) as Record<string, unknown>
                  
                  // Log data structure
                  console.log('[Track] Quiz attempts data structure:', {
                    quizId,
                    quizTitle,
                    attemptsRootKeys: Object.keys(attemptsRoot),
                    attemptsDataKeys: Object.keys(attemptsData),
                    hasAttemptsArray: Array.isArray(attemptsData.attempts),
                    hasItemsArray: Array.isArray(attemptsData.items),
                    hasResultsArray: Array.isArray(attemptsData.results),
                    attemptsDataAttempts: attemptsData.attempts,
                    attemptsDataItems: attemptsData.items,
                    attemptsDataResults: attemptsData.results
                  })
                  
                  // Extract attempts array from various possible locations
                  const attempts = Array.isArray(attemptsData.attempts)
                    ? attemptsData.attempts
                    : Array.isArray(attemptsData.items)
                      ? attemptsData.items
                      : Array.isArray(attemptsData.results)
                        ? attemptsData.results
                        : Array.isArray(attemptsRoot.attempts)
                          ? attemptsRoot.attempts
                          : []
                  
                  console.log('[Track] Extracted attempts array:', {
                    quizId,
                    quizTitle,
                    attemptsLength: attempts.length,
                    attempts: attempts
                  })
                  
                  if (attempts.length === 0) {
                    // This quiz has no attempts — it's blocking completion
                    setQuizBlockingCompletion({ quizId, quizTitle })
                    foundBlockingQuiz = true
                    console.log('[Track] ✅ Quiz blocking completion — no attempts found:', { 
                      quizId, 
                      quizTitle, 
                      attemptsEndpoint: `/wp-json/reactapi/v1/quizzes/${quizId}/attempts`,
                      fullResponse: attemptsRes
                    })
                    break // Found a blocking quiz, no need to check others
                  } else {
                    console.log('[Track] ✅ Quiz has attempts — not blocking:', { 
                      quizId, 
                      quizTitle, 
                      attemptsCount: attempts.length,
                      firstAttempt: attempts[0]
                    })
                  }
                } catch (attemptErr: any) {
                  // Failed to check attempts for this quiz — log full error details
                  console.error('[Track] ❌ Failed to check quiz attempts:', { 
                    quizId, 
                    quizTitle, 
                    endpoint: `/wp-json/reactapi/v1/quizzes/${quizId}/attempts`,
                    error: attemptErr,
                    errorMessage: attemptErr?.message,
                    errorResponse: attemptErr?.response?.data,
                    errorStatus: attemptErr?.response?.status
                  })
                  setQuizBlockingCompletion({ quizId, quizTitle })
                  foundBlockingQuiz = true
                  break
                }
              }
              
              if (!foundBlockingQuiz) {
                // All quizzes have attempts — not blocking
                setQuizBlockingCompletion(null)
                console.log('[Track] All quizzes have attempts — course completion not blocked by quiz')
              }
            } else {
              // No quizzes found — not blocking
              setQuizBlockingCompletion(null)
            }
          } catch {
            // Quiz check failed — don't set blocking state
            setQuizBlockingCompletion(null)
          }
        }
      }
    } catch {
      // Dashboard check failed — rely on is_completed flag only
    }

    setCourse((prev: any) => (prev ? ({ ...prev, course: { ...(prev.course ?? {}), is_completed: isCompleted } }) : prev))
    setIsCourseCompletedByApi(isCompleted)

    // Check certificate availability from API
    // Also consider derived completion (all modules complete) for UI purposes
    try {
      const certResponse = await certificatesService.getCourseCertificate(courseId)
      const certRoot = (certResponse && typeof certResponse === "object" ? certResponse : {}) as Record<string, unknown>
      const certData = (certRoot.data && typeof certRoot.data === "object" ? certRoot.data : certRoot) as Record<string, unknown>
      
      // Log certificate API response for debugging
      console.log('[Track] Certificate API response:', {
        courseId,
        certSuccess: certRoot.success,
        certMessage: certRoot.message,
        certData,
        certDataKeys: Object.keys(certData),
        certProgress: certData.progress,
        certIsCompleted: certData.is_completed,
        dashboardProgress: { completedSteps, totalSteps, percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0 },
        derivedAllModulesComplete,
        mismatch: {
          dashboardShows: `${completedSteps}/${totalSteps}`,
          certificateShows: certData.progress ? `${(certData.progress as Record<string, unknown>).completed}/${(certData.progress as Record<string, unknown>).total}` : 'N/A',
          certificateIsCompleted: certData.is_completed,
          dashboardIsCompleted: isCompleted
        }
      })
      
      const apiAvailable = Boolean(certRoot.success) && Boolean(certData.certificate_url || certData.certificateUrl)
      
      // Show certificate button if API says available OR if all modules are complete (even if API hasn't processed it yet)
      const available = apiAvailable || derivedAllModulesComplete
      setIsCertificateAvailable(available)
      
      if (apiAvailable) {
        setCertificateUrl(pickString(certData.certificate_url ?? certData.certificateUrl, ""))
        setCertificateDownloadUrl(pickString(certData.download_url ?? certData.downloadUrl, ""))
      } else if (derivedAllModulesComplete) {
        // All modules complete but API hasn't generated certificate yet — clear URLs so button fetches on click
        setCertificateUrl("")
        setCertificateDownloadUrl("")
      } else {
        setCertificateUrl("")
        setCertificateDownloadUrl("")
      }
    } catch (certErr: any) {
      // Log certificate API error
      console.error('[Track] Certificate API error:', {
        courseId,
        error: certErr,
        errorMessage: certErr?.message,
        errorResponse: certErr?.response?.data,
        errorStatus: certErr?.response?.status,
        dashboardProgress: { completedSteps, totalSteps, percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0 },
        derivedAllModulesComplete
      })
      
      // If API call fails but all modules are complete, still show button (will fetch on click)
      setIsCertificateAvailable(derivedAllModulesComplete)
      if (!derivedAllModulesComplete) {
        setCertificateUrl("")
        setCertificateDownloadUrl("")
      }
    }

    return isCompleted
  }, [courseId])

  // Main progress tracking function — clean, single-responsibility
  const trackCourseProgress = useCallback(async (stepIndex: number, progressPercentage: number, completed = false, watchedSeconds?: number) => {
    if (!courseId || stepIndex < 1) return

    const totalLessons = lessonStepsRef.current.length
    if (totalLessons > 0 && stepIndex > totalLessons) return

    // Prevent concurrent tracking for the same step
    if (trackingPagesRef.current.has(stepIndex)) return
    trackingPagesRef.current.add(stepIndex)

    try {
      const lessonStep = lessonStepsRef.current[stepIndex - 1]
      const lessonId = lessonStep ? extractNumericId(lessonStep.id) : undefined
      const topicId = lessonStep?.topics?.[0]?.id ? extractNumericId(lessonStep.topics[0].id) : undefined

      // 1. Send progress update to backend
      const payload: Record<string, unknown> = {
        step_index: stepIndex,
        progress_percentage: Math.max(0, Math.min(100, progressPercentage)),
        completed: completed,
      }
      if (lessonId && lessonId > 0) payload.lesson_id = lessonId
      if (topicId && topicId > 0) payload.topic_id = topicId
      if (watchedSeconds !== undefined && watchedSeconds >= 0) payload.watched_seconds = Math.round(watchedSeconds)

      await coursesService.trackProgress(courseId, payload as any)

      // 2. Mark current lesson's topics + lesson complete
      if (lessonId && lessonStep) {
        const topicIds = (lessonStep.topics || [])
          .map((t: { id?: string | number }) => t.id ? extractNumericId(t.id) : null)
          .filter((id: number | null | undefined): id is number => id !== null && id !== undefined && id > 0)

        await markLessonAndTopicsComplete(lessonId, topicIds)
      }

      // 3. On course completion: try ONCE to sync incomplete modules, then check status
      if (completed) {
        console.log('[Track] Course completion detected — syncing with backend (single attempt)')

        await syncIncompleteModules()

        // Brief wait for backend processing, then check completion + certificate
        await new Promise(resolve => setTimeout(resolve, 1500))
        await checkCompletionAndCertificate()
      }
    } catch (error) {
      console.error('[Track] Failed to track course progress:', error)
    } finally {
      trackingPagesRef.current.delete(stepIndex)
    }
  }, [courseId, extractNumericId, markLessonAndTopicsComplete, syncIncompleteModules, checkCompletionAndCertificate])

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

      // Calculate progress based on completed steps and current position
    // learnPages structure: [0] Overview, [1...N] Lessons, [N+1] Resources, [N+2] Consent
    // We only count lessons for progress (exclude overview, resources, consent)
    const totalLessons = lessonStepsRef.current.length
    
    // Prevent tracking if learnPage exceeds valid lesson range
    // Valid learnPages: 1 to totalLessons (lessons only, excluding overview/resources/consent)
    if (learnPage > totalLessons) {
      console.log('[Track] Skipping - learnPage exceeds total lessons:', { learnPage, totalLessons })
      return
    }

    // Prevent duplicate tracking for the same page
    if (lastTrackedPageRef.current === learnPage) {
      console.log('[Track] Skipping duplicate tracking for page:', learnPage)
      return
    }

    // Mark this page as tracked immediately to prevent race conditions
    lastTrackedPageRef.current = learnPage

    const currentLessonIndex = learnPage - 1 // learnPage is 1-based, convert to 0-based
    
    // Mark as completed when we've reached the last lesson
    const isCompleted = totalLessons > 0 && learnPage === totalLessons

    // Calculate progress: when viewing a lesson, you've completed up to that point
    // When isCompleted, progress is 100% (not 95%) — this tells the backend all lessons are done
    const progressPct = isCompleted
      ? 100
      : totalLessons > 0 
        ? Math.min(99, Math.round((currentLessonIndex / totalLessons) * 100))
        : 0

      console.log('[Track] useEffect triggered - tracking progress:', { 
        learnPage, 
        progressPct, 
        activeSection,
        currentLessonIndex,
      totalLessons,
      completedLessons: completedLessonIdsRef.current.size,
      isCompleted
    })

    // Call tracking function - pass completed: true when on the last lesson
    void trackCourseProgress(learnPage, progressPct, isCompleted, 0)
  }, [learnPage, activeSection]) // Only depend on actual state changes, not functions

  // Resume from URL parameter (legacy support)
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

  // Resume from API progress data (resume_point or incomplete_step)
  // This runs AFTER course data and lessonSteps are loaded
  useEffect(() => {
    // Only run once when all dependencies are ready
    if (resumeApplied || lessonSteps.length === 0 || !course || loading) return
    
    const applyResumePoint = () => {
      try {
        // Get data from course object (already merged with dashboard data)
        const courseData = course as Record<string, unknown>
        
        // Check if course is completed - if so, don't resume
        const courseObj = (courseData.course && typeof courseData.course === "object" ? courseData.course : {}) as Record<string, unknown>
        const isCompleted = Boolean(courseObj.is_completed)
        if (isCompleted) {
          setResumeApplied(true)
          return
        }
        
        // Check for resume_point first (more specific)
        const resumePoint = (courseData.resume_point && typeof courseData.resume_point === "object" ? courseData.resume_point : null) as Record<string, unknown> | null
        const progress = (courseData.progress && typeof courseData.progress === "object" ? courseData.progress : {}) as Record<string, unknown>
        const incompleteStep = (progress.incomplete_step && typeof progress.incomplete_step === "object" ? progress.incomplete_step : null) as Record<string, unknown> | null
        
        // Priority: resume_point > incomplete_step
        const resumeData = resumePoint || incompleteStep
        if (!resumeData) {
          setResumeApplied(true)
          return
        }
        
        const resumeType = pickString(resumeData.type, "")
        
        // If it's a quiz, switch to assess section
        if (resumeType === "quiz") {
          const quizId = pickString(resumeData.id, "")
          if (quizId && quizItems.length > 0) {
            const quizExists = quizItems.some(q => q.apiId === quizId)
            if (quizExists) {
              setSelectedQuizId(quizId)
              setActiveSection("assess")
              setResumeApplied(true)
              console.log('[Resume] Resumed to quiz:', quizId)
              return
            }
          }
          setResumeApplied(true)
          return
        }
        
        // For lessons and topics, we need to find the lesson
        // If it's a topic, use lesson_id; if it's a lesson, use id
        let lessonIdToFind: string = ""
        if (resumeType === "topic") {
          // For topics, use the lesson_id from resume_point (this is the key fix)
          lessonIdToFind = pickString(resumeData.lesson_id, "")
        } else {
          // For lessons, use the id
          lessonIdToFind = pickString(resumeData.id ?? resumeData.lesson_id, "")
        }
        
        if (!lessonIdToFind) {
          setResumeApplied(true)
          return
        }
        
        // Find the lesson by ID (exact match)
        const stepIndex = lessonSteps.findIndex((step) => {
          const stepId = String(step.id || "")
          return stepId === lessonIdToFind
        })
        
        if (stepIndex >= 0) {
          setActiveSection("learn")
          // learnPages[0] is Course Overview, so lessons start at index 1
          setLearnPage(stepIndex + 1)
          setNavGuardMessage("")
          setResumeApplied(true)
          console.log('[Resume] Successfully resumed to lesson:', { stepIndex: stepIndex + 1, lessonId: lessonIdToFind, lessonTitle: lessonSteps[stepIndex].title })
        } else {
          console.warn('[Resume] Could not find lesson with ID:', lessonIdToFind, 'Available lesson IDs:', lessonSteps.map(s => s.id))
          setResumeApplied(true)
        }
      } catch (error) {
        console.error('[Resume] Failed to apply resume point:', error)
        setResumeApplied(true)
      }
    }
    
    applyResumePoint()
  }, [course, lessonSteps, resumeApplied, courseId, loading, quizItems])

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

  const handleCheckAnswers = async () => {
    const unanswered = selectedAnswers.filter((a) => a === null).length
    if (unanswered > 0) return
    
    // Check if we have a quiz ID to submit
    if (!selectedQuizId) {
      console.warn('[Quiz] No quiz ID selected, cannot submit to API')
      // Still calculate score locally for display
    let correct = 0
    quizQuestions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctAnswer) correct++
    })
    const scorePercValue = quizQuestions.length > 0 ? (correct / quizQuestions.length) * 100 : 0
    const isPassed = scorePercValue >= 80
    setAssessmentScore(correct)
    setShowResults(true)
    setAssessmentCompleted(isPassed)
      return
    }

    setIsSubmittingQuiz(true)
    setQuizSubmitError("")

    try {
      // Format answers according to API structure
      // NOTE: There appears to be a backend bug where correct answers are marked as incorrect
      // Even when user_answer: 0 matches correct_answer: [0], is_correct returns false
      // This needs to be fixed on the backend - the comparison logic is not working correctly
      // 
      // Current format: sending option ID as number (0-based to match correct_answers format)
      // Postman examples show 1-based numbers, but correct_answers uses 0-based arrays
      const answers: Record<string, number | number[]> = {}
      quizQuestions.forEach((q, i) => {
        const selectedOption = selectedAnswers[i]
        if (selectedOption !== null) {
          // Use the original question ID from API, fallback to q.id
          const questionId = q.questionId !== undefined ? String(q.questionId) : String(q.id)
          // Get the option ID from the selected option index
          // If optionIds are available, use them; otherwise fallback to index
          let optionId: number
          if (q.optionIds && q.optionIds.length > selectedOption) {
            const idValue = q.optionIds[selectedOption]
            optionId = typeof idValue === "number" ? idValue : Number(idValue) || selectedOption
          } else {
            // Fallback to index if optionIds not available
            optionId = selectedOption
          }
          // Send option ID as number (0-based) to match correct_answers format
          // Backend should check if optionId is in correct_answer array, but currently has a bug
          answers[questionId] = optionId
        }
      })

      // Calculate score locally
      let correct = 0
      quizQuestions.forEach((q, i) => {
        if (selectedAnswers[i] === q.correctAnswer) correct++
      })
      const scorePercValue = quizQuestions.length > 0 ? (correct / quizQuestions.length) * 100 : 0
      const isPassed = scorePercValue >= 80

      // Submit quiz to API
      console.log('[Quiz] Submitting quiz to API:', {
        courseId,
        quizId: selectedQuizId,
        answersCount: Object.keys(answers).length,
        answers
      })

      const submitResponse = await assignmentService.submitQuiz(courseId, selectedQuizId, {
        answers,
        time_taken: 0, // TODO: Track actual time taken if needed
      })

      console.log('[Quiz] Quiz submitted successfully:', submitResponse)

      // Extract response data
      const responseRoot = (submitResponse && typeof submitResponse === "object" ? submitResponse : {}) as Record<string, unknown>
      const responseData = (responseRoot.data && typeof responseRoot.data === "object" ? responseRoot.data : responseRoot) as Record<string, unknown>
      
      // Store the full response
      setQuizSubmissionResponse(responseData as any)

      // Use API response for score and pass status
      const apiScore = typeof responseData.score === "number" ? responseData.score : 0
      const apiPassed = typeof responseData.passed === "boolean" ? responseData.passed : false
      const apiPassingScore = typeof responseData.passing_score === "number" ? responseData.passing_score : 70
      const apiEarnedPoints = typeof responseData.earned_points === "number" ? responseData.earned_points : 0
      const apiTotalPoints = typeof responseData.total_points === "number" ? responseData.total_points : 1

      // Calculate score percentage from API
      const apiScorePercent = apiTotalPoints > 0 ? (apiEarnedPoints / apiTotalPoints) * 100 : 0

      console.log('[Quiz] API Response:', {
        score: apiScore,
        earned_points: apiEarnedPoints,
        total_points: apiTotalPoints,
        scorePercent: apiScorePercent,
        passed: apiPassed,
        passing_score: apiPassingScore
      })

      // Update UI state with API data
      setAssessmentScore(apiEarnedPoints) // Use earned points as score
      setShowResults(true)
      setAssessmentCompleted(apiPassed) // Use API's passed status

      // Refresh course progress to reflect quiz completion
      try {
        await checkCompletionAndCertificate()
      } catch (progressError) {
        console.error('[Quiz] Failed to refresh progress after submission:', progressError)
      }
    } catch (error: any) {
      console.error('[Quiz] Failed to submit quiz:', error)
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to submit quiz. Please try again."
      setQuizSubmitError(errorMsg)
      
      // Still show results locally even if API call failed
      let correct = 0
      quizQuestions.forEach((q, i) => {
        if (selectedAnswers[i] === q.correctAnswer) correct++
      })
      const scorePercValue = quizQuestions.length > 0 ? (correct / quizQuestions.length) * 100 : 0
      const isPassed = scorePercValue >= 80
      setAssessmentScore(correct)
      setShowResults(true)
      setAssessmentCompleted(isPassed)
    } finally {
      setIsSubmittingQuiz(false)
    }
  }

  const handleRetry = () => {
    setSelectedAnswers(quizQuestions.map(() => null))
    setShowResults(false)
    setAssessmentScore(0)
    setAssessmentCompleted(false)
    setQuizSubmissionResponse(null) // Clear previous submission response
  }

  // Use API response if available, otherwise calculate locally
  const apiPassingScore = quizSubmissionResponse?.passing_score ?? 70
  const apiTotalPoints = quizSubmissionResponse?.total_points ?? quizQuestions.length
  const apiEarnedPoints = quizSubmissionResponse?.earned_points ?? assessmentScore
  const apiPassed = quizSubmissionResponse?.passed ?? false
  
  // Calculate score percentage
  const apiScorePercent = apiTotalPoints > 0 ? (apiEarnedPoints / apiTotalPoints) * 100 : 0
  
  // Use API data if available, otherwise fallback to local calculation
  const passed = quizSubmissionResponse ? apiPassed : (quizQuestions.length > 0 ? (assessmentScore / quizQuestions.length) * 100 >= apiPassingScore : false)
  const scorePercent = quizSubmissionResponse ? apiScorePercent.toFixed(1) : (quizQuestions.length > 0 ? ((assessmentScore / quizQuestions.length) * 100).toFixed(1) : "0.0")

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

    // Note: Progress tracking already happens in the learnPage useEffect.
    // We do NOT re-trigger trackCourseProgress here to avoid duplicate API calls.
    // The completion flow is already handled when learnPage === totalLessons.

    setActiveSection(target)
    if (target === "evaluate") setEvaluateSubPage("resources")
  }

  const refreshCompletionStatus = async (): Promise<{ completed: boolean; certificateAvailable: boolean }> => {
    // Give backend time to process
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Use the shared checkCompletionAndCertificate which checks both is_completed AND dashboard modules
    const completed = await checkCompletionAndCertificate()
    return { completed, certificateAvailable: isCertificateAvailable }
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
      // Check if all modules are complete (even if quiz step isn't tracked)
      let allModulesComplete = false
      try {
        const dashRes = await authApi.get(API_PATHS.dashboard.courseById(courseId))
        const dashRoot = (dashRes.data && typeof dashRes.data === "object" ? dashRes.data : {}) as Record<string, unknown>
        const dashData = (dashRoot.data && typeof dashRoot.data === "object" ? dashRoot.data : {}) as Record<string, unknown>
        const progressData = (dashData.course_progress && typeof dashData.course_progress === "object" ? dashData.course_progress : dashData) as Record<string, unknown>
        const modules = (progressData.modules && Array.isArray(progressData.modules) ? progressData.modules : (dashData.modules && Array.isArray(dashData.modules) ? dashData.modules : [])) as Array<Record<string, unknown>>

        if (modules.length > 0) {
          allModulesComplete = modules.every((mod: Record<string, unknown>) => {
            if (!Boolean(mod.completed)) return false
            const topics = (mod.topics && Array.isArray(mod.topics) ? mod.topics : []) as Array<Record<string, unknown>>
            return topics.every((t: Record<string, unknown>) => Boolean(t.completed))
          })
        }
      } catch {
        // Dashboard check failed — will try submission anyway
      }

      // Try submitting feedback
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

        // Sync any remaining incomplete modules
        await syncIncompleteModules()

        // Brief wait, then check completion status + certificate
        await new Promise(resolve => setTimeout(resolve, 1500))
        await refreshCompletionStatus()

        // Navigate to completed view — certificate button fetches from API on click
        setEvaluateSubPage("completed")
      } catch (submitErr: any) {
        // Backend rejected feedback submission
        const errorMsg = submitErr?.response?.data?.message || submitErr?.message || ""
        if (errorMsg.includes("Course must be completed") || errorMsg.includes("not completed")) {
          if (allModulesComplete) {
            // All modules complete but quiz step isn't tracked (backend limitation)
            const quizMsg = quizBlockingCompletion
              ? `The quiz "${quizBlockingCompletion.quizTitle}" must be completed through LearnDash's native interface for the backend to recognize course completion. Please complete the quiz in LearnDash and try again.`
              : "The quiz step needs to be completed through LearnDash's native interface for the backend to recognize completion. Please complete the quiz in LearnDash and try again, or contact support if you've already completed it."
            setFeedbackSubmitError(quizMsg)
      } else {
            setFeedbackSubmitError("Please complete all course content (including all lessons, topics, and the quiz) before submitting feedback.")
      }
        } else {
      setFeedbackSubmitError("Unable to submit feedback right now. Please try again.")
        }
      }
    } catch {
      setFeedbackSubmitError("Unable to check course completion. Please try again.")
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
                  // Progress was already tracked when learnPage reached totalLessons (in useEffect)
                  // Just navigate to assessment
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
                // Just navigate — the learnPage useEffect handles progress tracking
                setLearnPage(learnPage + 1)
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
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">
            {currentQuizTitle || "Assessment"}
          </h1>
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
        <div className="mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
            {currentQuizTitle ? currentQuizTitle : "Assessment"}
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">Answer all questions to complete this section</p>
        </div>

        {/* Progress indicator */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-gray-700 font-medium">
              {selectedAnswers.filter((a: number | null) => a !== null).length} of {quizQuestions.length} answered
            </span>
            <span className="text-sm sm:text-base font-bold text-purple-600">
              {quizQuestions.length > 0
                ? Math.round((selectedAnswers.filter((a: number | null) => a !== null).length / quizQuestions.length) * 100)
                : 0}%
            </span>
                </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-600 to-purple-700 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${quizQuestions.length > 0 ? (selectedAnswers.filter((a: number | null) => a !== null).length / quizQuestions.length) * 100 : 0}%` }}
            />
                </div>
              </div>

        {/* Questions */}
        <div className="space-y-3 sm:space-y-4">
          {quizQuestions.map((q, qi) => (
            <div
              key={q.id}
              className={`bg-white border-2 rounded-lg p-3 sm:p-4 transition-all duration-200 shadow-sm ${
                selectedAnswers[qi] !== null
                  ? "border-purple-300 bg-purple-50/50 shadow-md"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Question number + title + text */}
              <div className="mb-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-100 text-purple-700 text-xs sm:text-sm font-bold flex items-center justify-center">
                  {qi + 1}
                </span>
                  <div className="flex-1 pt-0.5">
                    {q.questionTitle && (
                      <h3 className="font-semibold text-gray-800 text-xs sm:text-sm mb-1">
                        {q.questionTitle}
                      </h3>
                    )}
                    <p className="font-medium text-gray-900 text-sm sm:text-base leading-relaxed">
                    {q.question}
                  </p>
                  {q.description && (
                      <p className="text-gray-600 text-xs sm:text-sm mt-1 leading-relaxed">{q.description}</p>
                  )}
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2 pl-0">
                {q.options.map((opt, oi) => {
                  const isSelected = selectedAnswers[qi] === oi
                  return (
                  <button 
                    key={oi}
                    onClick={() => {
                      const copy = [...selectedAnswers]
                      copy[qi] = oi
                      setSelectedAnswers(copy)
                    }}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs sm:text-sm transition-all duration-150 flex items-center gap-2 ${
                        isSelected
                          ? "border-purple-600 bg-purple-50 text-purple-700 font-medium shadow-sm"
                          : "border-gray-200 hover:border-purple-300 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-purple-600 bg-purple-600" : "border-gray-300"
                      }`}>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="flex-1">{opt}</span>
                  </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-4 sm:mt-6 bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          {quizSubmitError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-xs sm:text-sm">{quizSubmitError}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {!allAnswered && (
              <p className="text-amber-600 text-xs sm:text-sm font-medium">
              Please answer all questions before submitting.
            </p>
          )}
            <div className={`${!allAnswered ? 'sm:ml-auto' : 'w-full sm:w-auto'}`}>
                        <button
            onClick={handleCheckAnswers}
            disabled={!allAnswered || isSubmittingQuiz}
                className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 ${
              allAnswered && !isSubmittingQuiz
                    ? "bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
              {isSubmittingQuiz ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                "Submit Assessment"
              )}
          </button>
            </div>
          </div>
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
              : `You need ${quizSubmissionResponse?.passing_score ?? 70}% to pass. Please review the material and try again.`}
          </p>
          {quizSubmissionResponse && (
            <div className="mt-2 text-xs text-gray-600">
              Score: {quizSubmissionResponse.earned_points ?? 0} / {quizSubmissionResponse.total_points ?? 0} points
              {quizSubmissionResponse.attempt_number && (
                <span className="ml-2">(Attempt {quizSubmissionResponse.attempt_number})</span>
              )}
            </div>
          )}
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
        {quizSubmissionResponse?.course_progress && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Course Progress: {quizSubmissionResponse.course_progress.completed_steps ?? 0} / {quizSubmissionResponse.course_progress.total_steps ?? 0} steps 
              ({quizSubmissionResponse.course_progress.percentage?.toFixed(1) ?? 0}%)
            </p>
          </div>
        )}
        <div className="space-y-6">
          {quizQuestions.map((q, qi) => {
            // Get API result for this question if available
            const questionId = String(q.questionId ?? q.id)
            const apiResult = quizSubmissionResponse?.question_results?.[questionId]
            const isCorrectFromApi = apiResult?.is_correct
            const userAnswerFromApi = apiResult?.user_answer
            const correctAnswerFromApi = apiResult?.correct_answer
            const userAnswer = selectedAnswers[qi]
            // Use API result if available, otherwise use local calculation
            const isCorrect = apiResult ? (isCorrectFromApi ?? false) : (userAnswer === q.correctAnswer)
            // Convert API's 1-based answer to 0-based for display (if API result exists)
            const userAnswerIndex = apiResult && typeof userAnswerFromApi === "number" 
              ? userAnswerFromApi - 1 // Convert from 1-based to 0-based
              : userAnswer
            // Get correct answer indices from API (convert from 1-based to 0-based)
            const correctAnswerIndices = apiResult && Array.isArray(correctAnswerFromApi)
              ? correctAnswerFromApi.map((ans: number | string) => {
                  if (typeof ans === "number") return ans - 1
                  // If it's a string, try to find the matching option index
                  const optIndex = q.options.findIndex(opt => opt.toLowerCase() === String(ans).toLowerCase())
                  return optIndex >= 0 ? optIndex : 0
                })
              : [q.correctAnswer]

            return (
              <div key={q.id} className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-5">
                <div className="flex items-start gap-2 mb-3">
                  {isCorrect ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    {q.questionTitle && (
                      <h4 className="font-semibold text-gray-800 text-xs sm:text-sm mb-1">
                        {q.questionTitle}
                      </h4>
                    )}
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {q.questionTitle ? q.question : `Q${qi + 1}: ${q.question}`}
                  </h4>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {q.options.map((opt, oi) => {
                    // Use API results if available
                    const isCorrectOpt = apiResult 
                      ? correctAnswerIndices.includes(oi)
                      : oi === q.correctAnswer
                    const isUserOpt = apiResult
                      ? (typeof userAnswerIndex === "number" && oi === userAnswerIndex)
                      : oi === userAnswer
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

  const getFeaturePageUrl = (title: string): string | null => {
    const titleLower = title.toLowerCase()
    // Certificate of Completion
    if (titleLower.includes("certificate") && titleLower.includes("completion")) {
      return `/course/${courseId}/features/certificate`
    }
    // Lifetime Access
    if (titleLower.includes("lifetime") && titleLower.includes("access")) {
      return `/course/${courseId}/features/lifetime-access`
    }
    // Quizzes & Assessments
    if ((titleLower.includes("quiz") || titleLower.includes("quizzes")) && 
        (titleLower.includes("assessment") || titleLower.includes("assessments"))) {
      return `/course/${courseId}/features/quizzes-assessments`
    }
    // Downloadable Resources
    if ((titleLower.includes("downloadable") || titleLower.includes("download")) && 
        (titleLower.includes("resource") || titleLower.includes("resources"))) {
      return `/course/${courseId}/features/downloadable-resources`
    }
    return null
  }

  const renderResources = () => (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">Resources</h1>
      <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">Additional resources and further reading</p>

      <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-6 space-y-2 sm:space-y-3">
        {resources.map((r, i) => {
          const featurePageUrl = getFeaturePageUrl(r.title)
          const hasLink = r.url || featurePageUrl
          
          return (
          <button
            key={r.id || i}
            type="button"
              onClick={() => {
                if (featurePageUrl) {
                  router.push(featurePageUrl)
                } else if (r.url) {
                  handleOpenResource(r)
                }
              }}
              disabled={!hasLink}
            className={`w-full flex items-center justify-between p-3 sm:p-4 border rounded-lg sm:rounded-xl transition-colors group ${
                hasLink
                ? "border-gray-200 hover:border-purple-300 hover:bg-purple-50/30"
                : "border-gray-200 bg-gray-50 cursor-not-allowed"
            }`}
          >
            <div className="flex items-start gap-3 text-left">
                <Link2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${hasLink ? "text-purple-600" : "text-gray-400"}`} />
              <div>
                  <h3 className={`font-semibold text-sm sm:text-base transition-colors ${hasLink ? "text-gray-900 group-hover:text-purple-700" : "text-gray-700"}`}>
                  {i + 1}. {r.title}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{r.description}</p>
              </div>
            </div>
              <span className={`text-xs sm:text-sm font-medium ${hasLink ? "text-purple-600" : "text-gray-400"}`}>
                {resourceActionLoadingId === r.id ? "Opening..." : featurePageUrl ? "View" : r.url ? "Open" : "No link"}
            </span>
          </button>
          )
        })}
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
      <div className="bg-green-50 border-green-200 border rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-start gap-2 sm:gap-3">
          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-green-800">
              Course Completed!
            </h2>
            <p className="text-green-700 text-xs sm:text-sm">
              Congratulations on completing this CPD course.
            </p>
          </div>
        </div>
      </div>

      {/* Quiz Blocking Completion Warning */}
      {quizBlockingCompletion && (
        <div className="bg-amber-50 border-amber-200 border rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-bold text-amber-800 mb-2">
                Quiz Required for Certificate
              </h3>
              <p className="text-amber-700 text-xs sm:text-sm mb-3">
                All course content is complete, but the quiz <strong>"{quizBlockingCompletion.quizTitle}"</strong> must be completed through LearnDash's native interface for the backend to recognize course completion and generate your certificate.
              </p>
              <p className="text-amber-700 text-xs sm:text-sm">
                <strong>Next step:</strong> Complete the quiz in LearnDash, then return here to view your certificate. The quiz completion cannot be recorded through this custom interface.
              </p>
          </div>
        </div>
      </div>
      )}

      {/* Certificate & Actions */}
      <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-purple-600 font-semibold text-sm sm:text-base mb-3">Next Steps</h3>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 mb-4">
          <p className="text-purple-700 text-xs sm:text-sm">
            Add a reflection to your training to receive your CPD certificate and log these hours to your CPD record.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <button
            onClick={() => {
              // Navigate to certificate view page which will fetch and display the certificate
              router.push(`/course/${courseId}/certificate`)
            }}
            className="px-3 sm:px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <Award className="w-4 h-4" />
            View Certificate
          </button>
          {certificateDownloadUrl && (
            <button
              onClick={() => window.open(certificateDownloadUrl, '_blank')}
              className="px-3 sm:px-4 py-2.5 sm:py-3 border border-green-300 text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <Download className="w-4 h-4" />
              Download Certificate
            </button>
          )}
                  <button
            onClick={async () => {
              const shareUrl = certificateUrl || window.location.href
              try {
                if (navigator.share) {
                  await navigator.share({
                    title: `CPD Course Completed - ${course?.course?.title || "Course"}`,
                    text: `I have successfully completed the ${course?.course?.title || "course"} and earned ${courseDetails.cpdHours} CPD hours!`,
                    url: shareUrl,
                  })
                } else {
                  await navigator.clipboard.writeText(shareUrl)
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
          {courseDetails.learningOutcomes.slice(0, 3).map((item: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              {item}
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
