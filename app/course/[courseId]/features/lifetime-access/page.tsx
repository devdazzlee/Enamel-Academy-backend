"use client"

import { useParams, useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ArrowLeft, Clock, CheckCircle, Infinity } from "lucide-react"

export default function LifetimeAccessFeaturePage() {
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
              <Infinity className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Lifetime Access
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Access your course materials anytime, anywhere, forever
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-purple-800 mb-3">What Lifetime Access Means</h2>
              <p className="text-purple-700 text-sm sm:text-base mb-4">
                When you enroll in this course, you receive unlimited, lifetime access to all course materials, 
                including videos, resources, and updates.
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Benefits of Lifetime Access</h3>
              <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Learn at Your Own Pace</span>
                    <p className="text-gray-600 text-sm mt-1">No deadlines or time restrictions - study when it's convenient for you</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Revisit Content Anytime</span>
                    <p className="text-gray-600 text-sm mt-1">Review lessons and materials as many times as you need</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Future Updates Included</span>
                    <p className="text-gray-600 text-sm mt-1">Receive access to course updates and new content automatically</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">No Expiration Date</span>
                    <p className="text-gray-600 text-sm mt-1">Your access never expires, even if you take a break from learning</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Access Duration</h4>
                  <p className="text-gray-600 text-sm">
                    Your lifetime access begins immediately upon enrollment and continues indefinitely. 
                    You can access the course from any device with an internet connection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
