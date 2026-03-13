"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Award, Download, CheckCircle, Eye } from "lucide-react"
import { useEffect, useState } from "react"
import { certificatesService } from "@/lib/api/certificates"

export default function CertificateViewPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!courseId) return
    const fetchCertificate = async () => {
      try {
        setLoading(true)
        setError("")
        const res = await certificatesService.getCourseCertificate(courseId)
        const root = (res && typeof res === "object" ? res : {}) as Record<string, unknown>
        const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>
        const url = (data.certificate_url ?? data.certificateUrl) as string | undefined
        const dlUrl = (data.download_url ?? data.downloadUrl) as string | undefined
        
        if (url) {
          setCertificateUrl(url)
          if (dlUrl) setDownloadUrl(dlUrl)
        } else {
          const errorMsg = typeof root.message === "string" ? root.message : ""
          if (errorMsg.includes("not completed")) {
            setError("Certificate is not available yet. Please complete the course first.")
          } else {
            setError("Certificate is not available yet. The backend may still be processing your completion.")
          }
        }
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || err?.message || ""
        if (errorMsg.includes("not completed")) {
          setError("Certificate is not available yet. Please complete the course first.")
        } else {
          setError("Unable to fetch certificate. Please try again later.")
        }
      } finally {
        setLoading(false)
      }
    }
    fetchCertificate()
  }, [courseId])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Certificate</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-purple-100 mb-4">
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Certificate of Completion
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Download your certificate upon successful course completion
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">Loading certificate...</p>
            </div>
          ) : error ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <p className="text-amber-800 text-sm sm:text-base">{error}</p>
            </div>
          ) : certificateUrl ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-green-800 mb-2">Certificate Available</h2>
                <p className="text-green-700 text-sm sm:text-base mb-4">
                  Your certificate is ready for download. Click the buttons below to view and download it.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    <Eye size={18} />
                    View Certificate
                  </a>
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 border-2 border-green-600 text-green-700 rounded-lg font-semibold hover:bg-green-50 transition-colors"
                    >
                      <Download size={18} />
                      Download Certificate
                    </a>
                  )}
                </div>
              </div>

              {/* Certificate Preview */}
              {certificateUrl && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 mb-3">Certificate Preview</h3>
                  <div className="aspect-[8.5/11] bg-white rounded border-2 border-gray-300 shadow-sm overflow-hidden">
                    <iframe
                      src={certificateUrl}
                      className="w-full h-full"
                      title="Certificate Preview"
                    />
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">About Certificates</h3>
                <ul className="space-y-2 text-sm sm:text-base text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <span>Certificates are issued upon successful completion of all course requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <span>Certificates include CPD hours and can be used for professional development records</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <span>You can download and print your certificate at any time</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
