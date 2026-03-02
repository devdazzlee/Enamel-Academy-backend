"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft,
  FileDown,
  Printer,
  Target,
  TrendingUp,
  FileText,
  Calendar,
  Eye,
  CheckCircle,
  Edit2,
  Save,
  X,
  Plus,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { Spinner } from "@/components/ui/spinner";
import { pdpService } from "@/lib/api/pdp";

type PDPDetailData = {
  id?: string;
  title: string;
  status: string;
  dateRange: string;
  lastUpdated: string;
  progress: number;
  careerObjectives: string[];
  currentSkills: Array<{ skill: string; level: string }>;
  skillsToDevelop: Array<{ skill: string; target: string }>;
  courses: Array<{ title: string; duration: string; status: string }>;
  milestones: Array<{ quarter: string; goal: string; status: string }>;
  achievements: string[];
  reflection: string;
};

export default function PDPDetailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pdpData, setPdpData] = useState<PDPDetailData>({
    title: 'PDP Plan',
    status: 'Draft',
    dateRange: 'Date range not available',
    lastUpdated: 'Not available',
    progress: 0,
    careerObjectives: [],
    currentSkills: [],
    skillsToDevelop: [],
    courses: [],
    milestones: [],
    achievements: [],
    reflection: ''
  });
  const [editedPDPData, setEditedPDPData] = useState<PDPDetailData | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
  const [componentSyncLoading, setComponentSyncLoading] = useState("");
  const [componentSyncError, setComponentSyncError] = useState("");
  const [componentSyncMessage, setComponentSyncMessage] = useState("");
  const [linkActivityId, setLinkActivityId] = useState("");
  const [linkCourseId, setLinkCourseId] = useState("");

  const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  const handleEdit = () => {
    setEditedPDPData({ ...pdpData });
    setIsEditing(true);
    // Open mobile modal if on mobile device
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileModalOpen(true);
    }
  };

  const handleSave = () => {
    const run = async () => {
      if (!editedPDPData?.id) {
        setLoadError("Unable to save: PDP id missing.");
        return;
      }
      try {
        await pdpService.update(editedPDPData.id, {
          name: editedPDPData.title,
          status: editedPDPData.status.toLowerCase(),
          progress_percentage: editedPDPData.progress,
          career_objectives: editedPDPData.careerObjectives.map((objective, index) => ({
            objective,
            specialty: objective,
            priority: index + 1,
          })),
          current_skills: editedPDPData.currentSkills.map((skill) => ({
            skill_name: skill.skill,
            current_proficiency: skill.level,
            target_proficiency: skill.level,
          })),
          skills_to_develop: editedPDPData.skillsToDevelop.map((skill, index) => ({
            skill_name: skill.skill,
            target_proficiency: skill.target,
            priority: index + 1,
          })),
          milestones: editedPDPData.milestones.map((m) => ({
            title: m.goal,
            description: m.goal,
            quarter: m.quarter,
            completed: m.status.toLowerCase() === "completed",
          })),
          achievements: editedPDPData.achievements,
          reflection: { content: editedPDPData.reflection },
        });
        setPdpData(editedPDPData);
        setIsEditing(false);
        setIsMobileModalOpen(false);
      } catch {
        setLoadError("Failed to save PDP changes. Please try again.");
      }
    };
    void run();
  };

  const handleComponentSync = async (
    type: "objective" | "skillCurrent" | "skillDevelop" | "activity" | "milestone" | "reflection" | "linkCourse"
  ) => {
    if (!currentData.id) {
      setComponentSyncError("PDP id is missing.");
      return;
    }
    setComponentSyncError("");
    setComponentSyncMessage("");
    setComponentSyncLoading(type);
    try {
      if (type === "objective") {
        const objective = currentData.careerObjectives.find(Boolean);
        if (!objective) throw new Error("No objective to sync.");
        await pdpService.addCareerObjective(currentData.id, {
          objective,
          specialty: objective,
          priority: 1,
        });
        setComponentSyncMessage("Career objective synced.");
      }
      if (type === "skillCurrent") {
        const skill = currentData.currentSkills.find((s) => s.skill);
        if (!skill) throw new Error("No current skill to sync.");
        await pdpService.addSkill(currentData.id, {
          skill_name: skill.skill,
          skill_type: "current",
          current_proficiency: skill.level,
          target_proficiency: skill.level,
        });
        setComponentSyncMessage("Current skill synced.");
      }
      if (type === "skillDevelop") {
        const skill = currentData.skillsToDevelop.find((s) => s.skill);
        if (!skill) throw new Error("No skill-to-develop to sync.");
        await pdpService.addSkill(currentData.id, {
          skill_name: skill.skill,
          skill_type: "develop",
          target_proficiency: skill.target,
        });
        setComponentSyncMessage("Skill to develop synced.");
      }
      if (type === "activity") {
        const activity = currentData.courses.find((c) => c.title);
        if (!activity) throw new Error("No learning activity to sync.");
        await pdpService.addLearningActivity(currentData.id, {
          activity_name: activity.title,
          activity_type: "course",
          duration_hours: Number.parseInt(activity.duration, 10) || 0,
          status: activity.status.toLowerCase() || "planned",
        });
        setComponentSyncMessage("Learning activity synced.");
      }
      if (type === "milestone") {
        const milestone = currentData.milestones.find((m) => m.goal);
        if (!milestone) throw new Error("No milestone to sync.");
        await pdpService.addMilestone(currentData.id, {
          title: milestone.goal,
          description: milestone.goal,
          quarter: milestone.quarter,
          completed: milestone.status.toLowerCase() === "completed",
        });
        setComponentSyncMessage("Milestone synced.");
      }
      if (type === "reflection") {
        if (!currentData.reflection.trim()) throw new Error("No reflection to sync.");
        await pdpService.addReflection(currentData.id, {
          content: currentData.reflection,
          achievements: currentData.achievements.join(", "),
        });
        setComponentSyncMessage("Reflection synced.");
      }
      if (type === "linkCourse") {
        if (!linkActivityId.trim() || !linkCourseId.trim()) {
          throw new Error("Enter activity id and course id first.");
        }
        await pdpService.linkCourse(currentData.id, {
          activity_id: linkActivityId.trim(),
          course_id: linkCourseId.trim(),
        });
        setComponentSyncMessage("Course linked to PDP activity.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to sync component.";
      setComponentSyncError(msg);
    } finally {
      setComponentSyncLoading("");
    }
  };

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current || isDownloadingPdf) return;
    try {
      setIsDownloadingPdf(true);
      const dataUrl = await toPng(printAreaRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        filter: (node: HTMLElement) => !node.classList?.contains("no-print"),
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = () => resolve(null);
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / img.width, pdfHeight / img.height);
      const imgW = img.width * ratio;
      const imgH = img.height * ratio;
      const imgX = (pdfWidth - imgW) / 2;
      const imgY = 0;

      pdf.addImage(img, "PNG", imgX, imgY, imgW, imgH);
      const fileName = `PDP-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCancel = () => {
    setEditedPDPData(null);
    setIsEditing(false);
    setIsMobileModalOpen(false);
  };

  const updateCareerObjective = (index: number, value: string) => {
    setEditedPDPData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        careerObjectives: prev.careerObjectives.map((obj: string, i: number) => 
          i === index ? value : obj
        )
      };
    });
  };

  const addCareerObjective = () => {
    setEditedPDPData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        careerObjectives: [...prev.careerObjectives, '']
      };
    });
  };

  const removeCareerObjective = (index: number) => {
    setEditedPDPData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        careerObjectives: prev.careerObjectives.filter((_: string, i: number) => i !== index)
      };
    });
  };

  const currentData = editedPDPData || pdpData;
  const dynamicSpecialties = useMemo(() => {
    const fromData = [
      ...currentData.currentSkills.map((s) => s.skill),
      ...currentData.skillsToDevelop.map((s) => s.skill),
    ].filter(Boolean);
    return Array.from(new Set([...(specialtyOptions || []), ...fromData]));
  }, [currentData.currentSkills, currentData.skillsToDevelop, specialtyOptions]);
  const careerObjectiveOptions = useMemo(() => {
    const mapped = dynamicSpecialties.map((s) => `Develop expertise in ${s}`);
    return Array.from(new Set([...(currentData.careerObjectives || []), ...mapped])).filter(Boolean);
  }, [currentData.careerObjectives, dynamicSpecialties]);
  const courseTitleOptions = useMemo(
    () => Array.from(new Set(currentData.courses.map((c) => c.title).filter(Boolean))),
    [currentData.courses]
  );
  const courseDurationOptions = useMemo(
    () => Array.from(new Set(currentData.courses.map((c) => c.duration).filter(Boolean))),
    [currentData.courses]
  );
  const milestoneQuarterOptions = useMemo(
    () => Array.from(new Set(currentData.milestones.map((m) => m.quarter).filter(Boolean))),
    [currentData.milestones]
  );
  const milestoneGoalOptions = useMemo(
    () => Array.from(new Set(currentData.milestones.map((m) => m.goal).filter(Boolean))),
    [currentData.milestones]
  );
  const sectionStatus = (value: boolean) => (value ? "Completed" : "In Progress");

  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const el = document.getElementById(`pdp-section-${stepParam}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const raw = await pdpService.skillsLibrary();
        if (!alive) return;
        const skillsObj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
        const skillsData = (skillsObj.data && typeof skillsObj.data === "object" ? skillsObj.data : skillsObj) as Record<string, unknown>;
        const skillsArray = Array.isArray(skillsData.skills)
          ? skillsData.skills
          : Array.isArray(skillsData.items)
            ? skillsData.items
            : Array.isArray(raw)
              ? raw
              : [];
        const parsed = (skillsArray as unknown[])
          .map((s) => (typeof s === "string" ? s : typeof s === "object" && s ? String((s as Record<string, unknown>).name ?? (s as Record<string, unknown>).skill_name ?? "") : ""))
          .filter(Boolean);
        setSpecialtyOptions(parsed);
      } catch {
        if (!alive) return;
        setSpecialtyOptions([]);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const planId = searchParams.get("id");
    if (!planId) {
      setIsLoading(false);
      return;
    }
    const getText = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
    const getNum = (v: unknown, fallback = 0) =>
      typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : fallback);
    const run = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const raw = await pdpService.getById(planId);
        if (!alive) return;
        const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
        const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
        const courses = Array.isArray(data.learning_activities)
          ? (data.learning_activities as Array<Record<string, unknown>>).map((a) => ({
              title: getText(a.activity_name, "Learning Activity"),
              duration: `${getNum(a.duration_hours, 0)} hours`,
              status: getText(a.status, "planned"),
            }))
          : [];
        setPdpData({
          id: String(data.id ?? planId),
          title: getText(data.name, "PDP Plan"),
          status: getText(data.status, "draft"),
          dateRange:
            getText(data.start_date) && getText(data.end_date)
              ? `${getText(data.start_date)} - ${getText(data.end_date)}`
              : "Date range not available",
          lastUpdated: getText(data.updated_at, "Not available"),
          progress: getNum(data.progress_percentage, 0),
          careerObjectives: Array.isArray(data.career_objectives)
            ? (data.career_objectives as Array<Record<string, unknown>>).map((o) => getText(o.objective)).filter(Boolean)
            : [],
          currentSkills: Array.isArray(data.current_skills)
            ? (data.current_skills as Array<Record<string, unknown>>).map((s) => ({
                skill: getText(s.skill_name),
                level: getText(s.current_proficiency, "Intermediate"),
              }))
            : [],
          skillsToDevelop: Array.isArray(data.skills_to_develop)
            ? (data.skills_to_develop as Array<Record<string, unknown>>).map((s) => ({
                skill: getText(s.skill_name),
                target: getText(s.target_proficiency, "Advanced"),
              }))
            : [],
          courses,
          milestones: Array.isArray(data.milestones)
            ? (data.milestones as Array<Record<string, unknown>>).map((m) => ({
                quarter: getText(m.quarter),
                goal: getText(m.title) || getText(m.description),
                status: typeof m.completed === "boolean" ? (m.completed ? "Completed" : "In Progress") : "In Progress",
              }))
            : [],
          achievements: Array.isArray(data.achievements)
            ? (data.achievements as unknown[]).map((a) => getText(a)).filter(Boolean)
            : [],
          reflection:
            (data.reflection && typeof data.reflection === "object"
              ? getText((data.reflection as Record<string, unknown>).content)
              : getText(data.reflection)) || "",
        });
      } catch {
        if (!alive) return;
        setLoadError("Unable to load PDP details.");
      } finally {
        if (!alive) return;
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <button onClick={() => router.push('/pdp')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to My PDPs</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">{currentData.title}</h1>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  {currentData.status}
                </span>
              </div>
              <p className="text-gray-600 text-sm sm:text-base">{currentData.dateRange}</p>
              <p className="text-xs sm:text-sm text-gray-500">Last updated: {currentData.lastUpdated}</p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleSave} 
                    className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm hidden sm:flex"
                  >
                    <Save size={16} />
                    <span className="ml-1">Save</span>
                  </Button>
                  <Button 
                    onClick={handleCancel} 
                    variant="outline" 
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm hidden sm:flex"
                  >
                    <X size={16} />
                    <span className="ml-1">Cancel</span>
                  </Button>
                  {/* Mobile Edit Button */}
                  <Button 
                    onClick={() => setIsMobileModalOpen(true)}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:hidden"
                  >
                    <Edit2 size={16} />
                    <span className="ml-1">Edit Form</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleEdit} 
                    variant="outline" 
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm"
                  >
                    <Edit2 size={16} />
                    <span className="hidden sm:inline ml-1">Edit</span>
                  </Button>
                  <Button 
                    onClick={() => window.print()} 
                    variant="outline" 
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm hidden sm:flex"
                  >
                    <Printer size={16} />
                    <span className="ml-1">Print</span>
                  </Button>
                  <Button 
                    onClick={handleDownloadPDF} 
                    disabled={isDownloadingPdf}
                    className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm hidden sm:flex disabled:opacity-50"
                  >
                    <FileDown size={16} />
                    <span className="ml-1">{isDownloadingPdf ? "Generating..." : "PDF"}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div ref={printAreaRef} id="pdp-print-area" className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {isLoading && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
            <Spinner />
            Loading PDP details...
          </div>
        )}
        {loadError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {loadError}
          </div>
        )}
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">PDP Component API Actions</p>
          <p className="text-xs text-gray-600 mb-2">Sync individual PDP component endpoints from this page.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleComponentSync("objective")} disabled={componentSyncLoading === "objective"} className="rounded-md border px-2 py-1 text-xs text-purple-700 hover:bg-purple-50 disabled:opacity-50">Sync Objective</button>
            <button onClick={() => handleComponentSync("skillCurrent")} disabled={componentSyncLoading === "skillCurrent"} className="rounded-md border px-2 py-1 text-xs text-purple-700 hover:bg-purple-50 disabled:opacity-50">Sync Current Skill</button>
            <button onClick={() => handleComponentSync("skillDevelop")} disabled={componentSyncLoading === "skillDevelop"} className="rounded-md border px-2 py-1 text-xs text-purple-700 hover:bg-purple-50 disabled:opacity-50">Sync Skill to Develop</button>
            <button onClick={() => handleComponentSync("activity")} disabled={componentSyncLoading === "activity"} className="rounded-md border px-2 py-1 text-xs text-purple-700 hover:bg-purple-50 disabled:opacity-50">Sync Activity</button>
            <button onClick={() => handleComponentSync("milestone")} disabled={componentSyncLoading === "milestone"} className="rounded-md border px-2 py-1 text-xs text-purple-700 hover:bg-purple-50 disabled:opacity-50">Sync Milestone</button>
            <button onClick={() => handleComponentSync("reflection")} disabled={componentSyncLoading === "reflection"} className="rounded-md border px-2 py-1 text-xs text-purple-700 hover:bg-purple-50 disabled:opacity-50">Sync Reflection</button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input value={linkActivityId} onChange={(e) => setLinkActivityId(e.target.value)} placeholder="Activity ID" className="rounded-md border px-2 py-1 text-xs" />
            <input value={linkCourseId} onChange={(e) => setLinkCourseId(e.target.value)} placeholder="Course ID" className="rounded-md border px-2 py-1 text-xs" />
            <button onClick={() => handleComponentSync("linkCourse")} disabled={componentSyncLoading === "linkCourse"} className="rounded-md border px-2 py-1 text-xs text-purple-700 hover:bg-purple-50 disabled:opacity-50">Link Course</button>
          </div>
          {componentSyncError && <p className="mt-2 text-xs text-red-600">{componentSyncError}</p>}
          {componentSyncMessage && <p className="mt-2 text-xs text-green-600">{componentSyncMessage}</p>}
        </div>
        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-xs sm:text-sm font-bold text-green-600">{currentData.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 sm:h-3 rounded-full"
              style={{ width: `${currentData.progress}%` }}
            />
          </div>
        </div>

        {/* Career Objectives */}
        <div id="pdp-section-1" className="bg-white rounded-lg shadow-sm p-4 sm:p-8 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Target size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Career Objectives</h2>
                  <p className="text-sm sm:text-base text-gray-600">Your professional goals and career aspirations</p>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  {sectionStatus(currentData.careerObjectives.filter(Boolean).length > 0)}
                </span>
              </div>
              <div className="mt-3 sm:mt-4 space-y-2">
                {isEditing ? (
                  <>
                    {currentData.careerObjectives.map((objective: string, index: number) => (
                      <div key={index} className="flex flex-col gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-2 flex-1">
                          <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="flex-1 flex items-center text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                <span className="flex-1">{objective || "Select or type career objective"}</span>
                                <div className="ml-2 h-4 w-4 text-gray-400 flex-shrink-0">▼</div>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-full min-w-[300px] max-h-60 overflow-y-auto">
                              {(careerObjectiveOptions.length ? careerObjectiveOptions : [objective]).filter(Boolean).map((option) => (
                                <DropdownMenuItem
                                  key={option}
                                  onClick={() => updateCareerObjective(index, option)}
                                  className={objective === option ? "bg-purple-50 text-purple-700" : ""}
                                >
                                  {option}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Button
                          onClick={() => removeCareerObjective(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 self-start sm:self-auto"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={addCareerObjective}
                      variant="outline"
                      className="w-full sm:w-auto border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Career Objective
                    </Button>
                  </>
                ) : (
                  currentData.careerObjectives.map((objective: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-gray-700 text-sm sm:text-base">{objective}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skills Assessment */}
        <div id="pdp-section-2" className="bg-white rounded-lg shadow-sm p-4 sm:p-8 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Skills Assessment</h2>
                  <p className="text-sm sm:text-base text-gray-600">Current skills and areas for development</p>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  {sectionStatus(currentData.currentSkills.length > 0 || currentData.skillsToDevelop.length > 0)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Current Skills</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {isEditing ? (
                      currentData.currentSkills.map((skill: { skill: string; level: string }, index: number) => (
                        <div key={index} className="flex flex-col gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg overflow-hidden">
                          <div className="flex items-start gap-2 min-w-0">
                            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                            <Select
                              value={skill.skill}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    currentSkills: prev.currentSkills.map((s, i) => 
                                      i === index ? { ...s, skill: value } : s
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="flex-1 text-sm min-w-0">
                                <SelectValue placeholder="Select skill" />
                              </SelectTrigger>
                              <SelectContent>
                                {dynamicSpecialties.map(specialty => (
                                  <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="pl-6">
                            <Select
                              value={skill.level}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    currentSkills: prev.currentSkills.map((s, i) => 
                                      i === index ? { ...s, level: value } : s
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="w-full text-sm">
                                <SelectValue placeholder="Level" />
                              </SelectTrigger>
                              <SelectContent>
                                {skillLevels.map(level => (
                                  <SelectItem key={level} value={level}>{level}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))
                    ) : (
                      currentData.currentSkills.map((skill: { skill: string; level: string }, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-900 text-xs sm:text-sm truncate flex-1">{skill.skill}</span>
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                            skill.level === 'Advanced' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {skill.level}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Skills to Develop</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {isEditing ? (
                      currentData.skillsToDevelop.map((skill: { skill: string; target: string }, index: number) => (
                        <div key={index} className="flex flex-col gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
                            <Select
                              value={skill.skill}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    skillsToDevelop: prev.skillsToDevelop.map((s, i) => 
                                      i === index ? { ...s, skill: value } : s
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="flex-1 text-sm">
                                <SelectValue placeholder="Select skill" />
                              </SelectTrigger>
                              <SelectContent>
                                {dynamicSpecialties.map(specialty => (
                                  <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Select
                            value={skill.target}
                            onValueChange={(value) => {
                              setEditedPDPData(prev => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  skillsToDevelop: prev.skillsToDevelop.map((s, i) => 
                                    i === index ? { ...s, target: value } : s
                                  )
                                };
                              });
                            }}
                          >
                            <SelectTrigger className="w-full text-sm">
                              <SelectValue placeholder="Target" />
                            </SelectTrigger>
                            <SelectContent>
                              {skillLevels.map(level => (
                                <SelectItem key={level} value={level}>Target: {level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))
                    ) : (
                      currentData.skillsToDevelop.map((skill: { skill: string; target: string }, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-900 text-xs sm:text-sm truncate flex-1">{skill.skill}</span>
                          <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex-shrink-0">
                            Target: {skill.target}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Plan */}
        <div id="pdp-section-3" className="bg-white rounded-lg shadow-sm p-4 sm:p-8 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Learning Plan</h2>
                  <p className="text-sm sm:text-base text-gray-600">Selected courses and learning activities</p>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  {sectionStatus(currentData.courses.length > 0)}
                </span>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {isEditing ? (
                  currentData.courses.map((course: { title: string; duration: string; status: string }, index: number) => (
                    <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                          <div className="flex-1">
                            <Select
                              value={course.title}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    courses: prev.courses.map((c, i) => 
                                      i === index ? { ...c, title: value } : c
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="flex-1 text-sm">
                                <SelectValue placeholder="Select course" />
                              </SelectTrigger>
                              <SelectContent>
                                {(courseTitleOptions.length ? courseTitleOptions : [course.title]).filter(Boolean).map((title) => (
                                  <SelectItem key={title} value={title}>{title}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={course.duration}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    courses: prev.courses.map((c, i) => 
                                      i === index ? { ...c, duration: value } : c
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="w-full text-sm mt-2">
                                <SelectValue placeholder="Duration" />
                              </SelectTrigger>
                              <SelectContent>
                                {(courseDurationOptions.length ? courseDurationOptions : [course.duration]).filter(Boolean).map((duration) => (
                                  <SelectItem key={duration} value={duration}>{duration}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Select
                          value={course.status}
                          onValueChange={(value) => {
                            setEditedPDPData(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                courses: prev.courses.map((c, i) => 
                                  i === index ? { ...c, status: value } : c
                                )
                              };
                            });
                          }}
                        >
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                ) : (
                  currentData.courses.map((course: { title: string; duration: string; status: string }, index: number) => (
                    <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 mb-1 text-sm sm:text-base leading-tight">{course.title}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">Duration: {course.duration}</p>
                        </div>
                        <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex-shrink-0">
                          {course.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline & Milestones */}
        <div id="pdp-section-4" className="bg-white rounded-lg shadow-sm p-4 sm:p-8 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Calendar size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Timeline & Milestones</h2>
                  <p className="text-sm sm:text-base text-gray-600">Key deadlines and progress checkpoints</p>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  {sectionStatus(currentData.milestones.length > 0)}
                </span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {isEditing ? (
                  currentData.milestones.map((milestone: { quarter: string; goal: string; status: string }, index: number) => (
                    <div key={index} className="flex flex-col gap-3">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col gap-2">
                            <Select
                              value={milestone.quarter}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    milestones: prev.milestones.map((m, i) => 
                                      i === index ? { ...m, quarter: value } : m
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="w-full sm:w-auto text-sm">
                                <SelectValue placeholder="Quarter" />
                              </SelectTrigger>
                              <SelectContent>
                                {(milestoneQuarterOptions.length ? milestoneQuarterOptions : [milestone.quarter]).filter(Boolean).map((quarter) => (
                                  <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={milestone.status}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    milestones: prev.milestones.map((m, i) => 
                                      i === index ? { ...m, status: value } : m
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="w-full text-sm">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Not Started">Not Started</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Delayed">Delayed</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={milestone.goal}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    milestones: prev.milestones.map((m, i) => 
                                      i === index ? { ...m, goal: value } : m
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="flex-1 text-sm">
                                <SelectValue placeholder="Milestone goal" />
                              </SelectTrigger>
                              <SelectContent>
                                {(milestoneGoalOptions.length ? milestoneGoalOptions : [milestone.goal]).filter(Boolean).map((goal) => (
                                  <SelectItem key={goal} value={goal}>{goal}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  currentData.milestones.map((milestone: { quarter: string; goal: string; status: string }, index: number) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-green-700 text-xs sm:text-sm">{milestone.quarter}</span>
                            <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold inline-block">
                              {milestone.status}
                            </span>
                            <p className="text-gray-900 mt-1 text-sm sm:text-base leading-relaxed">{milestone.goal}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Review & Reflection */}
        <div id="pdp-section-5" className="bg-white rounded-lg shadow-sm p-4 sm:p-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Eye size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Review & Reflection</h2>
                  <p className="text-sm sm:text-base text-gray-600">Progress evaluation and personal insights</p>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  {sectionStatus(currentData.achievements.length > 0 || Boolean(currentData.reflection))}
                </span>
              </div>

              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Key Achievements</h3>
                <div className="space-y-1 sm:space-y-2">
                  {currentData.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-gray-700 text-sm sm:text-base leading-relaxed">{achievement}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Personal Reflection</h3>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{currentData.reflection}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Edit Modal */}
        {isMobileModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex flex-col z-50 sm:hidden">
            <div className="bg-white shadow-2xl w-full flex-1 flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 relative">
                <h3 className="text-base font-bold pr-8">Edit PDP</h3>
                <p className="text-purple-100 text-xs">Edit your professional development plan</p>
                <button 
                  onClick={handleCancel}
                  className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-3 py-3 overflow-y-auto flex-1">
                {/* Career Objectives Section */}
                <div className="mb-5">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Career Objectives</h4>
                  <div className="space-y-2">
                    {editedPDPData?.careerObjectives.map((objective, index) => (
                      <div key={index} className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg">
                        <CheckCircle className="text-green-600 flex-shrink-0" size={14} />
                        <Select
                          value={objective}
                          onValueChange={(value) => updateCareerObjective(index, value)}
                        >
                          <SelectTrigger className="flex-1 text-xs h-8">
                            <SelectValue placeholder="Select career objective" />
                          </SelectTrigger>
                          <SelectContent>
                            {(careerObjectiveOptions.length ? careerObjectiveOptions : [objective]).filter(Boolean).map((option) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => removeCareerObjective(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <Button
                      onClick={addCareerObjective}
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50 text-xs h-8"
                    >
                      <Plus size={14} className="mr-1.5" />
                      Add Career Objective
                    </Button>
                  </div>
                </div>

                {/* Skills Section */}
                <div className="mb-5">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Current Skills</h4>
                  <div className="space-y-2">
                    {editedPDPData?.currentSkills.map((skill, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded-lg space-y-1.5 overflow-hidden">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle className="text-green-600 flex-shrink-0" size={14} />
                          <Select
                            value={skill.skill}
                            onValueChange={(value) => {
                              setEditedPDPData(prev => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  currentSkills: prev.currentSkills.map((s, i) => 
                                    i === index ? { ...s, skill: value } : s
                                  )
                                };
                              });
                            }}
                          >
                            <SelectTrigger className="flex-1 text-xs h-8 min-w-0">
                              <SelectValue placeholder="Select skill" />
                            </SelectTrigger>
                            <SelectContent>
                              {dynamicSpecialties.map(specialty => (
                                <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="pl-5">
                          <Select
                            value={skill.level}
                            onValueChange={(value) => {
                              setEditedPDPData(prev => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  currentSkills: prev.currentSkills.map((s, i) => 
                                    i === index ? { ...s, level: value } : s
                                  )
                                };
                              });
                            }}
                          >
                            <SelectTrigger className="w-full text-xs h-8">
                              <SelectValue placeholder="Level" />
                            </SelectTrigger>
                            <SelectContent>
                              {skillLevels.map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex gap-2 pt-3 border-t sticky bottom-0 bg-white pb-1">
                  <Button 
                    onClick={handleSave}
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                  >
                    <Save size={14} className="mr-1.5" />
                    Save Changes
                  </Button>
                  <Button 
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-9"
                  >
                    <X size={14} className="mr-1.5" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

    
      </div>
    </div>
  );
}
