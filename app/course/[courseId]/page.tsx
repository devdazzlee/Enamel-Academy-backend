"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { useApp } from "@/lib/app-context"
import { authApi } from "@/lib/api/http"

type Section = "about" | "learn" | "assess" | "evaluate"
type EvaluateSubPage = "resources" | "feedback" | "completed"

interface Answer {
  questionId: number
  selectedOption: number | null
}

// ─── Data ──────────────────────────────────────────────────────────

const courseDetails = {
  cpdHours: 3,
  category: "Clinical",
  level: "Intermediate",
  aims: [
    "To provide dental professionals with the knowledge and skills to effectively manage medical emergencies in dental practice",
    "To ensure practitioners can recognize signs and symptoms of common medical emergencies",
    "To build confidence in emergency response protocols and procedures",
  ],
  objectives: [
    "Identify the signs and symptoms of common medical emergencies in dental settings",
    "Demonstrate proper emergency assessment techniques",
    "Apply appropriate emergency management protocols",
    "Perform basic life support (BLS) according to current guidelines",
    "Understand the use of emergency drugs and equipment",
  ],
  learningOutcomes: [
    "Recognize and assess medical emergencies quickly and accurately",
    "Perform CPR and use an AED effectively",
    "Manage common emergencies including syncope, anaphylaxis, and cardiac events",
    "Work effectively as part of an emergency response team",
    "Document emergency incidents appropriately",
  ],
  gdcOutcomes: [
    "Outcome A: Effective communication with patients",
    "Outcome C: Maintenance and development of knowledge and skills",
    "Outcome D: Quality assurance and improvement",
  ],
  topics: [
    "Introduction to medical emergencies",
    "Patient assessment and vital signs",
    "Basic Life Support (BLS)",
    "Advanced emergency procedures",
    "Emergency drugs and equipment",
    "Documentation and incident reporting",
  ],
}

const learnPages = [
  {
    title: "Introduction to Medical Emergencies",
    content: (
      <div className="space-y-6">
        <div className="space-y-4 text-gray-700 leading-relaxed text-sm sm:text-base">
          <p>
            Medical emergencies in dental practice, though relatively rare, require immediate recognition and
            appropriate management to ensure patient safety.
          </p>
          <p>
            As a dental professional, you must be prepared to handle emergency situations confidently and
            competently. This course will equip you with the essential knowledge and skills needed to manage
            the most common medical emergencies encountered in dental settings.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Why This Training Matters</h3>
          <ul className="space-y-2 ml-4">
            {[
              "Medical emergencies can occur at any time during dental treatment",
              "Prompt recognition and management can be life-saving",
              "All dental team members must be prepared to respond",
              "Regular training maintains competence and confidence",
            ].map((item, i) => (
              <li key={i} className="text-gray-700 text-sm sm:text-base">{item}</li>
            ))}
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: "Emergency Preparedness",
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Essential Emergency Equipment</h3>
          <p className="text-gray-700 mb-4 text-sm sm:text-base">
            Every dental practice must have appropriate emergency equipment readily available and
            regularly maintained.
          </p>
          <ul className="space-y-2 ml-6">
            {[
              "Automated External Defibrillator (AED)",
              "Emergency oxygen with appropriate delivery devices",
              "Emergency drugs kit (including adrenaline, aspirin, GTN, glucagon)",
              "Bag-valve-mask for ventilation",
              "Suction equipment",
            ].map((item, i) => (
              <li key={i} className="text-gray-700 text-sm sm:text-base">{item}</li>
            ))}
          </ul>
        </div>
        <div className="border-l-4 border-purple-600 bg-purple-50 p-4 rounded-r-lg">
          <h4 className="font-semibold text-purple-700 mb-1">Key Point</h4>
          <p className="text-purple-700 text-sm">
            All team members should know the location of emergency equipment and check it regularly according to your
            practice protocols.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Recognition of Emergency Signs",
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Common Warning Signs</h3>
          <p className="text-gray-700 mb-4 text-sm sm:text-base">
            Early recognition of medical emergencies is crucial for positive outcomes. Be alert to these
            warning signs:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 mb-3">Cardiovascular</h4>
              {["Chest pain or discomfort", "Irregular pulse", "Pale, clammy skin", "Shortness of breath"].map((s, i) => (
                <p key={i} className="text-gray-700 text-sm mb-1">• {s}</p>
              ))}
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 mb-3">Respiratory</h4>
              {["Difficulty breathing", "Wheezing or stridor", "Cyanosis (blue lips/skin)", "Use of accessory muscles"].map((s, i) => (
                <p key={i} className="text-gray-700 text-sm mb-1">• {s}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Emergency Response Procedures",
    content: (
      <div className="space-y-3 sm:space-y-4">
        {/* Video Placeholder */}
        <div className="bg-gray-900 rounded-lg sm:rounded-xl overflow-hidden">
          <div className="aspect-video flex flex-col items-center justify-center relative px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-600 rounded-full flex items-center justify-center mb-3 sm:mb-4 cursor-pointer hover:bg-purple-700 transition-colors">
              <Play className="w-5 h-5 sm:w-7 sm:h-7 text-white ml-0.5 sm:ml-1" />
            </div>
            <h4 className="text-white font-semibold text-sm sm:text-lg text-center">BLS and Emergency Management</h4>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">18:30</p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
              <div className="h-1 bg-purple-600 w-0" />
            </div>
          </div>
          {/* Video Controls */}
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-gray-800">
            <SkipBack className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 cursor-pointer flex-shrink-0" />
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0">
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white ml-0.5" />
            </div>
            <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 cursor-pointer flex-shrink-0" />
            <span className="text-gray-400 text-xs sm:text-sm ml-1 sm:ml-2 whitespace-nowrap">0:00 / 18:30</span>
            <div className="flex-1" />
            <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 cursor-pointer flex-shrink-0" />
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 cursor-pointer flex-shrink-0 hidden sm:block" />
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 cursor-pointer flex-shrink-0" />
          </div>
        </div>
        <div className="flex items-start gap-2 sm:gap-3 bg-purple-50 border border-purple-200 rounded-lg p-2.5 sm:p-3">
          <Play className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <p className="text-purple-700 text-xs sm:text-sm">
            Please watch the complete video presentation before proceeding to the next section.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Consent and Declaration",
    content: "consent", // special marker – rendered separately with checkbox state
  },
]

const quizQuestions = [
  {
    id: 1,
    question: "What is the first step in managing a patient who has collapsed in the dental chair?",
    options: ["Administer oxygen immediately", "Check for responsiveness and call for help", "Start chest compressions", "Give oral glucose"],
    correctAnswer: 1,
    explanation: "The first priority is to check if the patient is responsive and immediately call for help. This follows the basic emergency response protocol (DRS ABC - Danger, Response, Send for help).",
  },
  {
    id: 2,
    question: "What is the recommended compression-to-ventilation ratio for adult CPR?",
    options: ["15:2", "30:2", "15:1", "30:1"],
    correctAnswer: 1,
    explanation: "The current Resuscitation Council UK guidelines recommend 30 chest compressions followed by 2 rescue breaths for adult CPR.",
  },
  {
    id: 3,
    question: "Which medication should be administered first in suspected anaphylaxis?",
    options: ["Antihistamine (oral)", "Corticosteroid (oral)", "Adrenaline (intramuscular)", "Salbutamol (inhaled)"],
    correctAnswer: 2,
    explanation: "Intramuscular adrenaline (epinephrine) 1:1000 is the first-line treatment for anaphylaxis and should be administered immediately to the anterolateral thigh.",
  },
  {
    id: 4,
    question: "What is the normal range for adult resting heart rate?",
    options: ["40-60 bpm", "60-100 bpm", "100-120 bpm", "120-140 bpm"],
    correctAnswer: 1,
    explanation: "The normal resting heart rate for adults ranges from 60 to 100 beats per minute. Rates outside this range may indicate underlying medical conditions.",
  },
  {
    id: 5,
    question: "In a patient experiencing syncope (fainting), what position should they be placed in?",
    options: ["Sitting upright", "Recovery position", "Supine with legs elevated", "Prone position"],
    correctAnswer: 2,
    explanation: "A patient with syncope should be placed supine (flat on their back) with legs elevated to improve blood flow to the brain and aid recovery.",
  },
]

const resources = [
  { title: "Resuscitation Council UK - Guidelines", description: "Latest resuscitation guidelines and resources" },
  { title: "BNF - Emergency Drugs", description: "British National Formulary guidance on emergency medications" },
  { title: "GDC - Standards for the Dental Team", description: "Professional standards and guidance" },
  { title: "NHS - Medical Emergencies", description: "Patient information and emergency procedures" },
]

const feedbackCriteria = [
  "The course aims and objectives were met",
  "The course was clear and easy to understand",
  "The course meets SMART objectives",
  "The training experience was enjoyable",
  "The course met my learning expectations",
  "The course links to my personal development plan",
]

// ─── Component ─────────────────────────────────────────────────────

export default function CoursePlayerPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Navigation
  const [activeSection, setActiveSection] = useState<Section>("about")
  const [contentsOpen, setContentsOpen] = useState(true)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Learn
  const [learnPage, setLearnPage] = useState(0)
  const [consentChecked, setConsentChecked] = useState(false)

  // Assess
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [showResult, setShowResult] = useState(false)
  const [showAlert, setShowAlert] = useState(false)

  // Evaluate
  const [evaluateSubPage, setEvaluateSubPage] = useState<EvaluateSubPage>("resources")

  // Assess
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(quizQuestions.map(() => null))
  const [showResults, setShowResults] = useState(false)
  const [assessmentScore, setAssessmentScore] = useState(0)

  // Evaluate additional state
  const [ratings, setRatings] = useState<number[]>(feedbackCriteria.map(() => 0))
  const [feedbackComment, setFeedbackComment] = useState("")

  // Fetch course data from API
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await authApi.get(`/wp-json/reactapi/v1/courses/?id=${courseId}`)
        const data = response.data
        if (data.success && data.data) {
          setCourse(data.data)
        } else {
          setError("Course not found")
        }
      } catch (err) {
        setError("Failed to load course")
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      fetchCourse()
    }
  }, [courseId])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [activeSection, learnPage, evaluateSubPage])

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

  // ─── Helpers ────────────────────────────────────

  const sectionItems: { key: Section; label: string; number: number }[] = [
    { key: "about", label: "About", number: 1 },
    { key: "learn", label: "Learn", number: 2 },
    { key: "assess", label: "Assess", number: 3 },
    { key: "evaluate", label: "Evaluate", number: 4 },
  ]

  const handleCheckAnswers = () => {
    const unanswered = selectedAnswers.filter((a) => a === null).length
    if (unanswered > 0) return
    let correct = 0
    quizQuestions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctAnswer) correct++
    })
    setAssessmentScore(correct)
    setShowResults(true)
  }

  const handleRetry = () => {
    setSelectedAnswers(quizQuestions.map(() => null))
    setShowResults(false)
    setAssessmentScore(0)
  }

  const passed = (assessmentScore / quizQuestions.length) * 100 >= 80
  const scorePercent = ((assessmentScore / quizQuestions.length) * 100).toFixed(1)

  const handleSubmitFeedback = () => {
    setEvaluateSubPage("completed")
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
                onClick={() => {
                  setActiveSection(item.key)
                  if (item.key === "evaluate") setEvaluateSubPage("resources")
                }}
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
              <a key={i} href="#" className="flex items-start gap-2 text-sm text-purple-600 hover:text-purple-800 transition-colors">
                <Link2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="leading-tight">{r.title}</span>
              </a>
            ))}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {courseDetails.topics.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0" />
                {t}
              </div>
            ))}
          </div>
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
                  setActiveSection("assess")
                  setShowResults(false)
                  setSelectedAnswers(quizQuestions.map(() => null))
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
              onClick={() => setLearnPage(learnPage + 1)}
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
    const allAnswered = selectedAnswers.every((a) => a !== null)

    return (
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">Assessment</h1>
        <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">Answer all questions to complete this section</p>

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
          <a
            key={i}
            href="#"
            className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg sm:rounded-xl hover:border-purple-300 hover:bg-purple-50/30 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <Link2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base group-hover:text-purple-700 transition-colors">
                  {r.title}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{r.description}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </a>
        ))}
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
          className="px-3 sm:px-5 py-2 sm:py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
        >
          Submit Feedback
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
      </div>
    </div>
  )

  const renderCompleted = () => (
    <div>
      {/* Course Completed Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-start gap-2 sm:gap-3">
          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-green-800">Course Completed!</h2>
            <p className="text-green-700 text-xs sm:text-sm">Congratulations on completing this CPD course</p>
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
