"use client"

import { useParams, useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ArrowLeft, Download, CheckCircle, FileText } from "lucide-react"

export default function DownloadableResourcesFeaturePage() {
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
              <Download className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Downloadable Resources
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Access supplementary materials to enhance your learning
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-purple-800 mb-3">Course Resources</h2>
              <p className="text-purple-700 text-sm sm:text-base mb-4">
                This course includes a variety of downloadable resources to support your learning journey, 
                including PDFs, worksheets, templates, and reference materials.
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Available Resources</h3>
              <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">PDF Guides & Handouts</span>
                    <p className="text-gray-600 text-sm mt-1">Comprehensive reference materials and study guides</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Worksheets & Templates</span>
                    <p className="text-gray-600 text-sm mt-1">Practical tools to apply what you've learned</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Reference Documents</span>
                    <p className="text-gray-600 text-sm mt-1">Additional reading materials and documentation</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Video Transcripts</span>
                    <p className="text-gray-600 text-sm mt-1">Text versions of video content for easy reference</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">How to Access Resources</h4>
                  <p className="text-gray-600 text-sm mb-3">
                    Navigate to the "Resources" section in the course player to view and download all available materials. 
                    Resources are organized by lesson and can be downloaded individually or as a complete set.
                  </p>
                  <p className="text-gray-600 text-sm">
                    All resources are available for download throughout your lifetime access to the course.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Download Tips</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Resources are available in PDF format for easy viewing and printing</li>
                    <li>• Download resources to your device for offline access</li>
                    <li>• Resources are updated periodically - check back for new materials</li>
                  </ul>
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
