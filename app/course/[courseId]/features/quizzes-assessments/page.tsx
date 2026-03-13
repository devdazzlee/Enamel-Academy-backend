"use client"

import { useParams, useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ArrowLeft, FileText, CheckCircle, Award } from "lucide-react"

export default function QuizzesAssessmentsFeaturePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-6 text-sm sm:text-base"
        >
          <ArrowLeft size={16} />
          <span>Back to Course</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-purple-100 mb-4">
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Quizzes & Assessments
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Test your knowledge and track your progress
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-purple-800 mb-3">About Course Assessments</h2>
              <p className="text-purple-700 text-sm sm:text-base mb-4">
                This course includes interactive quizzes and assessments designed to reinforce your learning 
                and ensure you've mastered the key concepts.
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Assessment Features</h3>
              <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Interactive Quizzes</span>
                    <p className="text-gray-600 text-sm mt-1">Test your understanding with multiple-choice and practical questions</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Immediate Feedback</span>
                    <p className="text-gray-600 text-sm mt-1">Receive instant results and explanations for each question</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Progress Tracking</span>
                    <p className="text-gray-600 text-sm mt-1">Monitor your performance and identify areas for improvement</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Certificate Requirement</span>
                    <p className="text-gray-600 text-sm mt-1">Complete assessments to qualify for your course completion certificate</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Passing Requirements</h4>
                  <p className="text-blue-700 text-sm">
                    Most assessments require a passing score of 70% or higher. You can retake assessments 
                    to improve your score. Check the specific requirements in the course materials.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">How to Access Assessments</h4>
              <p className="text-gray-600 text-sm">
                Navigate to the "Assess" section of the course to begin taking quizzes. Complete all 
                required assessments to progress through the course and earn your certificate.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
