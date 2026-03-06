"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Edit2, 
  Target, 
  TrendingUp, 
  FileText, 
  Calendar, 
  Eye,
  ChevronRight,
  CheckCircle
} from 'lucide-react';
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { pdpService } from "@/lib/api/pdp";

// Main Dashboard Component
export default function PDPDashboard() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [plans, setPlans] = useState<Array<{
    id: string;
    title: string;
    status: string;
    dateRange: string;
    lastUpdated: string;
    progress: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [stats, setStats] = useState<{ total: number; active: number; completed: number }>({ total: 0, active: 0, completed: 0 });
  const [rowActionLoading, setRowActionLoading] = useState<string>("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [confirmDeletePlan, setConfirmDeletePlan] = useState<{ id: string; title: string } | null>(null);
  const [confirmStatusPlan, setConfirmStatusPlan] = useState<{
    id: string;
    title: string;
    nextStatus: "active" | "completed" | "draft";
  } | null>(null);

  useEffect(() => {
    let alive = true;

    const getText = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
    const getNum = (v: unknown, fallback = 0) =>
      typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : fallback);

    const statusLabel = (status: string) => {
      const normalized = status.toLowerCase();
      if (normalized === "completed") return "Completed";
      if (normalized === "active" || normalized === "in progress") return "In Progress";
      if (normalized === "draft") return "Not Started";
      return status || "Not Started";
    };

    const run = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const [res, statsRaw] = await Promise.all([
          pdpService.list({ perPage: 50, page: 1 }),
          pdpService.stats(),
        ]);
        if (!alive) return;
        const mapped = (res.items ?? []).map((item, index) => {
          const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          const id = String(obj.id ?? obj.pdp_id ?? obj.post_id ?? `pdp-${index}`);
          const year = getText(obj.year, "");
          const name = getText(obj.name, "") || `${year || "Current"} Annual Plan`;
          const startDate = getText(obj.start_date, "");
          const endDate = getText(obj.end_date, "");
          const lastUpdatedRaw = getText(obj.updated_at, "") || getText(obj.last_updated, "") || getText(obj.modified, "");
          const formattedUpdated = lastUpdatedRaw
            ? new Date(lastUpdatedRaw).toLocaleDateString()
            : "Not available";
          return {
            id,
            title: name,
            status: statusLabel(getText(obj.status, "draft")),
            dateRange: startDate && endDate ? `${startDate} - ${endDate}` : "Date range not set",
            lastUpdated: formattedUpdated,
            progress: Math.max(0, Math.min(100, getNum(obj.progress_percentage, 0))),
          };
        });
        setPlans(mapped);
        if (mapped.length > 0) setSelectedPlan(mapped[0].id);
        const statsObj = (statsRaw && typeof statsRaw === "object" ? statsRaw : {}) as Record<string, unknown>;
        const statsData = (statsObj.data && typeof statsObj.data === "object" ? statsObj.data : statsObj) as Record<string, unknown>;
        setStats({
          total: getNum(statsData.total ?? statsData.total_pdps, mapped.length),
          active: getNum(statsData.active ?? statsData.active_pdps, mapped.filter((p) => p.status === "In Progress").length),
          completed: getNum(statsData.completed ?? statsData.completed_pdps, mapped.filter((p) => p.status === "Completed").length),
        });
      } catch {
        if (!alive) return;
        setPlans([]);
        setLoadError("Unable to load PDP plans right now.");
      } finally {
        if (!alive) return;
        setIsLoading(false);
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, []);

  const pdpSections = [
    {
      step: 1,
      icon: <Target size={24} />,
      title: 'Career Objectives',
      description: 'Define your professional goals and career aspirations',
      color: 'purple'
    },
    {
      step: 2,
      icon: <TrendingUp size={24} />,
      title: 'Skills Assessment',
      description: 'Identify current skills and areas for development',
      color: 'purple'
    },
    {
      step: 3,
      icon: <FileText size={24} />,
      title: 'Learning Plan',
      description: 'Select courses and learning activities to achieve your goals',
      color: 'purple'
    },
    {
      step: 4,
      icon: <Calendar size={24} />,
      title: 'Timeline & Milestones',
      description: 'Set deadlines and track your progress',
      color: 'purple'
    },
    {
      step: 5,
      icon: <Eye size={24} />,
      title: 'Review & Reflection',
      description: 'Evaluate your progress and adjust your plan',
      color: 'purple'
    }
  ];

  const currentPlan = plans.find(p => p.id === selectedPlan);
  const getSectionStatus = (step: number): string => {
    const progress = currentPlan?.progress ?? 0;
    const thresholds = [20, 40, 60, 80, 100];
    if (progress >= thresholds[step - 1]) return "Completed";
    if (progress > (step - 1) * 20) return "In Progress";
    return "Not Started";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700';
      case 'Not Started':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const refreshList = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await pdpService.list({ perPage: 50, page: 1 });
      const getText = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
      const getNum = (v: unknown, fallback = 0) =>
        typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : fallback);
      const statusLabel = (status: string) => {
        const normalized = status.toLowerCase();
        if (normalized === "completed") return "Completed";
        if (normalized === "active" || normalized === "in progress") return "In Progress";
        if (normalized === "draft") return "Not Started";
        return status || "Not Started";
      };
      const mapped = (res.items ?? []).map((item, index) => {
        const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const id = String(obj.id ?? obj.pdp_id ?? obj.post_id ?? `pdp-${index}`);
        return {
          id,
          title: getText(obj.name, "PDP Plan"),
          status: statusLabel(getText(obj.status, "draft")),
          dateRange: getText(obj.start_date) && getText(obj.end_date) ? `${getText(obj.start_date)} - ${getText(obj.end_date)}` : "Date range not set",
          lastUpdated: getText(obj.updated_at, "Not available"),
          progress: Math.max(0, Math.min(100, getNum(obj.progress_percentage, 0))),
        };
      });
      setPlans(mapped);
      if (mapped.length > 0) setSelectedPlan(mapped[0].id);
    } catch {
      setLoadError("Unable to refresh PDP plans right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (planId: string, nextStatus: "active" | "completed" | "draft") => {
    setActionError("");
    setActionMessage("");
    setRowActionLoading(`status-${planId}`);
    try {
      await pdpService.updateStatus(planId, nextStatus);
      setActionMessage(`PDP status updated to ${nextStatus}.`);
      await refreshList();
    } catch {
      setActionError("Failed to update PDP status.");
    } finally {
      setRowActionLoading("");
    }
  };

  const handleDelete = async (planId: string) => {
    setActionError("");
    setActionMessage("");
    setRowActionLoading(`delete-${planId}`);
    try {
      await pdpService.remove(planId);
      setActionMessage("PDP deleted successfully.");
      await refreshList();
    } catch {
      setActionError("Failed to delete PDP.");
    } finally {
      setRowActionLoading("");
    }
  };

  const isBusy = (planId: string) =>
    rowActionLoading === `status-${planId}` ||
    rowActionLoading === `delete-${planId}` ||
    rowActionLoading === `view-${planId}` ||
    rowActionLoading === `edit-${planId}`;

  const openView = (planId: string) => {
    setRowActionLoading(`view-${planId}`);
    router.push(`/pdp?view=detail&id=${planId}`);
  };

  const openEdit = (planId: string, step?: number) => {
    setRowActionLoading(`edit-${planId}`);
    router.push(`/pdp?view=form&id=${planId}${step ? `&step=${step}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {isLoading && (
          <div className="mb-4 sm:mb-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 flex items-center gap-2">
            <Spinner />
            Loading PDP plans...
          </div>
        )}
        {loadError && (
          <div className="mb-4 sm:mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="mb-4 sm:mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {actionError}
          </div>
        )}
        {actionMessage && (
          <div className="mb-4 sm:mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {actionMessage}
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-purple-700">My Personal Development Plan</h1>
          <button onClick={() => router.push('/pdp?view=form')} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2 w-full sm:w-auto justify-center">
            <Plus size={20} />
            New PDP
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Total PDPs</p>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Active PDPs</p>
            <p className="text-xl font-bold text-blue-700">{stats.active}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Completed PDPs</p>
            <p className="text-xl font-bold text-green-700">{stats.completed}</p>
          </div>
        </div>

        {/* Current Plan Card */}
        {currentPlan && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{currentPlan.title}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(currentPlan.status)}`}>
                    {currentPlan.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm sm:text-base">{currentPlan.dateRange}</p>
                <p className="text-xs sm:text-sm text-gray-500">Last updated: {currentPlan.lastUpdated}</p>
              </div>
              <button
                disabled={isBusy(currentPlan.id)}
                onClick={() => openEdit(currentPlan.id)}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {rowActionLoading === `edit-${currentPlan.id}` ? (
                  <>
                    <Spinner />
                    Opening edit...
                  </>
                ) : (
                  <>
                    <Edit2 size={16} />
                    Edit PDP
                  </>
                )}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 sm:mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm font-bold text-purple-600">{currentPlan.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-blue-500 h-2 sm:h-3 rounded-full transition-all duration-500"
                  style={{ width: `${currentPlan.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* PDP Sections */}
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">PDP Sections</h2>
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          {pdpSections.map((section, index) => {
            const sectionStatus = getSectionStatus(section.step);
            return (
            <div 
              key={index}
              onClick={() => router.push(`/pdp?view=detail&id=${selectedPlan}&step=${section.step}`)}
              className={`bg-white rounded-lg shadow-sm p-4 sm:p-6 border-2 hover:border-purple-300 transition cursor-pointer ${
                sectionStatus === 'In Progress' ? 'border-purple-200' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0`}>
                    <div className="sm:scale-100 scale-75">{section.icon}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                      <span className="text-xs sm:text-sm text-gray-500">Step {section.step}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(sectionStatus)}`}>
                        {sectionStatus}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">{section.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {sectionStatus === 'Completed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!selectedPlan || isBusy(selectedPlan)) return;
                        openEdit(selectedPlan, section.step);
                      }}
                      disabled={!selectedPlan || isBusy(selectedPlan)}
                      className="text-purple-600 hover:text-purple-700 font-medium text-xs sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {selectedPlan && rowActionLoading === `edit-${selectedPlan}` ? "Opening..." : "Edit"}
                    </button>
                  )}
                  <ChevronRight className="text-gray-400" size={16} />
                </div>
              </div>
            </div>
          )})}
        </div>

        {/* My PDPs Table */}
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">My PDPs</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-gray-200">
            {isLoading && (
              <>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={`mobile-skeleton-${idx}`} className="p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4 mb-3" />
                    <div className="h-2 bg-gray-100 rounded w-full mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3 ml-auto" />
                  </div>
                ))}
              </>
            )}
            {plans.map((plan, index) => (
              <div key={index} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{plan.title}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(plan.status)} mt-1`}>
                      {plan.status}
                    </span>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600">Progress</span>
                    <span className="text-xs font-medium text-gray-900">{plan.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${plan.status === 'Completed' ? 'bg-green-500' : 'bg-purple-600'}`}
                      style={{ width: `${plan.progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      disabled={isBusy(plan.id)}
                      onClick={() =>
                        setConfirmStatusPlan({
                          id: plan.id,
                          title: plan.title,
                          nextStatus: plan.status === "Completed" ? "active" : "completed",
                        })
                      }
                      className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rowActionLoading === `status-${plan.id}` ? (
                        <>
                          <Spinner />
                          <span className="ml-1">Saving...</span>
                        </>
                      ) : (
                        <>{plan.status === "Completed" ? "Mark Active" : "Mark Complete"}</>
                      )}
                    </button>
                    <button
                      disabled={isBusy(plan.id)}
                      onClick={() => openView(plan.id)}
                      className="inline-flex items-center rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rowActionLoading === `view-${plan.id}` ? (
                        <>
                          <Spinner />
                          <span className="ml-1">Opening...</span>
                        </>
                      ) : (
                        <>View</>
                      )}
                    </button>
                    <button
                      disabled={isBusy(plan.id)}
                      onClick={() => setConfirmDeletePlan({ id: plan.id, title: plan.title })}
                      className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rowActionLoading === `delete-${plan.id}` ? (
                        <>
                          <Spinner />
                          <span className="ml-1">Deleting...</span>
                        </>
                      ) : (
                        <>Delete</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && plans.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500">No PDP plans found.</div>
            )}
          </div>

          {/* Desktop Table View */}
          <table className="hidden sm:table w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Period</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Progress</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`desktop-skeleton-${idx}`} className="animate-pulse">
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="h-6 bg-gray-100 rounded-full w-24" />
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="h-2 bg-gray-100 rounded w-full" />
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="h-4 bg-gray-100 rounded w-28 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {plans.map((plan, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">{plan.title}</td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(plan.status)}`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${plan.status === 'Completed' ? 'bg-green-500' : 'bg-purple-600'}`}
                          style={{ width: `${plan.progress}%` }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600">{plan.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <button
                        disabled={isBusy(plan.id)}
                        onClick={() =>
                          setConfirmStatusPlan({
                            id: plan.id,
                            title: plan.title,
                            nextStatus: plan.status === "Completed" ? "active" : "completed",
                          })
                        }
                        className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs sm:text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {rowActionLoading === `status-${plan.id}` ? (
                          <>
                            <Spinner />
                            <span className="ml-1">Saving...</span>
                          </>
                        ) : (
                          <>{plan.status === "Completed" ? "Mark Active" : "Mark Complete"}</>
                        )}
                      </button>
                      <button
                        disabled={isBusy(plan.id)}
                        onClick={() => openView(plan.id)}
                        className="inline-flex items-center rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs sm:text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {rowActionLoading === `view-${plan.id}` ? (
                          <>
                            <Spinner />
                            <span className="ml-1">Opening...</span>
                          </>
                        ) : (
                          <>View</>
                        )}
                      </button>
                      <button
                        disabled={isBusy(plan.id)}
                        onClick={() => setConfirmDeletePlan({ id: plan.id, title: plan.title })}
                        className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs sm:text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {rowActionLoading === `delete-${plan.id}` ? (
                          <>
                            <Spinner />
                            <span className="ml-1">Deleting...</span>
                          </>
                        ) : (
                          <>Delete</>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && plans.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-sm text-gray-500">
                    No PDP plans found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AlertDialog open={Boolean(confirmDeletePlan)} onOpenChange={(open) => !open && setConfirmDeletePlan(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete PDP plan?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. "{confirmDeletePlan?.title}" will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={Boolean(confirmDeletePlan && isBusy(confirmDeletePlan.id))}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={Boolean(confirmDeletePlan && isBusy(confirmDeletePlan.id))}
                onClick={() => {
                  if (!confirmDeletePlan) return;
                  void handleDelete(confirmDeletePlan.id);
                  setConfirmDeletePlan(null);
                }}
              >
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={Boolean(confirmStatusPlan)} onOpenChange={(open) => !open && setConfirmStatusPlan(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmStatusPlan?.nextStatus === "completed" ? "Mark this PDP as complete?" : "Mark this PDP as active?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmStatusPlan?.nextStatus === "completed"
                  ? `The plan "${confirmStatusPlan?.title}" will be moved to completed status.`
                  : `The plan "${confirmStatusPlan?.title}" will be moved back to active status.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={Boolean(confirmStatusPlan && isBusy(confirmStatusPlan.id))}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={Boolean(confirmStatusPlan && isBusy(confirmStatusPlan.id))}
                onClick={() => {
                  if (!confirmStatusPlan) return;
                  void handleUpdateStatus(confirmStatusPlan.id, confirmStatusPlan.nextStatus);
                  setConfirmStatusPlan(null);
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}