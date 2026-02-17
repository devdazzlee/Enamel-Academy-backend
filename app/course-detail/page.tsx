import { Suspense } from "react"
import { CourseDetailClient } from "./course-detail-client"

export default function CourseDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">Loading course...</p>
        </div>
      }
    >
      <CourseDetailClient />
    </Suspense>
  )
}
