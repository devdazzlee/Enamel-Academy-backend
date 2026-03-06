 "use client"

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from "date-fns";
import { 
  ArrowLeft,
  Target,
  TrendingUp,
  FileText,
  Calendar,
  Eye,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { Spinner } from "@/components/ui/spinner";
import { pdpService } from "@/lib/api/pdp";
import { coursesService } from "@/lib/api/courses";

export default function PDPForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [dentalSpecialties, setDentalSpecialties] = useState<string[]>([]);
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [durationOptions, setDurationOptions] = useState<string[]>([]);
  const [assessmentOptions, setAssessmentOptions] = useState<string[]>([]);
  const [proficiencyLevels, setProficiencyLevels] = useState<string[]>([]);
  const [stepError, setStepError] = useState("");

  type CurrentSkill = { skill: string; level: string };
  type SkillToDevelop = { skill: string; target: string };
  type Milestone = { quarter: string; goal: string };

  type PDPFormData = {
    pdpName: string;
    startDate: string;
    endDate: string;
    careerObjectives: string[];
    currentSkills: CurrentSkill[];
    skillsToDevelop: SkillToDevelop[];
    selectedCourses: string[];
    additionalResources: string;
    duration: string;
    milestones: Milestone[];
    assessmentMethods: string[];
    successCriteria: string[];
  };

  const [formData, setFormData] = useState<PDPFormData>({
    pdpName: '',
    startDate: '',
    endDate: '',
    careerObjectives: [''],
    currentSkills: [{ skill: '', level: 'Advanced' }],
    skillsToDevelop: [{ skill: '', target: 'Advanced' }],
    selectedCourses: [],
    additionalResources: '',
    duration: '',
    milestones: [],
    assessmentMethods: [],
    successCriteria: []
  });

  const steps = [
    { number: 1, title: 'Career Objectives', icon: <Target size={20} />, completed: false },
    { number: 2, title: 'Skills Assessment', icon: <TrendingUp size={20} />, completed: false },
    { number: 3, title: 'Learning Plan', icon: <FileText size={20} />, completed: false },
    { number: 4, title: 'Timeline', icon: <Calendar size={20} />, completed: false },
    { number: 5, title: 'Review Criteria', icon: <Eye size={20} />, completed: false }
  ];

  const parseDateValue = (value: string): Date | undefined => {
    if (!value) return undefined;
    const normalized = value.includes("T") ? value.split("T")[0] : value;
    const [year, month, day] = normalized.split("-").map((part) => Number(part));
    if (!year || !month || !day) return undefined;
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const toApiDate = (value: Date | undefined): string => {
    if (!value) return "";
    return format(value, "yyyy-MM-dd");
  };

  const validateStep = (step: number): string => {
    if (step === 1) {
      if (!formData.pdpName.trim()) return "Please enter PDP name before continuing.";
      if (!formData.startDate || !formData.endDate) return "Please select start and end dates.";
      if (formData.careerObjectives.filter((x) => x.trim().length > 0).length === 0) {
        return "Please select at least one career objective.";
      }
      return "";
    }
    if (step === 2) {
      const hasCurrent = formData.currentSkills.some((s) => s.skill.trim() && s.level.trim());
      const hasTarget = formData.skillsToDevelop.some((s) => s.skill.trim() && s.target.trim());
      if (!hasCurrent || !hasTarget) return "Please select at least one current skill and one skill to develop.";
      return "";
    }
    if (step === 3) {
      if (formData.selectedCourses.length === 0) return "Please select at least one course in your learning plan.";
      return "";
    }
    if (step === 4) {
      if (!formData.duration) return "Please select duration before continuing.";
      return "";
    }
    if (step === 5) {
      if (assessmentOptions.length > 0 && formData.assessmentMethods.length === 0) {
        return "Please choose at least one assessment method.";
      }
      if (formData.successCriteria.filter((x) => x.trim().length > 0).length === 0) {
        return "Please add at least one success criterion.";
      }
      return "";
    }
    return "";
  };

  const handleGoToStep = (targetStep: number) => {
    if (targetStep <= currentStep) {
      setStepError("");
      setCurrentStep(targetStep);
      return;
    }
    for (let s = currentStep; s < targetStep; s += 1) {
      const error = validateStep(s);
      if (error) {
        setStepError(error);
        return;
      }
    }
    setStepError("");
    setCurrentStep(targetStep);
  };

  const handleNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError("");
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const addObjective = () => {
    setFormData({
      ...formData,
      careerObjectives: [...formData.careerObjectives, '']
    });
  };

  const removeObjective = (index: number) => {
    const newObjectives = formData.careerObjectives.filter((_, i) => i !== index);
    setFormData({ ...formData, careerObjectives: newObjectives });
  };

  const addCurrentSkill = () => {
    setFormData({
      ...formData,
      currentSkills: [...formData.currentSkills, { skill: '', level: 'Advanced' }]
    });
  };

  const addSkillToDevelop = () => {
    setFormData({
      ...formData,
      skillsToDevelop: [...formData.skillsToDevelop, { skill: '', target: 'Advanced' }]
    });
  };

  const toggleCourse = (course: string) => {
    const isSelected = formData.selectedCourses.includes(course);
    if (isSelected) {
      setFormData({
        ...formData,
        selectedCourses: formData.selectedCourses.filter(c => c !== course)
      });
    } else {
      setFormData({
        ...formData,
        selectedCourses: [...formData.selectedCourses, course]
      });
    }
  };

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { quarter: '', goal: '' }]
    });
  };

  const removeMilestone = (index: number) => {
    const newMilestones = formData.milestones.filter((_, i) => i !== index);
    setFormData({ ...formData, milestones: newMilestones });
  };

  const toggleAssessment = (method: string) => {
    const isSelected = formData.assessmentMethods.includes(method);
    if (isSelected) {
      setFormData({
        ...formData,
        assessmentMethods: formData.assessmentMethods.filter(m => m !== method)
      });
    } else {
      setFormData({
        ...formData,
        assessmentMethods: [...formData.assessmentMethods, method]
      });
    }
  };

  const addSuccessCriteria = () => {
    setFormData({
      ...formData,
      successCriteria: [...formData.successCriteria, '']
    });
  };

  const removeSuccessCriteria = (index: number) => {
    const newCriteria = formData.successCriteria.filter((_, i) => i !== index);
    setFormData({ ...formData, successCriteria: newCriteria });
  };

  useEffect(() => {
    const stepParam = searchParams.get('step');
    const parsed = stepParam ? parseInt(stepParam, 10) : NaN;
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) {
      setCurrentStep(parsed);
    }
  }, [searchParams]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const [skillsRaw, coursesWithMeta] = await Promise.all([
          pdpService.skillsLibrary(),
          coursesService.libraryWithMeta({ per_page: "100", page: "1" }),
        ]);
        if (!alive) return;
        const skillsObj = (skillsRaw && typeof skillsRaw === "object" ? skillsRaw : {}) as Record<string, unknown>;
        const skillsData = (skillsObj.data && typeof skillsObj.data === "object" ? skillsObj.data : skillsObj) as Record<string, unknown>;
        const skillsByCategory = (skillsData.skills_by_category && typeof skillsData.skills_by_category === "object"
          ? skillsData.skills_by_category
          : {}) as Record<string, unknown>;
        const categorizedSkills = Object.values(skillsByCategory)
          .flatMap((v) => (Array.isArray(v) ? v : []))
          .map((s) => (typeof s === "string" ? s : ""))
          .filter(Boolean);
        const skillsArray = Array.isArray(skillsData.all_skills)
          ? skillsData.all_skills
          : Array.isArray(skillsData.skills)
            ? skillsData.skills
            : Array.isArray(skillsData.items)
              ? skillsData.items
              : categorizedSkills;
        const skills = (skillsArray as unknown[])
          .map((s) => (typeof s === "string" ? s : typeof s === "object" && s ? String((s as Record<string, unknown>).name ?? (s as Record<string, unknown>).skill_name ?? "") : ""))
          .filter(Boolean);
        setDentalSpecialties(Array.from(new Set(skills)));

        const apiProficiency = Array.isArray(skillsData.proficiency_levels)
          ? (skillsData.proficiency_levels as unknown[]).map((v) => (typeof v === "string" ? v : "")).filter(Boolean)
          : [];
        setProficiencyLevels(Array.from(new Set(apiProficiency)));

        const coursesRaw = coursesWithMeta.courses ?? [];
        const titles = coursesRaw.map((c) => c.title ?? "").filter(Boolean) as string[];
        const durationFromFilters = Array.isArray(coursesWithMeta.filters?.options?.length)
          ? coursesWithMeta.filters.options.length
              .map((opt) => opt.label || opt.value || "")
              .filter(Boolean)
          : [];
        const durationFromCourses = Array.from(
          new Set(
            coursesRaw
              .map((c) => c.duration ?? "")
              .filter((d) => typeof d === "string" && d.trim() !== "" && d !== "Not specified")
          )
        ) as string[];
        const durations = Array.from(new Set([...durationFromFilters, ...durationFromCourses]));
        const features = Array.from(
          new Set(
            coursesRaw
              .flatMap((c) => (Array.isArray((c as any)?.features) ? (c as any).features : []))
              .map((f) => String(f))
              .filter(Boolean)
          )
        );
        setCourseOptions(titles);
        setDurationOptions(durations);
        setAssessmentOptions(features);
      } catch {
        if (!alive) return;
        setDentalSpecialties([]);
        setCourseOptions([]);
        setDurationOptions([]);
        setProficiencyLevels([]);
        setAssessmentOptions([]);
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const pdpId = searchParams.get("id");
    if (!pdpId) return;

    const getText = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

    const run = async () => {
      setIsLoadingPlan(true);
      setSubmitError("");
      try {
        const raw = await pdpService.getById(pdpId);
        if (!alive) return;
        const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
        const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
        const careerObjectives = Array.isArray(data.career_objectives)
          ? (data.career_objectives as Array<Record<string, unknown>>)
              .map((o) => getText(o?.objective))
              .filter(Boolean)
          : [''];
        const currentSkills = Array.isArray(data.current_skills)
          ? (data.current_skills as Array<Record<string, unknown>>).map((s) => ({
              skill: getText(s?.skill_name),
              level: getText(s?.current_proficiency, 'Intermediate'),
            }))
          : [{ skill: '', level: 'Advanced' }];
        const skillsToDevelop = Array.isArray(data.skills_to_develop)
          ? (data.skills_to_develop as Array<Record<string, unknown>>).map((s) => ({
              skill: getText(s?.skill_name),
              target: getText(s?.target_proficiency, 'Advanced'),
            }))
          : [{ skill: '', target: 'Advanced' }];
        const milestones = Array.isArray(data.milestones)
          ? (data.milestones as Array<Record<string, unknown>>).map((m) => ({
              quarter: getText(m?.quarter),
              goal: getText(m?.title) || getText(m?.description),
            }))
          : [];

        setFormData((prev) => ({
          ...prev,
          pdpName: getText(data.name),
          startDate: getText(data.start_date),
          endDate: getText(data.end_date),
          careerObjectives: careerObjectives.length ? careerObjectives : [''],
          currentSkills: currentSkills.length ? currentSkills : [{ skill: '', level: 'Advanced' }],
          skillsToDevelop: skillsToDevelop.length ? skillsToDevelop : [{ skill: '', target: 'Advanced' }],
          milestones: milestones.length ? milestones : prev.milestones,
        }));
      } catch {
        if (!alive) return;
        setSubmitError("Unable to load PDP data for editing.");
      } finally {
        if (!alive) return;
        setIsLoadingPlan(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [searchParams]);

  const handleSavePlan = async () => {
    setSubmitError("");
    setStepError("");
    for (let step = 1; step <= 5; step += 1) {
      const error = validateStep(step);
      if (error) {
        setCurrentStep(step);
        setStepError(error);
        return;
      }
    }
    setIsSubmitting(true);
    const editId = searchParams.get("id");
    try {
      const payload = {
        name: formData.pdpName || "Professional Development Plan",
        description: formData.additionalResources || "PDP generated from frontend form",
        status: "active",
        year: (formData.startDate?.slice(0, 4) || new Date().getFullYear().toString()),
        start_date: formData.startDate,
        end_date: formData.endDate,
        career_objectives: formData.careerObjectives
          .filter(Boolean)
          .map((objective, index) => ({ objective, specialty: objective, priority: index + 1 })),
        current_skills: formData.currentSkills
          .filter((s) => s.skill)
          .map((s) => ({
            skill_name: s.skill,
            current_proficiency: s.level,
            target_proficiency: s.level,
          })),
        skills_to_develop: formData.skillsToDevelop
          .filter((s) => s.skill)
          .map((s, index) => ({
            skill_name: s.skill,
            target_proficiency: s.target,
            priority: index + 1,
          })),
        milestones: formData.milestones
          .filter((m) => m.goal)
          .map((m) => ({
            title: m.goal,
            description: m.goal,
            quarter: m.quarter,
            completed: false,
          })),
      };

      const response = editId
        ? await pdpService.update(editId, payload)
        : await pdpService.create(payload);
      const root = (response && typeof response === "object" ? response : {}) as Record<string, unknown>;
      const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
      const createdId = String(data.id ?? root.id ?? editId ?? "");
      router.push(`/pdp?view=detail&id=${createdId}`);
    } catch {
      setSubmitError("Unable to save PDP. Please review inputs and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <button onClick={() => router.push('/pdp')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </button>
          <h1 className="text-xl sm:text-3xl font-bold text-purple-700 mb-1 sm:mb-2">
            Create New Personal Development Plan
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">Plan your professional development journey</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Progress Steps */}
        <div className="bg-white rounded-lg p-4 sm:p-8 mb-4 sm:mb-6 shadow-sm border border-gray-200">
          {/* Mobile Stepper */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between mb-3">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <button
                    onClick={() => handleGoToStep(step.number)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      currentStep === step.number 
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300 ring-offset-1' 
                        : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.number ? <CheckCircle size={14} /> : <span className="text-xs font-semibold">{step.number}</span>}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1.5 ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-center text-sm font-semibold text-purple-700">
              Step {currentStep}: {steps[currentStep - 1].title}
            </p>
          </div>

          {/* Desktop Stepper */}
          <div className="hidden sm:flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center min-w-0 px-2">
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      currentStep === step.number 
                        ? 'bg-purple-600 text-white' 
                        : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.number ? <CheckCircle size={16} /> : <div className="text-base">{step.icon}</div>}
                  </div>
                  <span className={`text-sm font-medium text-center ${
                    currentStep === step.number ? 'text-purple-700' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 min-w-[20px] ${
                    currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg p-4 sm:p-8 shadow-sm border border-gray-200">
          {isLoadingPlan && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 flex items-center gap-2">
              <Spinner />
              Loading PDP details...
            </div>
          )}
          {submitError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}
          {stepError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {stepError}
            </div>
          )}
          {/* Step 1: Career Objectives */}
          {currentStep === 1 && (
            <div>
              <div className="flex items-start gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Target size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Career Objectives</h2>
                  <p className="text-gray-600 text-sm sm:text-base">Define your professional goals in dental practice</p>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    PDP Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 2025 Professional Development Plan"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    value={formData.pdpName}
                    onChange={(e) => setFormData({ ...formData, pdpName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span>{parseDateValue(formData.startDate) ? format(parseDateValue(formData.startDate) as Date, "dd/MM/yyyy") : "dd/mm/yyyy"}</span>
                          <Calendar size={20} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DateCalendar
                          mode="single"
                          selected={parseDateValue(formData.startDate)}
                          onSelect={(date) => setFormData({ ...formData, startDate: toApiDate(date) })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span>{parseDateValue(formData.endDate) ? format(parseDateValue(formData.endDate) as Date, "dd/MM/yyyy") : "dd/mm/yyyy"}</span>
                          <Calendar size={20} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DateCalendar
                          mode="single"
                          selected={parseDateValue(formData.endDate)}
                          onSelect={(date) => setFormData({ ...formData, endDate: toApiDate(date) })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Career Objectives
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    What dental specialties or skills do you want to develop?
                  </p>
                  {formData.careerObjectives.map((objective, index) => (
                    <div key={index} className="flex items-center gap-1.5 sm:gap-2 mb-3 min-w-0">
                      <Select
                        value={objective}
                        onValueChange={(value) => {
                          const newObjectives = formData.careerObjectives.map((obj, i) =>
                            i === index ? value : obj
                          );
                          setFormData({ ...formData, careerObjectives: newObjectives });
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a dental specialty" />
                        </SelectTrigger>
                        <SelectContent>
                          {dentalSpecialties.length > 0 ? (
                            dentalSpecialties.map((specialty) => (
                              <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__no-skills" disabled>No skills available from API</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => removeObjective(index)}
                        className="p-1.5 sm:p-2.5 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                      >
                        <Trash2 size={16} className="sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addObjective}
                    className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Objective
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Skills Assessment */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-start gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Skills Assessment</h2>
                  <p className="text-gray-600 text-sm sm:text-base">Evaluate your current skills and identify areas for growth</p>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-8">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Current Skills</h3>
                  <p className="text-sm text-gray-600 mb-3 sm:mb-4">List your current dental skills and proficiency levels</p>
                  {formData.currentSkills.map((skill, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
                      <Select
                        value={skill.skill}
                        onValueChange={(value) => {
                          const newSkills = [...formData.currentSkills];
                          newSkills[index].skill = value;
                          setFormData({ ...formData, currentSkills: newSkills });
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select Skill" />
                        </SelectTrigger>
                        <SelectContent>
                          {dentalSpecialties.map(specialty => (
                            <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={skill.level}
                        onValueChange={(value) => {
                          const newSkills = [...formData.currentSkills];
                          newSkills[index].level = value;
                          setFormData({ ...formData, currentSkills: newSkills });
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-auto">
                          <SelectValue placeholder="Level" />
                        </SelectTrigger>
                        <SelectContent>
                          {proficiencyLevels.length > 0 ? (
                            proficiencyLevels.map(level => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__no-levels" disabled>No proficiency levels from API</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => {
                          const newSkills = formData.currentSkills.filter((_, i) => i !== index);
                          setFormData({ ...formData, currentSkills: newSkills });
                        }}
                        className="p-2 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addCurrentSkill}
                    className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2 text-sm sm:text-base"
                  >
                    <Plus size={16} />
                    Add Current Skill
                  </button>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Skills to Develop</h3>
                  <p className="text-sm text-gray-600 mb-3 sm:mb-4">Identify skills you want to improve and your target proficiency</p>
                  {formData.skillsToDevelop.map((skill, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
                      <Select
                        value={skill.skill}
                        onValueChange={(value) => {
                          const newSkills = [...formData.skillsToDevelop];
                          newSkills[index].skill = value;
                          setFormData({ ...formData, skillsToDevelop: newSkills });
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select Skill" />
                        </SelectTrigger>
                        <SelectContent>
                          {dentalSpecialties.map(specialty => (
                            <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={skill.target}
                        onValueChange={(value) => {
                          const newSkills = [...formData.skillsToDevelop];
                          newSkills[index].target = value;
                          setFormData({ ...formData, skillsToDevelop: newSkills });
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-auto">
                          <SelectValue placeholder="Target" />
                        </SelectTrigger>
                        <SelectContent>
                          {proficiencyLevels.length > 0 ? (
                            proficiencyLevels.map(level => (
                              <SelectItem key={level} value={level}>Target: {level}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__no-levels-target" disabled>No proficiency levels from API</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => {
                          const newSkills = formData.skillsToDevelop.filter((_, i) => i !== index);
                          setFormData({ ...formData, skillsToDevelop: newSkills });
                        }}
                        className="p-2 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addSkillToDevelop}
                    className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2 text-sm sm:text-base"
                  >
                    <Plus size={16} />
                    Add Skill to Develop
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Learning Plan */}
          {currentStep === 3 && (
            <div>
              <div className="flex items-start gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Learning Plan</h2>
                  <p className="text-gray-600 text-sm sm:text-base">Select courses and learning activities to achieve your goals</p>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Select Courses</h3>
                  <p className="text-sm text-gray-600 mb-3 sm:mb-4">Choose the courses you want to include in your learning plan</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {courseOptions.map((course) => (
                      <label key={course} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.selectedCourses.includes(course)}
                          onChange={() => toggleCourse(course)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                        />
                        <span className="text-gray-700 text-xs sm:text-sm leading-tight">{course}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Additional Resources</h3>
                  <textarea
                    placeholder="Journal subscriptions, mentorship programs, clinical practice hours..."
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
                    rows={4}
                    value={formData.additionalResources}
                    onChange={(e) => setFormData({ ...formData, additionalResources: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Timeline & Milestones */}
          {currentStep === 4 && (
            <div>
              <div className="flex items-start gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Timeline & Milestones</h2>
                  <p className="text-gray-600 text-sm sm:text-base">Set deadlines and track your progress</p>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.length > 0 ? (
                        durationOptions.map((duration, index) => (
                          <SelectItem key={index} value={duration}>{duration}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__no-duration" disabled>No duration options from API</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Milestones</h3>
                  {formData.milestones.map((milestone, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Q1 2025"
                        className="w-full sm:w-32 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                        value={milestone.quarter}
                        onChange={(e) => {
                          const newMilestones = [...formData.milestones];
                          newMilestones[index].quarter = e.target.value;
                          setFormData({ ...formData, milestones: newMilestones });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Complete Endodontics course"
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                        value={milestone.goal}
                        onChange={(e) => {
                          const newMilestones = [...formData.milestones];
                          newMilestones[index].goal = e.target.value;
                          setFormData({ ...formData, milestones: newMilestones });
                        }}
                      />
                      <button
                        onClick={() => {
                          const newMilestones = formData.milestones.filter((_, i) => i !== index);
                          setFormData({ ...formData, milestones: newMilestones });
                        }}
                        className="p-2 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addMilestone}
                    className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2 text-sm sm:text-base"
                  >
                    <Plus size={16} />
                    Add Milestone
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Reflection */}
          {currentStep === 5 && (
            <div>
              <div className="flex items-start gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Eye size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Review & Reflection</h2>
                  <p className="text-gray-600 text-sm sm:text-base">Evaluate your progress and adjust your plan</p>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-4">Assessment Methods</h3>
                  <p className="text-sm text-gray-600 mb-3 sm:mb-4">Select how you'll evaluate your progress</p>
                  {assessmentOptions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {assessmentOptions.map((method) => (
                        <label key={method} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.assessmentMethods.includes(method)}
                            onChange={() => toggleAssessment(method)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                          />
                          <span className="text-gray-700 text-xs sm:text-sm leading-tight">{method}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
                      No assessment methods returned by API.
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Success Criteria</h3>
                  <p className="text-sm text-gray-600 mb-3">Define specific outcomes that indicate success</p>
                  {formData.successCriteria.map((criteria, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Complete 50 CPD hours"
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                        value={criteria}
                        onChange={(e) => {
                          const newCriteria = [...formData.successCriteria];
                          newCriteria[index] = e.target.value;
                          setFormData({ ...formData, successCriteria: newCriteria });
                        }}
                      />
                      <button
                        onClick={() => removeSuccessCriteria(index)}
                        className="p-2 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addSuccessCriteria}
                    className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2 text-sm sm:text-base"
                  >
                    <Plus size={16} />
                    Add Success Criteria
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium flex items-center justify-center gap-2 text-sm sm:text-base ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            
            {currentStep === 5 ? (
              <button
                onClick={() => void handleSavePlan()}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    <span className="hidden sm:inline">Saving PDP...</span>
                    <span className="sm:hidden">Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}