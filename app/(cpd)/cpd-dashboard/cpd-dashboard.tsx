'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Clock, TrendingUp, CheckCircle, AlertCircle, BookOpen, PlusCircle, FileText, TrendingDown, File, Award } from 'lucide-react';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useRouter } from 'next/navigation';
import { Spinner } from "@/components/ui/spinner";
import { cpdService } from "@/lib/api/cpd";
import { pdpService } from "@/lib/api/pdp";
import { certificatesService } from "@/lib/api/certificates";
import { userService } from "@/lib/api/user";

type CpdSummaryView = {
  hoursCompleted: number;
  totalHours: number;
  hoursRemaining: number;
  cycleStart: string;
  cycleEnd: string;
  verifiedHours: number;
  selfDeclaredHours: number;
  evidencePercentage: number;
};

type CategoryView = {
  name: string;
  hours: number;
  total: number;
};

type MandatoryTrainingView = {
  name: string;
  status: string;
  expires: string;
  subtitle: string;
  statusColor: string;
};

type RecentActivityView = {
  title: string;
  date: string;
  hours: number;
  category: string;
  type: string;
  icon: 'award' | 'file';
};

type PdpProgressView = {
  title: string;
  completed: number;
  total: number;
  percentage: number;
};

export default function CPDDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<CpdSummaryView | null>(null);
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [mandatoryTraining, setMandatoryTraining] = useState<MandatoryTrainingView[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivityView[]>([]);
  const [pdpProgress, setPdpProgress] = useState<PdpProgressView | null>(null);
  const [evidenceStats, setEvidenceStats] = useState<{ totalFiles: number; certificates: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isRecentViewAllLoading, setIsRecentViewAllLoading] = useState(false);

  const handleRecentViewAll = () => {
    if (isRecentViewAllLoading) return;
    setIsRecentViewAllLoading(true);
    router.push('/cpd-activities-log');
  };

  useEffect(() => {
    let alive = true;

    const getText = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
    const getNum = (v: unknown, fallback = 0) =>
      typeof v === 'number' ? v : (typeof v === 'string' && !Number.isNaN(Number(v)) ? Number(v) : fallback);
    const asObj = (v: unknown) => ((v && typeof v === 'object') ? (v as Record<string, unknown>) : {});
    const pickData = (raw: unknown) => {
      const root = asObj(raw);
      const data = root.data;
      return (data && typeof data === 'object') ? (data as Record<string, unknown>) : root;
    };
    const formatDate = (value: unknown) => {
      const text = getText(value, '');
      if (!text) return 'N/A';
      const d = new Date(text);
      if (Number.isNaN(d.getTime())) return text;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const expirySubtitle = (value: unknown) => {
      const text = getText(value, '');
      if (!text) return '';
      const d = new Date(text);
      if (Number.isNaN(d.getTime())) return '';
      const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
      const days = Math.abs(diffDays);
      return `Expired ${days} day${days === 1 ? '' : 's'} ago`;
    };

    const run = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [summaryRaw, analyticsRaw, requirementsRaw, historyRaw, pdpStatsRaw, pdpListRaw, certsRaw] = await Promise.all([
          cpdService.summary(),
          cpdService.analytics(),
          cpdService.requirements('dentist'),
          cpdService.history({ limit: 4, offset: 0 }),
          pdpService.stats(),
          pdpService.list({ status: 'active', perPage: 1, page: 1 }),
          certificatesService.getMyCertificates({ perPage: 200, page: 1 }),
        ]);

        if (!alive) return;

        const summaryData = pickData(summaryRaw);
        const summaryBlock = asObj(summaryData.summary);
        const requirementsBlock = asObj(summaryData.requirements);
        const cycleBlock = asObj(summaryData.cycle);
        const completedHours = getNum(
          summaryData.hours_completed ?? summaryData.completed_hours ?? summaryData.total_hours_completed ?? summaryBlock.total_completed,
          0
        );
        const totalHours = getNum(
          summaryData.total_required_hours ?? summaryData.total_hours ?? requirementsBlock.total_hours ?? summaryBlock.target_hours,
          0
        );
        const verifiedHours = getNum(
          summaryData.verified_hours ?? summaryData.verified_cpd_hours ?? summaryData.verified_records ?? summaryBlock.verified_hours,
          0
        );
        const selfDeclaredHours = getNum(
          summaryData.self_declared_hours ?? summaryData.self_declared ?? summaryBlock.self_declared_hours,
          Math.max(completedHours - verifiedHours, 0)
        );
        const evidencePercentage = getNum(
          summaryData.evidence_coverage ?? summaryData.evidence_percentage ?? summaryBlock.evidence_percentage,
          0
        );
        setSummary({
          hoursCompleted: completedHours,
          totalHours,
          hoursRemaining: Math.max(totalHours - completedHours, 0),
          cycleStart: getText(summaryData.cycle_start ?? cycleBlock.start_date_formatted ?? cycleBlock.start_date, 'N/A'),
          cycleEnd: getText(summaryData.cycle_end ?? cycleBlock.end_date_formatted ?? cycleBlock.end_date, 'N/A'),
          verifiedHours,
          selfDeclaredHours,
          evidencePercentage,
        });

        const analyticsData = pickData(analyticsRaw);
        // Check multiple possible locations for category data
        let categoryRows = Array.isArray(analyticsData.category_hours)
          ? analyticsData.category_hours
          : Array.isArray(analyticsData.categories)
            ? analyticsData.categories
            : [];
        
        // If no category data in analytics, check summary API's yearly_breakdown
        if (categoryRows.length === 0 && Array.isArray(summaryData.yearly_breakdown)) {
          categoryRows = summaryData.yearly_breakdown;
        }
        
        // Only set categories if API returns actual data
        const categoryData = (categoryRows as unknown[]).map((item) => {
          const row = asObj(item);
          const hours = getNum(row.hours ?? row.total_hours, 0);
          const total = getNum(row.total ?? row.target ?? row.target_hours ?? row.required_hours, 0);
          const name = getText(row.name ?? row.category ?? (row.year ? String(row.year) : ''), '');
          // Only include if we have a name from API and hours > 0
          if (!name || hours === 0) return null;
          return {
            name: typeof row.year === 'number' ? `Year ${row.year}` : name,
            hours,
            total: total > 0 ? total : hours,
          };
        }).filter((cat): cat is CategoryView => cat !== null);
        setCategories(categoryData);

        const requirementsData = pickData(requirementsRaw);
        const reqRows = Array.isArray(requirementsData.mandatory_training)
          ? requirementsData.mandatory_training
          : Array.isArray(requirementsData.requirements)
            ? requirementsData.requirements
            : [];
        // Only set mandatory training if API returns actual data
        const trainingData = (reqRows as unknown[]).map((item) => {
          const row = asObj(item);
          const name = getText(row.name ?? row.title, '');
          const status = getText(row.status, '');
          const expires = getText(row.expiry_date ?? row.date, '');
          // Only include if we have a name from API
          if (!name) return null;
          const lower = status.toLowerCase();
          const statusColor = lower.includes('valid')
            ? 'bg-green-100 text-green-700'
            : lower.includes('expir')
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700';
          return {
            name,
            status: status || 'Unknown',
            expires: expires || 'N/A',
            subtitle: expires ? expirySubtitle(expires) : '',
            statusColor,
          };
        }).filter((training): training is MandatoryTrainingView => training !== null);
        setMandatoryTraining(trainingData);

        const historyData = pickData(historyRaw);
        const historyRows = Array.isArray(historyData.history)
          ? historyData.history
          : Array.isArray(historyData.activities)
            ? historyData.activities
            : Array.isArray(historyData.items)
              ? historyData.items
              : Array.isArray(historyData.recent_completions)
                ? historyData.recent_completions
              : [];
        // Only set recent activities if API returns actual data
        const recent = (historyRows as unknown[]).slice(0, 4).map((item) => {
          const row = asObj(item);
          const title = getText(row.title ?? row.activity_name ?? row.course_title ?? row.name, '');
          // Only include if we have a title from API
          if (!title) return null;
          const type = getText(row.activity_type ?? row.type, 'External');
          return {
            title,
            date: formatDate(row.date_completed ?? row.date ?? row.completed_at ?? row.completion_date),
            hours: getNum(row.hours ?? row.duration_hours ?? row.cpd_hours, 0),
            category: getText(row.gdc_category ?? row.category, ''),
            type,
            icon: type.toLowerCase().includes('platform') ? 'award' : 'file',
          } as RecentActivityView;
        }).filter((activity): activity is RecentActivityView => activity !== null);
        setRecentActivities(recent);
        const evidenceFiles = (historyRows as unknown[]).reduce((sum: number, item) => {
          const row = asObj(item);
          return sum + getNum(row.evidence_files_count ?? row.files, 0);
        }, 0);

        // Extract PDP data from API responses
        // pdpListRaw is { items: [...], raw: {...} } from pdpService.list
        // API returns: { success: true, data: { pdps: [...] } }
        const pdpListRoot = (pdpListRaw && typeof pdpListRaw === 'object' ? pdpListRaw : {}) as Record<string, unknown>;
        const pdpListData = pickData(pdpListRoot.raw ?? pdpListRoot);
        const pdpStatsData = pickData(pdpStatsRaw);
        
        // Get PDP list - API returns data.pdps array (not data.items)
        const pdpListArray = Array.isArray(pdpListData.pdps) 
          ? pdpListData.pdps 
          : Array.isArray(pdpListData.items)
            ? pdpListData.items
            : Array.isArray(pdpListRoot.items) 
              ? pdpListRoot.items 
              : [];
        const currentPdp = pdpListArray.length > 0 ? asObj(pdpListArray[0]) : null;
        
        // Get PDP stats - API returns total_learning_activities, completed_milestones, average_progress
        const pdpTotal = getNum(
          pdpStatsData.total_learning_activities ?? 
          pdpStatsData.total_goals ?? 
          pdpStatsData.goals_total ?? 
          pdpStatsData.total, 
          0
        );
        const pdpCompleted = getNum(
          pdpStatsData.completed_milestones ?? 
          pdpStatsData.completed_goals ?? 
          pdpStatsData.goals_completed ?? 
          pdpStatsData.completed, 
          0
        );
        const pdpPercentageFromMeta = currentPdp?.meta && typeof currentPdp.meta === 'object' 
          ? getNum((currentPdp.meta as Record<string, unknown>).progress_percentage, 0)
          : 0;
        const pdpPercentage = pdpPercentageFromMeta > 0 
          ? pdpPercentageFromMeta 
          : getNum(pdpStatsData.average_progress, pdpTotal > 0 ? Math.round((pdpCompleted / pdpTotal) * 100) : 0);
        
        // Get PDP name from list
        const pdpName = currentPdp 
          ? getText(currentPdp.name ?? currentPdp.title, '')
          : '';
        
        // Only set PDP progress if we have actual data from API
        if (pdpName || pdpTotal > 0) {
        setPdpProgress({
            title: pdpName || '',
          completed: pdpCompleted,
          total: pdpTotal,
          percentage: pdpPercentage,
        });
        } else {
          setPdpProgress(null);
        }

        const certsData = pickData(certsRaw);
        const certRows = Array.isArray(certsData.certificates)
          ? certsData.certificates
          : Array.isArray(certsData.items)
            ? certsData.items
            : [];
        const certCount = getNum(certsData.total, Array.isArray(certRows) ? certRows.length : 0);
        setEvidenceStats({
          totalFiles: evidenceFiles + certCount,
          certificates: certCount,
        });
      } catch {
        if (!alive) return;
        setLoadError('Unable to load CPD dashboard data right now.');
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, []);

  const completionPercentage = useMemo(
    () => (summary && summary.totalHours > 0 ? Math.round((summary.hoursCompleted / summary.totalHours) * 100) : 0),
    [summary]
  );
  const complianceOnTrack = completionPercentage >= 80;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        {/* Header Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Track Your CPD</h2>
                <p className="text-purple-100 text-sm sm:text-base">Track your professional development and compliance</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button 
                  onClick={() => router.push('/cpd-activities-log')}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  View All Records
                </button>
                <button 
                  onClick={() => router.push('/cpd-Logexternal')}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <PlusCircle size={16} />
                  <span className="hidden sm:inline">Log External CPD</span>
                  <span className="sm:hidden">Log CPD</span>
                </button>
              </div>
            </div>
          </div>
          {isLoading && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
              <Spinner />
              Loading CPD dashboard data...
            </div>
          )}
          {loadError && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {loadError}
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* CPD Hours Card */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                  <Clock className="text-purple-600" size={20} />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">CPD Hours</h3>
                </div>
                {isLoading || !summary ? (
                  <>
                    {/* Skeleton for cycle info */}
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-3 sm:mb-4"></div>
                    {/* Skeleton for hours display */}
                    <div className="flex items-end space-x-2 mb-3 sm:mb-4">
                      <div className="h-12 sm:h-16 lg:h-20 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-6 sm:h-8 w-24 sm:w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                    </div>
                    {/* Skeleton for progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-3 sm:mb-4">
                      <div className="bg-gray-300 h-2 sm:h-3 rounded-full w-0 animate-pulse"></div>
                    </div>
                    {/* Skeleton for stats */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-2">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </>
                ) : (
                  <>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  Current 5-year cycle ({summary.cycleStart} - {summary.cycleEnd})
                </p>
                <div className="flex items-end space-x-2 mb-3 sm:mb-4">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-purple-600">{summary.hoursCompleted}</div>
                  <div className="text-lg sm:text-xl text-gray-500 pb-2">/ {summary.totalHours} hours</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-3 sm:mb-4">
                  <div 
                    className="bg-purple-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-2">
                  <div>
                    <span className="text-gray-600">Completed</span>
                    <span className="ml-2 font-semibold text-purple-600">{completionPercentage}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Hours remaining</span>
                    <span className="ml-2 font-semibold text-gray-900">{summary.hoursRemaining} hours</span>
                  </div>
                </div>
                  </>
                )}
              </div>

              {/* Mandatory Training Status */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <h3 className="text-base sm:text-lg font-semibold text-purple-700 mb-2">Mandatory Training Status</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Essential requirements for dental practice</p>
                <div className="space-y-2 sm:space-y-3">
                  {mandatoryTraining.map((training, index) => (
                    <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">{training.name}</h4>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Expires: {training.expires}</span>
                            </span>
                            {training.subtitle && <span>{training.subtitle}</span>}
                          </div>
                        </div>
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${training.statusColor}`}>
                          {training.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!mandatoryTraining.length && (
                    <p className="text-xs sm:text-sm text-gray-500">No mandatory training records returned by API.</p>
                  )}
                </div>
              </div>

              {/* Recent CPD Activity */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-purple-700">Recent CPD Activity</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Your latest completed activities</p>
                  </div>
                  <button
                    onClick={handleRecentViewAll}
                    disabled={isRecentViewAllLoading}
                    className="text-purple-600 hover:text-purple-700 font-medium text-xs sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    {isRecentViewAllLoading ? (
                      <>
                        <Spinner />
                        Opening...
                      </>
                    ) : (
                      "View All"
                    )}
                  </button>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 sm:space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {activity.icon === 'award' ? (
                          <Award className="text-purple-600" size={16} />
                        ) : (
                          <File className="text-purple-600" size={16} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight">{activity.title}</h4>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1 text-xs text-gray-600">
                          <span className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{activity.date}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{activity.hours} hours</span>
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {activity.category}
                            </span>
                            <span className="px-1.5 sm:px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                              {activity.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!recentActivities.length && (
                    <p className="text-xs sm:text-sm text-gray-500">No recent CPD activity returned by API.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 sm:space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                  <TrendingUp className="text-purple-600" size={20} />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Quick Actions</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Manage your CPD activities</p>
                <div className="space-y-2">
                  <ActionButton 
                    icon={<BookOpen size={16} />} 
                    label="Browse CPD Courses" 
                    onClick={() => router.push('/courses')}
                  />
                  <ActionButton 
                    icon={<PlusCircle size={16} />} 
                    label="Add External CPD" 
                    onClick={() => router.push('/cpd-Logexternal')}
                  />
                  <ActionButton 
                    icon={<FileText size={16} />} 
                    label="Generate Audit Report" 
                    onClick={() => router.push('/cpd-generateaudit-report')}
                  />
                  <ActionButton 
                    icon={<TrendingUp size={16} />} 
                    label="View Development Plan" 
                    onClick={() => router.push('/pdp')}
                  />
                </div>
              </div>

              {/* Compliance Status */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                  <CheckCircle className="text-green-600" size={20} />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Compliance Status</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">GDC Enhanced CPD Framework</p>
                {isLoading || !summary ? (
                  <>
                    <div className="h-12 bg-gray-200 rounded-lg animate-pulse mb-3 sm:mb-4"></div>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </>
                ) : (
                  <>
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg mb-3 sm:mb-4">
                  {complianceOnTrack ? <CheckCircle className="text-green-600" size={16} /> : <AlertCircle className="text-amber-600" size={16} />}
                  <span className={`font-semibold text-sm sm:text-base ${complianceOnTrack ? 'text-green-700' : 'text-amber-700'}`}>
                    {complianceOnTrack ? 'On Track' : 'Needs Attention'}
                  </span>
                  <span className={`ml-auto text-xs sm:text-sm font-medium ${complianceOnTrack ? 'text-green-600' : 'text-amber-600'}`}>
                    {complianceOnTrack ? 'Annual target met' : 'Keep progressing'}
                  </span>
                </div>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verified CPD</span>
                    <span className="font-semibold text-gray-900">{summary.verifiedHours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Self-declared</span>
                    <span className="font-semibold text-gray-900">{summary.selfDeclaredHours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Records with evidence</span>
                    <span className="font-semibold text-gray-900">{summary.evidencePercentage}%</span>
                  </div>
                </div>
                  </>
                )}
              </div>

              {/* Category Breakdown */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <h3 className="text-base sm:text-lg font-semibold text-purple-700 mb-2">Category Breakdown</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Hours by GDC category</p>
                <div className="space-y-3 sm:space-y-4">
                  {categories.map((category, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-xs sm:text-sm mb-2">
                        <span className="text-gray-700">{category.name}</span>
                        <span className="font-semibold text-gray-900">{category.hours}/{category.total}h</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                        <div 
                          className="bg-purple-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(category.hours / category.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {!categories.length && (
                    <p className="text-xs sm:text-sm text-gray-500">No category breakdown returned by API.</p>
                  )}
                </div>
              </div>

              {/* PDP Progress */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <h3 className="text-base sm:text-lg font-semibold text-purple-700 mb-2">PDP Progress</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Development plan goals</p>
                {isLoading || !pdpProgress ? (
                  <>
                    <div className="mb-3 sm:mb-4">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-2 sm:mb-3">
                      <div className="bg-gray-300 h-2 sm:h-3 rounded-full w-0 animate-pulse"></div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-1">
                      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse mt-3 sm:mt-4"></div>
                  </>
                ) : (
                  <>
                <div className="mb-3 sm:mb-4">
                  <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Current PDP</h4>
                  <p className="text-xs sm:text-sm text-gray-700">{pdpProgress.title || 'Active PDP'}</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-2 sm:mb-3">
                  <div 
                    className="bg-purple-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pdpProgress.percentage}%` }}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-1">
                  <span className="text-gray-600">{pdpProgress.completed} of {pdpProgress.total} goals completed</span>
                  <span className="font-semibold text-purple-600">{pdpProgress.percentage}%</span>
                </div>
                <button 
                  onClick={() => router.push('/pdp')}
                  className="w-full mt-3 sm:mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm sm:text-base"
                >
                  View Full PDP
                </button>
                  </>
                )}
              </div>

              {/* Evidence Vault */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <h3 className="text-base sm:text-lg font-semibold text-purple-700 mb-2">Evidence Vault</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Stored certificates & documents</p>
                {isLoading || !evidenceStats ? (
                  <>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse mt-3 sm:mt-4"></div>
                  </>
                ) : (
                  <>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <File className="text-gray-600" size={16} />
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Total files</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-gray-900">{evidenceStats.totalFiles}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Award className="text-gray-600" size={16} />
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Certificates</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-gray-900">{evidenceStats.certificates}</span>
                  </div>
                </div>
                <button 
                  onClick={() => router.push('/certificates')}
                  className="w-full mt-3 sm:mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm sm:text-base"
                >
                  View Evidence
                </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      
      </main>
      
      <Footer />
    
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }): React.ReactElement {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-all group"
    >
      <div className="text-gray-600 group-hover:text-purple-600 transition-colors flex-shrink-0">
        {icon}
      </div>
      <span className="text-xs sm:text-sm font-medium text-gray-700 group-hover:text-purple-700 transition-colors leading-tight">
        {label}
      </span>
    </button>
  );
}