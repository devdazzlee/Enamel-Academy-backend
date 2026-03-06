'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Upload, CheckCircle, Info } from 'lucide-react';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from 'next/navigation';
import { cpdService } from "@/lib/api/cpd";
import { rolesService, type DentalRole } from "@/lib/api/roles";


export default function LogExternalCPD() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    activityTitle: '',
    provider: '',
    dateCompleted: '',
    cpdHours: '',
    category: '',
    activityType: '',
    learningOutcomes: '',
    reflection: '',
    application: ''
  });
  const [evidenceFile, setEvidenceFile] = useState<File | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [selectedRole, setSelectedRole] = useState("dentist");

  const [gdcRequirements, setGdcRequirements] = useState<string[]>([]);

  const loggingTips = [
    'Log CPD activities as soon as possible after completion',
    'Always upload supporting evidence (certificates, attendance records)',
    'Write meaningful reflections - explain how learning will improve your practice',
    'Include specific examples where possible'
  ];

  const [gdcCategories, setGdcCategories] = useState<string[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<DentalRole[]>([]);

  useEffect(() => {
    let alive = true;
    const getText = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
    const run = async () => {
      setIsLoadingMeta(true);
      setMetaError("");
      try {
        const [rolesRaw, requirementsRaw, historyRaw, summaryRaw] = await Promise.all([
          rolesService.roles(),
          cpdService.requirements(selectedRole),
          cpdService.history({ limit: 200, offset: 0 }),
          cpdService.summary(),
        ]);
        if (!alive) return;
        const root = (requirementsRaw && typeof requirementsRaw === "object" ? requirementsRaw : {}) as Record<string, unknown>;
        const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
        const historyRoot = (historyRaw && typeof historyRaw === "object" ? historyRaw : {}) as Record<string, unknown>;
        const historyData = (historyRoot.data && typeof historyRoot.data === "object" ? historyRoot.data : historyRoot) as Record<string, unknown>;
        const summaryRoot = (summaryRaw && typeof summaryRaw === "object" ? summaryRaw : {}) as Record<string, unknown>;
        const summaryData = (summaryRoot.data && typeof summaryRoot.data === "object" ? summaryRoot.data : summaryRoot) as Record<string, unknown>;
        const requirementsObj = (data.requirements && typeof data.requirements === "object"
          ? data.requirements
          : {}) as Record<string, unknown>;

        const requirementList = Array.isArray(data.requirements)
          ? data.requirements
          : Array.isArray(data.mandatory_requirements)
            ? data.mandatory_requirements
            : [];
        const categoryList = Array.isArray(data.categories)
          ? data.categories
          : Array.isArray(data.gdc_categories)
            ? data.gdc_categories
            : [];
        const requirementTypes = Array.isArray(data.activity_types)
          ? data.activity_types
          : Array.isArray(data.types)
            ? data.types
            : [];
        const historyRows = Array.isArray(historyData.history)
          ? historyData.history
          : Array.isArray(historyData.activities)
            ? historyData.activities
            : Array.isArray(historyData.items)
              ? historyData.items
              : Array.isArray(historyData.recent_completions)
                ? historyData.recent_completions
                : Array.isArray(historyData.completed_courses)
                  ? historyData.completed_courses
                  : [];
        const summaryRecent = Array.isArray(summaryData.recent_activity) ? summaryData.recent_activity : [];

        const parsedRequirements = (requirementList as unknown[])
          .map((item) => (typeof item === "string" ? item : getText((item as Record<string, unknown>)?.name ?? (item as Record<string, unknown>)?.title, "")))
          .filter(Boolean);
        const requirementMetaRows = [
          typeof requirementsObj.total_hours === "number" ? `Total required hours: ${requirementsObj.total_hours}` : "",
          typeof requirementsObj.annual_target === "number" ? `Annual target: ${requirementsObj.annual_target}` : "",
          typeof requirementsObj.cycle_years === "number" ? `CPD cycle: ${requirementsObj.cycle_years} years` : "",
          getText(requirementsObj.description),
        ].filter(Boolean);
        const parsedCategories = (categoryList as unknown[])
          .map((item) => (typeof item === "string" ? item : getText((item as Record<string, unknown>)?.name ?? (item as Record<string, unknown>)?.title, "")))
          .filter(Boolean);
        const parsedTypesFromRequirements = (requirementTypes as unknown[])
          .map((item) => (typeof item === "string" ? item : getText((item as Record<string, unknown>)?.name ?? (item as Record<string, unknown>)?.title ?? (item as Record<string, unknown>)?.value, "")))
          .filter(Boolean);
        const parsedCategoriesFromHistory = (historyRows as unknown[])
          .map((item) => getText(((item && typeof item === "object" ? item : {}) as Record<string, unknown>).gdc_category ?? ((item && typeof item === "object" ? item : {}) as Record<string, unknown>).category))
          .filter(Boolean);
        const parsedTypesFromHistory = (historyRows as unknown[])
          .map((item) => getText(((item && typeof item === "object" ? item : {}) as Record<string, unknown>).activity_type ?? ((item && typeof item === "object" ? item : {}) as Record<string, unknown>).type))
          .filter(Boolean);
        const parsedCategoriesFromSummary = (summaryRecent as unknown[])
          .map((item) => getText(((item && typeof item === "object" ? item : {}) as Record<string, unknown>).gdc_category ?? ((item && typeof item === "object" ? item : {}) as Record<string, unknown>).category))
          .filter(Boolean);
        const parsedTypesFromSummary = (summaryRecent as unknown[])
          .map((item) => getText(((item && typeof item === "object" ? item : {}) as Record<string, unknown>).activity_type ?? ((item && typeof item === "object" ? item : {}) as Record<string, unknown>).type))
          .filter(Boolean);
        const parsedRoleOptions = Array.isArray(rolesRaw) ? rolesRaw.filter((r) => r?.name) : [];

        setRoleOptions(parsedRoleOptions);
        setGdcRequirements(Array.from(new Set([...parsedRequirements, ...requirementMetaRows])));
        setGdcCategories(Array.from(new Set([...parsedCategories, ...parsedCategoriesFromHistory, ...parsedCategoriesFromSummary])));
        setActivityTypes(Array.from(new Set([...parsedTypesFromRequirements, ...parsedTypesFromHistory, ...parsedTypesFromSummary])));
      } catch {
        if (!alive) return;
        setRoleOptions([]);
        setGdcCategories([]);
        setActivityTypes([]);
        setMetaError("Unable to load GDC metadata right now.");
      } finally {
        if (alive) setIsLoadingMeta(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [selectedRole]);

  const categories = useMemo(() => gdcCategories, [gdcCategories]);
  const typeOptions = useMemo(() => activityTypes, [activityTypes]);
  const parseDateValue = (value: string) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };
  const toApiDate = (value: Date) => format(value, "yyyy-MM-dd");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!formData.activityTitle || !formData.dateCompleted || !formData.cpdHours || !formData.category) {
      setSubmitError("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await cpdService.logExternal({
        title: formData.activityTitle,
        provider: formData.provider,
        date_completed: formData.dateCompleted,
        hours: formData.cpdHours,
        gdc_category: formData.category,
        activity_type: formData.activityType || "external",
        learning_outcomes: formData.learningOutcomes,
        reflection: formData.reflection,
        apply_learning: formData.application,
        evidence: evidenceFile,
      });
      setSubmitSuccess("External CPD logged successfully.");
      setFormData({
        activityTitle: '',
        provider: '',
        dateCompleted: '',
        cpdHours: '',
        category: '',
        activityType: '',
        learningOutcomes: '',
        reflection: '',
        application: ''
      });
      setEvidenceFile(undefined);
    } catch {
      setSubmitError("Failed to log external CPD. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
       <Navigation />
  
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button 
                onClick={() => router.back()}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 hover:bg-purple-400 rounded-lg flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="text-white w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">Log External CPD</h2>
                <p className="text-purple-100 text-xs sm:text-sm lg:text-base">Record CPD completed outside platform</p>
              </div>
            </div>
          </div>
        </div>
      {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Activity Details</h3>
              <p className="text-sm text-gray-600 mb-6">
                Enter information about your CPD activity. Fields marked with * are required.
              </p>

              {isLoadingMeta && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
                  <Spinner />
                  Loading GDC metadata...
                </div>
              )}
              {metaError && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {metaError}
                </div>
              )}
              {submitSuccess && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {submitSuccess}
                </div>
              )}
              {submitError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Activity Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Advanced Implant Workshop"
                    value={formData.activityTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, activityTitle: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                {/* Provider/Organisation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider/Organisation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., British Dental Association"
                    value={formData.provider}
                    onChange={(e) =>
                      setFormData({ ...formData, provider: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                {/* Date and Hours Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Completed *
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between px-3 sm:px-4 py-2.5 sm:py-3 h-auto font-normal text-sm sm:text-base bg-white hover:bg-white active:bg-white data-[state=open]:bg-white"
                        >
                          <span className={formData.dateCompleted ? "text-gray-900" : "text-gray-500"}>
                            {formData.dateCompleted ? format(parseDateValue(formData.dateCompleted) as Date, "dd/MM/yyyy") : "Select date"}
                          </span>
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DateCalendar
                          mode="single"
                          selected={parseDateValue(formData.dateCompleted)}
                          onSelect={(date) => {
                            if (!date) return;
                            setFormData({ ...formData, dateCompleted: toApiDate(date) });
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CPD Hours *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 3"
                      value={formData.cpdHours}
                      onChange={(e) =>
                        setFormData({ ...formData, cpdHours: e.target.value })
                      }
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Category and Type Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="w-full px-3 sm:px-4 py-2.5 sm:py-3 h-auto text-sm sm:text-base">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {(roleOptions.length
                          ? roleOptions
                          : [
                              { id: "dentist", slug: "dentist", name: "Dentist" },
                              { id: "dental_nurse", slug: "dental_nurse", name: "Dental Nurse" },
                              { id: "dental_care_professional", slug: "dental_care_professional", name: "Dental Care Professional" },
                            ]
                        ).map((role) => {
                          const value = String(role.slug ?? role.id);
                          return (
                            <SelectItem key={value} value={value}>
                              {role.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GDC Category *
                    </label>
                    <Select
                      value={formData.category || undefined}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      disabled={isLoadingMeta}
                    >
                      <SelectTrigger className="w-full px-3 sm:px-4 py-2.5 sm:py-3 h-auto text-sm sm:text-base">
                        <SelectValue placeholder={isLoadingMeta ? "Loading categories..." : "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                          {cat}
                          </SelectItem>
                        ))}
                        {!categories.length && (
                          <SelectItem value="__no_categories" disabled>
                            No categories available from API
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Activity Type
                    </label>
                    <Select
                      value={formData.activityType || undefined}
                      onValueChange={(value) => setFormData({ ...formData, activityType: value })}
                      disabled={isLoadingMeta}
                    >
                      <SelectTrigger className="w-full px-3 sm:px-4 py-2.5 sm:py-3 h-auto text-sm sm:text-base">
                        <SelectValue placeholder={isLoadingMeta ? "Loading activity types..." : "Select type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                        {!typeOptions.length && (
                          <SelectItem value="__no_types" disabled>
                            No activity types available from API
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Learning Outcomes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Learning Outcomes
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    What did you learn from this activity?
                  </p>
                  <textarea
                    rows={4}
                    placeholder="Describe key learning outcomes and knowledge gained..."
                    value={formData.learningOutcomes}
                    onChange={(e) =>
                      setFormData({ ...formData, learningOutcomes: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
                  />
                </div>

                {/* Reflection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reflection
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Reflect on the CPD activity and its relevance to your practice
                  </p>
                  <textarea
                    rows={4}
                    placeholder="Reflect on what you learned and how it applies to your practice..."
                    value={formData.reflection}
                    onChange={(e) =>
                      setFormData({ ...formData, reflection: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
                  />
                </div>

                {/* Application */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How will you apply this learning?
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Describe how you plan to implement what you've learned
                  </p>
                  <textarea
                    rows={4}
                    placeholder="Explain how you will apply this learning in your clinical practice..."
                    value={formData.application}
                    onChange={(e) =>
                      setFormData({ ...formData, application: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
                  />
                </div>

                {/* Upload Evidence */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Evidence
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Attach certificates, attendance records, photos, or other supporting documents
                  </p>
                  <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer block">
                    <Upload className="mx-auto text-gray-400 mb-3" size={32} />
                    <p className="text-purple-600 font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500">PDF, JPG, PNG, DOC up to 10MB</p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setEvidenceFile(file);
                      }}
                    />
                  </label>
                  {evidenceFile && (
                    <p className="text-xs text-gray-600 mt-2">Selected: {evidenceFile.name}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 py-3 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={20} className="w-5 h-5 sm:w-5 sm:h-5" />
                    <span className="font-medium">{isSubmitting ? "Logging..." : "Log CPD Activity"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Guidelines */}
          <div className="space-y-6">
            {/* GDC Requirements */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center space-x-2 mb-4">
                <Info className="text-blue-600" size={24} />
                <h3 className="font-semibold text-blue-900">GDC Requirements</h3>
              </div>
              <ul className="space-y-2">
                {(gdcRequirements.length ? gdcRequirements : ['Requirement data not available']).map((req, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-blue-800">{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips for Logging CPD */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center space-x-2 mb-4">
                <Info className="text-purple-600" size={24} />
                <h3 className="font-semibold text-purple-900">Tips for Logging CPD</h3>
              </div>
              <ul className="space-y-3">
                {loggingTips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Info size={14} className="text-purple-600" />
                    </div>
                    <span className="text-sm text-purple-800">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* GDC Categories */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">GDC Categories</h3>
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700"
                  >
                    {category}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function NavLink({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <a
      href="#"
      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-purple-50 text-purple-700 font-medium'
          : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </a>
  );
}