'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Filter, Search, FileText, CheckCircle, Clock, Eye, BarChart3, ChevronDown, X, Calendar, Award, User } from 'lucide-react';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import { cpdService } from "@/lib/api/cpd";

type EvidenceFile = {
  file_name: string;
  file_url: string;
  file_size: string;
};

type Activity = {
  id: string | number;
  title: string;
  description: string;
  date: string;
  hours: number;
  category: string;
  type: string;
  status: string;
  files: number;
  certificate_url?: string | null;
  has_evidence?: boolean;
  evidence_file?: EvidenceFile | null;
};

export default function CPDActivitiesLog() {
  const router = useRouter();
  const defaultCategory = 'All Categories';
  const defaultType = 'All Types';
  const defaultYear = 'All Years';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(defaultCategory);
  const [typeFilter, setTypeFilter] = useState(defaultType);
  const [yearFilter, setYearFilter] = useState(defaultYear);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [apiCategoryOptions, setApiCategoryOptions] = useState<string[]>([]);
  const [apiTypeOptions, setApiTypeOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [summaryData, setSummaryData] = useState<Record<string, unknown> | null>(null);
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let alive = true;
    const getText = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
    const getNum = (v: unknown, fallback = 0) =>
      typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : fallback);
    const toDate = (value: string) => {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value || "N/A";
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const run = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const [historyRaw, analyticsRaw, requirementsRaw, summaryRaw] = await Promise.all([
          cpdService.history({ limit: 200, offset: 0 }),
          cpdService.analytics(),
          cpdService.requirements("dentist"),
          cpdService.summary(),
        ]);
        if (!alive) return;

        const historyRoot = (historyRaw && typeof historyRaw === "object" ? historyRaw : {}) as Record<string, unknown>;
        const data = (historyRoot.data && typeof historyRoot.data === "object" ? historyRoot.data : historyRoot) as Record<string, unknown>;
        const summaryRoot = (summaryRaw && typeof summaryRaw === "object" ? summaryRaw : {}) as Record<string, unknown>;
        const summaryDataParsed = (summaryRoot.data && typeof summaryRoot.data === "object" ? summaryRoot.data : summaryRoot) as Record<string, unknown>;
        setSummaryData(summaryDataParsed);
        const summaryRecent = Array.isArray(summaryDataParsed.recent_activity) ? summaryDataParsed.recent_activity : [];
        const summaryCourses = Array.isArray(summaryDataParsed.courses) ? summaryDataParsed.courses : [];
        
        const analyticsRoot = (analyticsRaw && typeof analyticsRaw === "object" ? analyticsRaw : {}) as Record<string, unknown>;
        const analyticsDataParsed = (analyticsRoot.data && typeof analyticsRoot.data === "object" ? analyticsRoot.data : analyticsRoot) as Record<string, unknown>;
        setAnalyticsData(analyticsDataParsed);
        const list = Array.isArray(data.history)
          ? data.history
          : Array.isArray(data.activities)
            ? data.activities
            : Array.isArray(data.items)
              ? data.items
              : Array.isArray(data.recent_completions)
                ? data.recent_completions
                : Array.isArray(data.completed_courses)
                  ? data.completed_courses
                  : summaryRecent.length
                    ? summaryRecent
                    : summaryCourses.length
                      ? summaryCourses
              : Array.isArray(historyRaw)
                ? historyRaw
                : [];
        const mapped: Activity[] = (list as unknown[]).map((item, idx) => {
          const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          const dateRaw = getText(row.completion_date_formatted ?? row.date_completed ?? row.date ?? row.completed_at ?? row.completion_date ?? row.last_activity, "");
          const inferredType = row.course_id ? "Platform Course" : "External";
          const statusText =
            getText(row.status)
            || (typeof row.completed === "boolean" ? (row.completed ? "Completed" : "In Progress") : "")
            || "Verified";
          const evidenceRaw = row.evidence_file && typeof row.evidence_file === "object" ? row.evidence_file as Record<string, unknown> : null;
          const evidenceFile: EvidenceFile | null = evidenceRaw ? {
            file_name: getText(evidenceRaw.file_name, "Evidence file"),
            file_url: getText(evidenceRaw.file_url, ""),
            file_size: getText(evidenceRaw.file_size, ""),
          } : null;
          const hasEvidence = row.has_evidence === true || !!evidenceFile;
          return {
            id: getText(row.id ?? row.course_id, String(idx + 1)),
            title: getText(row.title ?? row.activity_name ?? row.course_title ?? row.name, "Untitled activity"),
            description: getText(row.description ?? row.learning_outcomes, ""),
            date: toDate(dateRaw),
            hours: getNum(row.hours ?? row.duration_hours ?? row.cpd_hours, 0),
            category: getText(row.gdc_category ?? row.category ?? row.category_name, "General"),
            type: getText(row.activity_type ?? row.type, inferredType),
            status: statusText,
            files: getNum(row.evidence_files_count ?? row.files ?? row.evidence_count, hasEvidence ? 1 : 0),
            certificate_url: getText(row.certificate_url, null) || null,
            has_evidence: hasEvidence,
            evidence_file: evidenceFile,
          };
        });
        setActivities(mapped);

        // Build filter options from dedicated API metadata + history fallback.
        const analyticsCategories = Array.isArray(analyticsDataParsed.category_breakdown)
          ? analyticsDataParsed.category_breakdown
          : Array.isArray(analyticsDataParsed.category_hours)
            ? analyticsDataParsed.category_hours
            : Array.isArray(analyticsDataParsed.categories)
              ? analyticsDataParsed.categories
              : [];

        const requirementsRoot = (requirementsRaw && typeof requirementsRaw === "object" ? requirementsRaw : {}) as Record<string, unknown>;
        const requirementsData = (requirementsRoot.data && typeof requirementsRoot.data === "object" ? requirementsRoot.data : requirementsRoot) as Record<string, unknown>;
        const requirementCategories = Array.isArray(requirementsData.categories)
          ? requirementsData.categories
          : Array.isArray(requirementsData.gdc_categories)
            ? requirementsData.gdc_categories
            : [];
        const requirementTypes = Array.isArray(requirementsData.activity_types)
          ? requirementsData.activity_types
          : [];

        const parsedApiCategories = Array.from(
          new Set(
            [
              ...mapped.map((a) => a.category).filter(Boolean),
              ...(analyticsCategories as unknown[]).map((item) => {
                if (typeof item === "string") return item;
                const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
                return getText(row.category ?? row.name, "");
              }),
              ...(requirementCategories as unknown[]).map((item) => {
                if (typeof item === "string") return item;
                const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
                return getText(row.name ?? row.title, "");
              }),
            ].filter(Boolean)
          )
        );
        const parsedApiTypes = Array.from(
          new Set(
            [
              ...mapped.map((a) => a.type),
              ...(requirementTypes as unknown[]).map((item) => {
                if (typeof item === "string") return item;
                const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
                return getText(row.name ?? row.title ?? row.value, "");
              }),
            ].filter(Boolean)
          )
        );
        setApiCategoryOptions(parsedApiCategories);
        setApiTypeOptions(parsedApiTypes);
      } catch {
        if (!alive) return;
        setActivities([]);
        setApiCategoryOptions([]);
        setApiTypeOptions([]);
        setLoadError("Unable to load CPD activities right now.");
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, []);

  const categoryBreakdown = useMemo(() => {
    const getText = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
    const getNum = (v: unknown, fallback = 0) =>
      typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : fallback);
    
    // Use analytics API category_breakdown if available, otherwise calculate from activities
    if (analyticsData && Array.isArray(analyticsData.category_breakdown)) {
      return (analyticsData.category_breakdown as unknown[]).map((item) => {
        const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        return {
          name: getText(row.category ?? row.name, ""),
          hours: getNum(row.hours, 0),
        };
      }).filter((cat) => cat.name && cat.hours > 0);
    }
    // Fallback to calculating from activities
    const grouped = activities.reduce<Record<string, number>>((acc, activity) => {
      const key = activity.category || "General";
      acc[key] = (acc[key] || 0) + (activity.hours || 0);
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, hours]) => ({ name, hours })).filter((cat) => cat.hours > 0);
  }, [activities, analyticsData]);
  // Only use API categories/types - no hardcoded defaults
  const categoryOptions = useMemo(
    () => {
      return apiCategoryOptions.length > 0 ? apiCategoryOptions : [];
    },
    [apiCategoryOptions]
  );
  const typeOptions = useMemo(
    () => {
      return apiTypeOptions.length > 0 ? apiTypeOptions : [];
    },
    [apiTypeOptions]
  );
  // Default Years (current year and previous 5 years)
  const getDefaultYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 5; i++) {
      years.push(String(currentYear - i));
    }
    return years;
  };

  const yearOptions = useMemo(
    () => {
      const activityYears = Array.from(new Set(activities.map((a) => getActivityYear(a.date)).filter(Boolean)));
      const defaultYears = getDefaultYears();
      const combined = Array.from(new Set([...defaultYears, ...activityYears])).sort((a, b) => Number(b) - Number(a));
      return combined.length > 0 ? combined : defaultYears;
    },
    [activities]
  );

  const handleDownloadCertificate = (activity: Activity) => {
    // If certificate_url exists from API, use it
    if (activity.certificate_url) {
      window.open(activity.certificate_url, '_blank');
      return;
    }
    // Fallback: Create a simple certificate download
    const certificateContent = `
CPD Certificate of Completion
============================

Activity: ${activity.title}
${activity.description ? `Description: ${activity.description}` : ''}
Date: ${activity.date}
Duration: ${activity.hours} CPD Hours
Category: ${activity.category}
Type: ${activity.type}
Status: ${activity.status}

This certificate confirms successful completion of the above CPD activity.
Certificate ID: CPD-${activity.id}-${Date.now()}
Issued on: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
    `;

    const blob = new Blob([certificateContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CPD-Certificate-${activity.title.replace(/\s+/g, '-')}-${activity.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleViewEvidenceFiles = (activity: Activity) => {
    if (activity.evidence_file && activity.evidence_file.file_url) {
      window.open(activity.evidence_file.file_url, '_blank');
      return;
    }
    alert(`No evidence files available for "${activity.title}".`);
  };

  const handleViewActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  };

  function getActivityYear(date: string) {
    const match = date.match(/\b\d{4}\b/);
    return match ? match[0] : '';
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = normalizedSearch.length === 0
      || activity.title.toLowerCase().includes(normalizedSearch)
      || activity.description.toLowerCase().includes(normalizedSearch)
      || activity.category.toLowerCase().includes(normalizedSearch)
      || activity.type.toLowerCase().includes(normalizedSearch);

    const matchesCategory = categoryFilter === defaultCategory || activity.category === categoryFilter;
    const matchesType = typeFilter === defaultType || activity.type === typeFilter;
    const matchesYear = yearFilter === defaultYear || getActivityYear(activity.date) === yearFilter;

    return matchesSearch && matchesCategory && matchesType && matchesYear;
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter(defaultCategory);
    setTypeFilter(defaultType);
    setYearFilter(defaultYear);
  };

  // Get stats from API data (summary/analytics) instead of calculating from activities
  const getNum = (v: unknown, fallback = 0) =>
    typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : fallback);
  
  const getSummaryValue = (path: string[]) => {
    if (!summaryData) return null;
    let current: unknown = summaryData;
    for (const key of path) {
      if (current && typeof current === "object") {
        current = (current as Record<string, unknown>)[key];
      } else {
        return null;
      }
    }
    return typeof current === "number" ? current : null;
  };
  
  const getAnalyticsValue = (path: string[]) => {
    if (!analyticsData) return null;
    let current: unknown = analyticsData;
    for (const key of path) {
      if (current && typeof current === "object") {
        current = (current as Record<string, unknown>)[key];
      } else {
        return null;
      }
    }
    return typeof current === "number" ? current : null;
  };
  
  const totalRecords = getSummaryValue(["summary", "lifetime_courses"]) 
    ?? getAnalyticsValue(["quick_stats", "total_lifetime_courses"])
    ?? activities.length;
  
  const totalHours = getSummaryValue(["summary", "lifetime_hours"])
    ?? getAnalyticsValue(["quick_stats", "total_lifetime_hours"])
    ?? activities.reduce((sum, item) => sum + item.hours, 0);
  
  const verifiedHours = getSummaryValue(["summary", "verified_hours"])
    ?? getSummaryValue(["verified_hours"])
    ?? totalHours; // If no verified hours, assume all are verified
  
  const withEvidence = activities.filter((item) => item.files > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        {/* Header Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 sm:p-8 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button 
                  onClick={() => router.back()}
                  className="w-10 h-10 bg-purple-500 hover:bg-purple-400 rounded-lg flex items-center justify-center transition-colors"
                >
                  <ArrowLeft className="text-white" size={20} />
                </button>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">CPD Records Log</h2>
                  <p className="text-purple-100 text-sm sm:text-base">View and manage all your CPD activities</p>
                </div>
              </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button 
                onClick={() => router.push('/certificates')}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                View All Records
              </button>
              <button 
                onClick={() => router.push('/cpd-Logexternal')}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                + Log External CPD
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {loadError && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {loadError}
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="bg-gray-200 p-2 sm:p-3 rounded-lg w-10 h-10"></div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard
                icon={<FileText className="text-purple-600" size={24} />}
                label="Total Records"
                value={String(totalRecords)}
              />
              <StatCard
                icon={<Clock className="text-purple-600" size={24} />}
                label="Total Hours"
                value={totalHours.toFixed(1)}
              />
              <StatCard
                icon={<CheckCircle className="text-green-600" size={24} />}
                label="Verified Hours"
                value={verifiedHours.toFixed(1)}
              />
              <StatCard
                icon={<FileText className="text-purple-600" size={24} />}
                label="With Evidence"
                value={String(withEvidence)}
              />
            </>
          )}
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 mt-6 sm:mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 lg:sticky lg:top-6">
              {isLoading ? (
                <div className="animate-pulse space-y-6">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="space-y-4">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                  <div className="pt-8 border-t border-gray-200">
                    <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i}>
                          <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                          <div className="h-2 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
              <div className="flex items-center space-x-2 mb-6">
                <Filter className="text-purple-600" size={20} />
                <h3 className="font-semibold text-gray-900">Filters</h3>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-left flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <span className="text-gray-900">{categoryFilter}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]">
                    <DropdownMenuItem 
                      onClick={() => setCategoryFilter('All Categories')}
                      className={categoryFilter === 'All Categories' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      All Categories
                    </DropdownMenuItem>
                    {categoryOptions.map((option) => (
                    <DropdownMenuItem 
                        key={option}
                        onClick={() => setCategoryFilter(option)}
                        className={categoryFilter === option ? 'bg-purple-50 text-purple-700' : ''}
                    >
                        {option}
                    </DropdownMenuItem>
                    ))}
                    {!categoryOptions.length && (
                      <DropdownMenuItem disabled>No categories available</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-left flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <span className="text-gray-900">{typeFilter}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]">
                    <DropdownMenuItem 
                      onClick={() => setTypeFilter('All Types')}
                      className={typeFilter === 'All Types' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      All Types
                    </DropdownMenuItem>
                    {typeOptions.map((option) => (
                    <DropdownMenuItem 
                        key={option}
                        onClick={() => setTypeFilter(option)}
                        className={typeFilter === option ? 'bg-purple-50 text-purple-700' : ''}
                    >
                        {option}
                    </DropdownMenuItem>
                    ))}
                    {!typeOptions.length && (
                      <DropdownMenuItem disabled>No types available</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Year Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-left flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <span className="text-gray-900">{yearFilter}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]">
                    <DropdownMenuItem 
                      onClick={() => setYearFilter('All Years')}
                      className={yearFilter === 'All Years' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      All Years
                    </DropdownMenuItem>
                    {yearOptions.map((option) => (
                    <DropdownMenuItem 
                        key={option}
                        onClick={() => setYearFilter(option)}
                        className={yearFilter === option ? 'bg-purple-50 text-purple-700' : ''}
                    >
                        {option}
                    </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Clear Filters
              </button>

              {/* Hours by Category */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Hours by Category</h4>
                {categoryBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {categoryBreakdown.map((cat, index) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{cat.name}</span>
                          <span className="font-semibold text-gray-900">{cat.hours}h</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-purple-600 h-1.5 rounded-full"
                            style={{ width: `${categoryBreakdown.length ? (cat.hours / Math.max(...categoryBreakdown.map((i) => i.hours), 1)) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No category data available</p>
                )}
              </div>
                </>
              )}
            </div>
          </div>

          {/* Activities List */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-purple-700">All CPD Activities</h3>
                <p className="text-sm text-gray-600">
                  {isLoading ? "Loading..." : `Showing ${filteredActivities.length} records`}
                </p>
              </div>

              {isLoading ? (
                <div className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                        <div className="flex gap-2">
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-sm">No activities found.</p>
                  {activities.length === 0 && (
                    <p className="text-xs mt-1">No CPD activities returned by API.</p>
                  )}
                </div>
              ) : (
                <>
              {/* Mobile Card View */}
              <div className="lg:hidden">
                <div className="divide-y divide-gray-200">
                  {filteredActivities.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">{activity.title}</h4>
                          {activity.description && (
                            <p className="text-xs text-gray-600 line-clamp-2">{activity.description}</p>
                          )}
                        </div>
                        <button 
                          onClick={() => handleViewActivity(activity)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye size={16} className="text-gray-600" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center space-x-1 text-xs text-gray-700">
                          <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{activity.date}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-700">
                          <Clock size={12} className="text-gray-400 flex-shrink-0" />
                          <span>{activity.hours}h</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {activity.category}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          activity.type === 'Platform Course'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {activity.type}
                        </span>
                        <div className="flex items-center space-x-1 text-xs text-green-700">
                          <CheckCircle size={12} className="flex-shrink-0" />
                          <span>{activity.files} file</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Activity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Hours
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredActivities.map((activity) => (
                        <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                          <div className="max-w-xs">
                            <div className="font-semibold text-gray-900 text-sm">{activity.title}</div>
                            {activity.description && (
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">{activity.description}</div>
                            )}
                          </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-1 text-sm text-gray-700">
                              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="whitespace-nowrap">{activity.date}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-1 text-sm text-gray-700">
                              <Clock size={16} className="text-gray-400 shrink-0" />
                              <span>{activity.hours}h</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-700">{activity.category}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                              activity.type === 'Platform Course'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {activity.type}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-1">
                              <CheckCircle size={16} className="text-green-600 shrink-0" />
                              <span className="text-sm text-gray-700">{activity.files} file</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <button 
                              onClick={() => handleViewActivity(activity)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Eye size={16} className="text-gray-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      </main>
      
      {/* Activity Details Modal */}
      {isModalOpen && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center sm:justify-center z-50 sm:p-4">
          <div className="bg-white shadow-2xl w-full flex-1 sm:flex-initial sm:max-w-2xl sm:max-h-[90vh] overflow-hidden sm:rounded-xl flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">CPD Activity Details</h3>
                  <p className="text-purple-100 text-xs sm:text-sm sm:text-base">View complete activity information</p>
                </div>
                <button 
                  onClick={closeModal}
                  className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" size={16} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-1">
              {/* Activity Title and Description */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-purple-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <Award className="text-purple-600 w-4 h-4 sm:w-6 sm:h-6" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 leading-tight">{selectedActivity.title}</h4>
                    {selectedActivity.description && (
                      <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2">{selectedActivity.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <Calendar className="text-gray-600 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" size={14} />
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">Date</span>
                  </div>
                  <p className="text-gray-700 text-xs sm:text-sm">{selectedActivity.date}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <Clock className="text-gray-600 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" size={14} />
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">Duration</span>
                  </div>
                  <p className="text-gray-700 text-xs sm:text-sm">{selectedActivity.hours} CPD Hours</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <FileText className="text-gray-600 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" size={14} />
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">Category</span>
                  </div>
                  <p className="text-gray-700 text-xs sm:text-sm">{selectedActivity.category}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <User className="text-gray-600 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" size={14} />
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">Type</span>
                  </div>
                  <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    selectedActivity.type === 'Platform Course'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {selectedActivity.type}
                  </span>
                </div>
              </div>

              {/* Status and Files */}
              <div className="border-t pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircle className="text-green-600 w-4 h-4 sm:w-5 sm:h-5" size={16} />
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">Activity Status</span>
                    <span className="text-green-600 font-medium text-xs sm:text-sm">{selectedActivity.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <FileText className="text-gray-600 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" size={14} />
                    <span className="text-gray-700 text-xs sm:text-sm">{selectedActivity.files} file(s) attached</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6 sm:mt-8">
                <button
                  onClick={() => handleDownloadCertificate(selectedActivity)}
                  disabled={!selectedActivity.certificate_url}
                  className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-xs sm:text-base ${selectedActivity.certificate_url ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  Download Certificate
                </button>
                <button
                  onClick={() => handleViewEvidenceFiles(selectedActivity)}
                  disabled={!selectedActivity.evidence_file?.file_url}
                  className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-xs sm:text-base ${selectedActivity.evidence_file?.file_url ? 'border border-gray-300 hover:bg-gray-50 text-gray-700' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'}`}
                >
                  View Evidence Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
      
    </div>
  );
}

function NavLink({ label, active = false }: { label: string; active?: boolean }): React.ReactElement {
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }): React.ReactElement {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2">{label}</p>
          <p className="text-xl sm:text-3xl font-bold text-purple-600 truncate">{value}</p>
        </div>
        <div className="bg-purple-50 p-2 sm:p-3 rounded-lg flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}
