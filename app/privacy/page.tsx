"use client"

import React from "react"
import Link from "next/link"

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#e8e8e8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/logo.svg" 
            alt="Enamel Academy" 
            className="h-16 w-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-[#1a1a1a]">Privacy Policy</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">1. Information We Collect</h2>
            <p className="text-[#6b7280] leading-relaxed">
              We collect information you provide directly to us, such as when you create an account, enroll in courses, or contact us. This may include:
            </p>
            <ul className="list-disc list-inside text-[#6b7280] mt-2 space-y-1">
              <li>Name, email address, and contact information</li>
              <li>Professional credentials and dental license information</li>
              <li>Payment information (processed securely through third-party providers)</li>
              <li>Course progress and completion data</li>
              <li>Communications with our support team</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">2. How We Use Your Information</h2>
            <p className="text-[#6b7280] leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-[#6b7280] mt-2 space-y-1">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices and support messages</li>
              <li>Communicate with you about courses, services, and promotional offers</li>
              <li>Monitor and analyze trends and usage</li>
              <li>Detect, investigate, and prevent security incidents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">3. Information Sharing</h2>
            <p className="text-[#6b7280] leading-relaxed">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy:
            </p>
            <ul className="list-disc list-inside text-[#6b7280] mt-2 space-y-1">
              <li>Payment processors for transaction processing</li>
              <li>Service providers who assist in operating our platform</li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">4. Data Security</h2>
            <p className="text-[#6b7280] leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">5. Cookies and Tracking Technologies</h2>
            <p className="text-[#6b7280] leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">6. Data Retention</h2>
            <p className="text-[#6b7280] leading-relaxed">
              We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. Course completion records are retained indefinitely for certification purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">7. Your Rights</h2>
            <p className="text-[#6b7280] leading-relaxed">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside text-[#6b7280] mt-2 space-y-1">
              <li>Access and update your personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to processing of your personal information</li>
              <li>Request a copy of your personal information</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">8. Children's Privacy</h2>
            <p className="text-[#6b7280] leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">9. International Data Transfers</h2>
            <p className="text-[#6b7280] leading-relaxed">
              Your personal information may be transferred to, and maintained on, computers located outside of your state, province, country or other governmental jurisdiction where data protection laws may differ from those of your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">10. Changes to This Privacy Policy</h2>
            <p className="text-[#6b7280] leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">11. Contact Us</h2>
            <p className="text-[#6b7280] leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              Email: privacy@enamelacademy.com
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
