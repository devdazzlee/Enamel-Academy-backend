"use client"

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { CheckCircle, ArrowRight, BookOpen, Home } from 'lucide-react';

export default function ThankYouPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard after 10 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 10000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-md w-full text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Thank You!
          </h1>
          
          <p className="text-muted-foreground mb-8 text-sm sm:text-base">
            Your request has been processed successfully. We appreciate your time and look forward to helping you on your learning journey.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <ArrowRight size={20} />
            </button>
            
            <button 
              onClick={() => router.push('/courses')}
              className="w-full px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition flex items-center justify-center gap-2"
            >
              <BookOpen size={20} />
              Browse Courses
            </button>

            <button 
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition flex items-center justify-center gap-2 text-sm"
            >
              <Home size={18} />
              Back to Home
            </button>
          </div>

          {/* Auto-redirect Notice */}
          <p className="text-sm text-muted-foreground mt-6">
            You will be automatically redirected to your dashboard in 10 seconds...
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
