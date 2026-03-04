"use client"

import React, { useState } from "react"
import Link from "next/link"

export default function CookiesPage() {
  const [preferences, setPreferences] = useState({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  })

  const handlePreferenceChange = (category: keyof typeof preferences) => {
    if (category === 'necessary') return // Necessary cookies cannot be disabled
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const handleSavePreferences = () => {
    // Save preferences to localStorage or cookie
    localStorage.setItem('cookiePreferences', JSON.stringify(preferences))
    // In a real app, this would also update the actual cookie settings
    alert('Cookie preferences saved!')
  }

  return (
    <main className="min-h-screen bg-[#e8e8e8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/logo.svg" 
            alt="Enamel Academy" 
            className="h-16 w-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-[#1a1a1a]">Cookie Policy</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">What Are Cookies</h2>
            <p className="text-[#6b7280] leading-relaxed">
              Cookies are small text files that are placed on your computer or mobile device when you visit our website. They allow us to recognize you and remember your preferences, improve your experience, and analyze how our website is used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">How We Use Cookies</h2>
            <p className="text-[#6b7280] leading-relaxed">
              We use cookies and similar tracking technologies for the following purposes:
            </p>
            <ul className="list-disc list-inside text-[#6b7280] mt-2 space-y-1">
              <li>To remember your login credentials and preferences</li>
              <li>To track your course progress and completion</li>
              <li>To analyze website traffic and usage patterns</li>
              <li>To personalize your learning experience</li>
              <li>To provide customer support</li>
              <li>To detect and prevent fraudulent activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">Types of Cookies We Use</h2>
            
            <div className="space-y-4 mt-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#1a1a1a">Essential Cookies</h3>
                  <input
                    type="checkbox"
                    checked={preferences.necessary}
                    disabled
                    className="w-4 h-4 text-[#8b5cf6] bg-gray-100 border-gray-300 rounded"
                  />
                </div>
                <p className="text-sm text-[#6b7280]">
                  These cookies are necessary for the website to function and cannot be switched off. They include authentication and security features.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#1a1a1a">Functional Cookies</h3>
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={() => handlePreferenceChange('functional')}
                    className="w-4 h-4 text-[#8b5cf6] bg-gray-100 border-gray-300 rounded"
                  />
                </div>
                <p className="text-sm text-[#6b7280]">
                  These cookies enable enhanced functionality and personalization, such as remembering your course progress and preferences.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#1a1a1a">Analytics Cookies</h3>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={() => handlePreferenceChange('analytics')}
                    className="w-4 h-4 text-[#8b5cf6] bg-gray-100 border-gray-300 rounded"
                  />
                </div>
                <p className="text-sm text-[#6b7280]">
                  These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#1a1a1a">Marketing Cookies</h3>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={() => handlePreferenceChange('marketing')}
                    className="w-4 h-4 text-[#8b5cf6] bg-gray-100 border-gray-300 rounded"
                  />
                </div>
                <p className="text-sm text-[#6b7280]">
                  These cookies are used to deliver advertisements that are relevant to you and your interests, and to track the effectiveness of our marketing campaigns.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">Third-Party Cookies</h2>
            <p className="text-[#6b7280] leading-relaxed">
              We may use third-party services that place their own cookies on your device. These include:
            </p>
            <ul className="list-disc list-inside text-[#6b7280] mt-2 space-y-1">
              <li>Google Analytics for website analytics</li>
              <li>Payment processors for secure transactions</li>
              <li>Video hosting platforms for course content</li>
              <li>Social media platforms for sharing functionality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">Managing Your Cookie Preferences</h2>
            <p className="text-[#6b7280] leading-relaxed">
              You can control and manage cookies in various ways:
            </p>
            <ul className="list-disc list-inside text-[#6b7280] mt-2 space-y-1">
              <li>Use the cookie settings panel on this page</li>
              <li>Adjust your browser settings to block or delete cookies</li>
              <li>Use browser extensions that manage cookie preferences</li>
              <li>Opt out of third-party advertising cookies through industry initiatives</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">Cookie Duration</h2>
            <p className="text-[#6b7280] leading-relaxed">
              Session cookies are deleted when you close your browser. Persistent cookies remain on your device for a specified period (typically 30 days to 1 year) or until you delete them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">Your Rights</h2>
            <p className="text-[#6b7280] leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-[#6b7280] mt-2 space-y-1">
              <li>Accept or reject non-essential cookies</li>
              <li>Withdraw consent at any time</li>
              <li>View and manage your cookie preferences</li>
              <li>Request information about cookies we use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">Updates to This Policy</h2>
            <p className="text-[#6b7280] leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-3">Contact Us</h2>
            <p className="text-[#6b7280] leading-relaxed">
              If you have any questions about our use of cookies, please contact us at:
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

        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={handleSavePreferences}
            className="px-6 py-3 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#7c3aed] transition-colors"
          >
            Save Preferences
          </button>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
