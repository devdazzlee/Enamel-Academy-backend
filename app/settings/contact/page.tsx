"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ArrowLeft, Mail, Phone, MessageSquare, Send, Check } from "lucide-react";
import Link from "next/link";
import { contactService } from "@/lib/api/contact";
import { toast } from "@/hooks/use-toast";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    category: "general"
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsSubmitted(false);

    try {
      await contactService.submit({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: `Category: ${formData.category}\n\n${formData.message}`,
      });
      toast({
        title: "Message sent",
        description: "Thank you for your message! We'll respond within 24 hours.",
      });
      setIsSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "", category: "general" });
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    } catch {
      toast({
        variant: "destructive",
        title: "Message not sent",
        description: "We couldn't send your message right now. Please try again in a moment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-[#e8e8e8] flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/settings"
            className="flex items-center gap-2 text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Settings
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-border p-8">
              <h1 className="text-2xl font-semibold mb-6">
                <span className="text-[#1a1a1a]">Contact </span>
                <span className="text-[#8b5cf6]">Us</span>
              </h1>

              {isSubmitted && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <p className="text-green-800">Message sent successfully! We'll respond within 24 hours.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6]"
                    required
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing & Subscription</option>
                    <option value="courses">Course Content</option>
                    <option value="cpd">CPD & Certificates</option>
                    <option value="feedback">Feedback & Suggestions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] resize-none"
                    placeholder="Please describe your inquiry in detail..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#7c3aed] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                >
                  <Send className="h-5 w-5" />
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Quick Contact */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Contact</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#8b5cf6]/10 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1a1a1a]">Phone</p>
                    <p className="text-sm text-[#6b7280]">+44 (0)330 165 9711</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#8b5cf6]/10 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1a1a1a]">Email</p>
                    <p className="text-sm text-[#6b7280]">support@enamelacademy.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#8b5cf6]/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1a1a1a]">Live Chat</p>
                    <p className="text-sm text-[#6b7280]">Available Mon-Fri, 9am-5pm</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-lg font-semibold mb-4">Office Hours</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[#6b7280]">Monday - Friday</span>
                  <span className="text-sm font-medium text-[#1a1a1a]">09:30 - 17:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6b7280]">Saturday</span>
                  <span className="text-sm font-medium text-[#1a1a1a]">10:00 - 14:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6b7280]">Sunday</span>
                  <span className="text-sm font-medium text-[#1a1a1a]">Closed</span>
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-3">Response Times</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Email Support</span>
                  <span className="font-medium text-[#1a1a1a]">Within 24 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Phone Support</span>
                  <span className="font-medium text-[#1a1a1a]">Immediate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Live Chat</span>
                  <span className="font-medium text-[#1a1a1a]">Within 5 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
