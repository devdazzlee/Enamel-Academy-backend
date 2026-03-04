"use client"

import React from "react"
import Link from "next/link"

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#e8e8e8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/logo.svg" 
            alt="Enamel Academy" 
            className="h-16 w-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-[#1a1a1a]">Terms & Conditions</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">1. Acceptance of Terms</h2>
            <p className="text-[#6b7280] leading-relaxed">
              By accessing and using Enamel Academy, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">2. Use License</h2>
            <p className="text-[#6b7280] leading-relaxed">
              Permission is granted to temporarily access the materials (courses, videos, documents) on Enamel Academy for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-[#6b7280] mt-2 space-y-1">
              <li>modify or copy the materials</li>
              <li>use the materials for any commercial purpose or for any public display</li>
              <li>attempt to reverse engineer any software contained on Enamel Academy</li>
              <li>remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">3. Course Access and Enrollment</h2>
            <p className="text-[#6b7280] leading-relaxed">
              Upon successful enrollment and payment where applicable, you will be granted access to the enrolled courses for the duration specified. Access may be revoked for violations of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">4. User Account Responsibilities</h2>
            <p className="text-[#6b7280] leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account. Enamel Academy reserves the right to refuse service, terminate accounts, or remove or edit content in its sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">5. Refund Policy</h2>
            <p className="text-[#6b7280] leading-relaxed">
              Refunds are available within 14 days of purchase if you have not completed more than 20% of the course content. All refund requests must be submitted in writing and are subject to review and approval.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">6. Intellectual Property</h2>
            <p className="text-[#6b7280] leading-relaxed">
              All course materials, including but not limited to videos, documents, quizzes, and other educational content, are the intellectual property of Enamel Academy or its content partners and are protected by copyright and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">7. Limitation of Liability</h2>
            <p className="text-[#6b7280] leading-relaxed">
              In no event shall Enamel Academy or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Enamel Academy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">8. Governing Law</h2>
            <p className="text-[#6b7280] leading-relaxed">
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which Enamel Academy operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">9. Changes to Terms</h2>
            <p className="text-[#6b7280] leading-relaxed">
              Enamel Academy reserves the right to revise these terms at any time. By continuing to use this service after such revisions, you agree to be bound by the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">10. Contact Information</h2>
            <p className="text-[#6b7280] leading-relaxed">
              If you have any questions about these Terms & Conditions, please contact us at:
              <br />
              Email: legal@enamelacademy.com
              <br />
              Phone: +1 (555) 123-4567
            </p>
          </section>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-[#6b7280] text-center">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#7c3aed] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
