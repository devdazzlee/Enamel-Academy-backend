"use client"

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Lightbulb, TrendingUp, Target, Award } from 'lucide-react';
import { coursesService } from "@/lib/api/courses";
import { GooeyToaster, gooeyToast } from "goey-toast";
import "goey-toast/styles.css";

export default function ReflectionPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [formData, setFormData] = useState({
    learningOutcomes: '',
    applyLearning: '',
    nextSteps: '',
    takeaways: ''
  });
  const [courseTitle, setCourseTitle] = useState("Loading course...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [previousReflections, setPreviousReflections] = useState<string[]>([]);
  const [existingFeedbackComment, setExistingFeedbackComment] = useState("");

  useEffect(() => {
    let alive = true;

    const toText = (value: unknown): string => (typeof value === "string" ? value : "");

    const hydrateFormFromReflection = (raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      const obj = raw as Record<string, unknown>;
      const data = (obj.data && typeof obj.data === "object" ? obj.data : obj) as Record<string, unknown>;
      const reflection =
        (data.reflection && typeof data.reflection === "object" ? data.reflection : data) as Record<string, unknown>;

      setFormData((prev) => ({
        ...prev,
        learningOutcomes: toText(reflection.learning_outcomes) || prev.learningOutcomes,
        applyLearning: toText(reflection.apply_learning) || prev.applyLearning,
        nextSteps: toText(reflection.next_steps) || prev.nextSteps,
        takeaways: toText(reflection.takeaways) || prev.takeaways,
      }));
    };

    const run = async () => {
      setIsLoading(true);
      try {
        const [courseRes, reflectionRes, reflectionsRes, feedbackRes] = await Promise.allSettled([
          coursesService.details(courseId),
          coursesService.getReflection(courseId),
          coursesService.getAllReflections(courseId),
          coursesService.getFeedback(courseId),
        ]);

        if (!alive) return;

        if (courseRes.status === "fulfilled" && courseRes.value?.title) {
          setCourseTitle(courseRes.value.title);
        }

        if (reflectionRes.status === "fulfilled") {
          hydrateFormFromReflection(reflectionRes.value);
        }
        if (reflectionsRes.status === "fulfilled") {
          const root = (reflectionsRes.value && typeof reflectionsRes.value === "object" ? reflectionsRes.value : {}) as Record<string, unknown>;
          const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
          const rows = Array.isArray(data.reflections)
            ? data.reflections
            : Array.isArray(data.items)
              ? data.items
              : Array.isArray(data.results)
                ? data.results
                : [];
          const comments = (rows as unknown[])
            .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : {}))
            .map((item) => toText(item.takeaways) || toText(item.content) || toText(item.learning_outcomes))
            .filter(Boolean)
            .slice(0, 3);
          setPreviousReflections(comments);
        }
        if (feedbackRes.status === "fulfilled") {
          const root = (feedbackRes.value && typeof feedbackRes.value === "object" ? feedbackRes.value : {}) as Record<string, unknown>;
          const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
          const feedback = (data.feedback && typeof data.feedback === "object" ? data.feedback : data) as Record<string, unknown>;
          setExistingFeedbackComment(toText(feedback.comment));
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [courseId]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getTotalWords = () => {
    const allText = Object.values(formData).join(' ');
    return allText.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleSaveDraft = async () => {
    setFormError("");
    setFormSuccess("");
    setIsSavingDraft(true);
    try {
      localStorage.setItem(`course-reflection-draft-${courseId}`, JSON.stringify(formData));
      setFormSuccess("Draft saved successfully.");
      gooeyToast.success("Draft saved successfully.");
    } catch {
      setFormError("Unable to save draft right now.");
      gooeyToast.error("Unable to save draft right now.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setFormError("");
    setFormSuccess("");

    const missingRequired =
      !formData.learningOutcomes.trim() ||
      !formData.applyLearning.trim() ||
      !formData.nextSteps.trim() ||
      !formData.takeaways.trim();

    if (missingRequired) {
      setFormError("Please complete all required reflection fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await coursesService.saveReflection(courseId, {
        learning_outcomes: formData.learningOutcomes.trim(),
        apply_learning: formData.applyLearning.trim(),
        next_steps: formData.nextSteps.trim(),
        takeaways: formData.takeaways.trim(),
      });
      localStorage.removeItem(`course-reflection-draft-${courseId}`);
      router.push(`/course/${courseId}`);
    } catch {
      setFormError("Unable to submit reflection right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GooeyToaster position="top-right" />
      {/* Header */}
      <header className="bg-[#8b5cf6] text-white px-4 sm:px-6 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button 
              onClick={() => router.push(`/course/${courseId}`)}
              className="flex items-center gap-2 text-white hover:text-[#e0e7ff] transition-colors text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back to Course</span>
              <span className="sm:hidden">Back</span>
            </button>
            <div className="text-center flex-1 min-w-0 px-2">
              <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Course Reflection</h1>
              <p className="text-[#e0e7ff] text-sm sm:text-base leading-tight overflow-hidden" style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>{courseTitle}</p>
            </div>
            <div className="text-right">
              <div className="text-xs sm:text-sm font-medium">Completed</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Info Box */}
        <div className="bg-purple-50 border-l-4 border-purple-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded">
          <div className="flex gap-2 sm:gap-3">
            <Lightbulb className="text-purple-600 flex-shrink-0 mt-0.5 sm:mt-1" size={16} />
            <div className="text-purple-900">
              <p className="mb-2 text-sm sm:text-base">
                Reflective practice is a key component of CPD. Take a moment to reflect on what you've learned and how you'll apply it to your practice.
              </p>
              <p className="text-xs sm:text-sm">
                Once you submit your reflection, you'll receive your CPD certificate and the hours will be automatically logged to your CPD record.
              </p>
            </div>
          </div>
        </div>

        {/* Reflection Form */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-8">
          {isLoading && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs sm:text-sm text-gray-600">
              Loading existing reflection...
            </div>
          )}
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs sm:text-sm text-green-700">
              {formSuccess}
            </div>
          )}
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Your Reflection</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Complete all sections to receive your certificate</p>

          {/* Question 1 */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-start gap-2 mb-3">
              <Lightbulb className="text-purple-600 mt-1" size={16} />
              <label className="text-gray-900 font-medium text-sm sm:text-base">
                What were your key learning outcomes? <span className="text-red-500">*</span>
              </label>
            </div>
            <textarea
              value={formData.learningOutcomes}
              onChange={(e) => handleChange('learningOutcomes', e.target.value)}
              placeholder="Describe the main things you learned from this course. What new knowledge or skills did you gain?"
              className="w-full h-24 sm:h-32 p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Suggested: Describe 2-3 specific concepts or techniques you learned
            </p>
          </div>

          {/* Question 2 */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-start gap-2 mb-3">
              <TrendingUp className="text-purple-600 mt-1" size={16} />
              <label className="text-gray-900 font-medium text-sm sm:text-base">
                How will you apply this learning in your practice? <span className="text-red-500">*</span>
              </label>
            </div>
            <textarea
              value={formData.applyLearning}
              onChange={(e) => handleChange('applyLearning', e.target.value)}
              placeholder="Explain how you will use this knowledge in your day-to-day clinical work or professional practice."
              className="w-full h-24 sm:h-32 p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Suggested: Give specific examples of how this will change or improve your practice
            </p>
          </div>

          {/* Question 3 */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-start gap-2 mb-3">
              <Target className="text-purple-600 mt-1" size={16} />
              <label className="text-gray-900 font-medium text-sm sm:text-base">
                What are your next steps or future learning goals? <span className="text-red-500">*</span>
              </label>
            </div>
            <textarea
              value={formData.nextSteps}
              onChange={(e) => handleChange('nextSteps', e.target.value)}
              placeholder="Identify areas for further development or additional training you'd like to pursue."
              className="w-full h-24 sm:h-32 p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Suggested: What related topics would you like to explore next?
            </p>
          </div>

          {/* Question 4 */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-start gap-2 mb-3">
              <Award className="text-purple-600 mt-1" size={16} />
              <label className="text-gray-900 font-medium text-sm sm:text-base">
                What were your most important takeaways? <span className="text-red-500">*</span>
              </label>
            </div>
            <textarea
              value={formData.takeaways}
              onChange={(e) => handleChange('takeaways', e.target.value)}
              placeholder="Summarize the most valuable insights or 'aha' moments from this course."
              className="w-full h-24 sm:h-32 p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Suggested: What will you remember most from this course?
            </p>
          </div>

          {/* Word Counter */}
          <div className="border-t pt-3 sm:pt-4 mb-4 sm:mb-6">
            <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600">
              <span>Total words</span>
              <span className="font-medium">{getTotalWords()} words</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm sm:text-base"
            >
              {isSavingDraft ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isSavingDraft}
              className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <span className="hidden sm:inline">{isSubmitting ? "Submitting..." : "Submit & Get Certificate"}</span>
              <span className="sm:hidden">{isSubmitting ? "Submitting..." : "Submit"}</span>
              <CheckCircle size={16} />
            </button>
          </div>
        </div>

        {/* About CPD Reflections */}
        <div className="bg-blue-50 rounded-lg p-4 sm:p-6 mt-4 sm:mt-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">About CPD Reflections</h3>
          <p className="text-gray-700 mb-2 text-sm sm:text-base">
            The GDC requires all dental professionals to reflect on their learning and demonstrate how CPD activities enhance their practice.
          </p>
          <p className="text-gray-700 text-sm sm:text-base">
            Your reflection will be saved with your CPD record and can be included in audit reports.
          </p>
          {previousReflections.length > 0 && (
            <div className="mt-4 border-t border-blue-200 pt-3">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Previous Reflections (API)</h4>
              <ul className="space-y-1">
                {previousReflections.map((item, idx) => (
                  <li key={idx} className="text-xs sm:text-sm text-gray-700">- {item}</li>
                ))}
              </ul>
            </div>
          )}
          {existingFeedbackComment && (
            <div className="mt-4 border-t border-blue-200 pt-3">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Latest Course Feedback Comment (API)</h4>
              <p className="text-xs sm:text-sm text-gray-700">{existingFeedbackComment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
