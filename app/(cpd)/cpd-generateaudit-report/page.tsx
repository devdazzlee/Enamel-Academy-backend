'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, CheckCircle, Download, AlertCircle } from 'lucide-react';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cpdService } from "@/lib/api/cpd";

export default function GenerateAuditReport() {
  const router = useRouter();
  const [reportFormat, setReportFormat] = useState('comprehensive');
  const [dateRange, setDateRange] = useState('Full 5-Year Cycle');
  const [includeOptions, setIncludeOptions] = useState({
    certificates: true,
    evidence: true,
    reflections: true,
    outcomes: true,
    verification: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [generateSuccess, setGenerateSuccess] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRole, setSelectedRole] = useState("dentist");
  const [complianceData, setComplianceData] = useState({
    hoursCompleted: 0,
    totalHours: 100,
    percentage: 0,
    cycleStart: 'N/A',
    cycleEnd: 'N/A',
    hoursRemaining: 100,
    totalRecords: 0,
    verified: 0,
    selfDeclared: 0,
    evidencePercentage: 0
  });
  const [categoryHours, setCategoryHours] = useState<Array<{ name: string; hours: number; percentage: number }>>([]);
  const [mandatoryTraining, setMandatoryTraining] = useState<Array<{ name: string; status: string; date: string; statusColor: string }>>([]);

  const auditReadiness = useMemo(() => {
    const checks = [
      { label: 'Sufficient CPD hours recorded', passed: complianceData.hoursCompleted >= complianceData.totalHours },
      { label: 'Learning outcomes documented', passed: complianceData.totalRecords > 0 },
      { label: 'Supporting evidence attached', passed: complianceData.evidencePercentage >= 70 },
      { label: 'Verified records available', passed: complianceData.verified > 0 },
    ];
    return checks.filter((c) => c.passed).map((c) => c.label);
  }, [complianceData]);

  useEffect(() => {
    let alive = true;
    const getText = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
    const getNum = (v: unknown, fallback = 0) =>
      typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : fallback);

    const run = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const [summaryRaw, analyticsRaw, requirementsRaw] = await Promise.all([
          cpdService.summary(),
          cpdService.analytics(),
          cpdService.requirements(selectedRole),
        ]);
        if (!alive) return;

        const summaryRoot = (summaryRaw && typeof summaryRaw === "object" ? summaryRaw : {}) as Record<string, unknown>;
        const summaryData = (summaryRoot.data && typeof summaryRoot.data === "object" ? summaryRoot.data : summaryRoot) as Record<string, unknown>;
        const analyticsRoot = (analyticsRaw && typeof analyticsRaw === "object" ? analyticsRaw : {}) as Record<string, unknown>;
        const analyticsData = (analyticsRoot.data && typeof analyticsRoot.data === "object" ? analyticsRoot.data : analyticsRoot) as Record<string, unknown>;
        const requirementsRoot = (requirementsRaw && typeof requirementsRaw === "object" ? requirementsRaw : {}) as Record<string, unknown>;
        const requirementsData = (requirementsRoot.data && typeof requirementsRoot.data === "object" ? requirementsRoot.data : requirementsRoot) as Record<string, unknown>;

        const hoursCompleted = getNum(summaryData.hours_completed ?? summaryData.completed_hours, 0);
        const totalHours = getNum(summaryData.total_required_hours ?? summaryData.total_hours, 100);
        const percentage = totalHours > 0 ? Math.round((hoursCompleted / totalHours) * 100) : 0;
        const totalRecords = getNum(summaryData.total_records ?? summaryData.activities_count, 0);
        const verified = getNum(summaryData.verified_records ?? summaryData.verified_count, 0);
        const evidencePercentage = getNum(summaryData.evidence_coverage ?? summaryData.evidence_percentage, 0);
        setComplianceData({
          hoursCompleted,
          totalHours,
          percentage,
          cycleStart: getText(summaryData.cycle_start, 'N/A'),
          cycleEnd: getText(summaryData.cycle_end, 'N/A'),
          hoursRemaining: Math.max(totalHours - hoursCompleted, 0),
          totalRecords,
          verified,
          selfDeclared: Math.max(totalRecords - verified, 0),
          evidencePercentage,
        });

        const categories = Array.isArray(analyticsData.category_hours)
          ? analyticsData.category_hours
          : Array.isArray(analyticsData.categories)
            ? analyticsData.categories
            : [];
        const categoryRows = (categories as unknown[]).map((item) => {
          const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return {
            name: getText(row.name ?? row.category, "General"),
            hours: getNum(row.hours, 0),
            percentage: getNum(row.percentage, 0),
          };
        });
        setCategoryHours(categoryRows);

        const requirements = Array.isArray(requirementsData.mandatory_training)
          ? requirementsData.mandatory_training
          : Array.isArray(requirementsData.requirements)
            ? requirementsData.requirements
            : [];
        const mappedReq = (requirements as unknown[]).map((item) => {
          const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          const status = getText(row.status, "Unknown");
          const statusColor = status.toLowerCase().includes("valid")
            ? "text-green-600 bg-green-100"
            : status.toLowerCase().includes("expir")
              ? "text-amber-600 bg-amber-100"
              : "text-red-600 bg-red-100";
          return {
            name: getText(row.name ?? row.title, "Training item"),
            status,
            date: getText(row.date ?? row.expiry_date, "N/A"),
            statusColor,
          };
        });
        setMandatoryTraining(mappedReq);
      } catch {
        if (!alive) return;
        setLoadError("Unable to load CPD audit data right now.");
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [selectedRole]);

  const handleGenerateReport = async () => {
    setGenerateError("");
    setGenerateSuccess("");
    setIsGenerating(true);
    const formatMap: Record<string, string> = {
      comprehensive: "pdf",
      summary: "summary",
      spreadsheet: "excel",
      evidence: "evidence_zip",
    };
    const dateMap: Record<string, string> = {
      "Full 5-Year Cycle": "full_cycle",
      "Last Year": "custom",
      "Custom Range": "custom",
    };
    try {
      await cpdService.generateAuditReport({
        format: formatMap[reportFormat] ?? "pdf",
        date_range: dateMap[dateRange] ?? "full_cycle",
        include_certificates: includeOptions.certificates,
        include_evidence: includeOptions.evidence,
        include_reflections: includeOptions.reflections,
        include_outcomes: includeOptions.outcomes,
        include_verification: includeOptions.verification,
      });
      setGenerateSuccess("Audit report request submitted successfully.");
    } catch {
      setGenerateError("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        {/* Header Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button 
                onClick={() => router.back()}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 hover:bg-purple-400 rounded-lg flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="text-white w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">Generate Audit Report</h2>
                <p className="text-purple-100 text-xs sm:text-sm lg:text-base">Create GDC-compliant CPD documentation for audit</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                onClick={() => router.push('/cpd-activities-log')}
                className="px-4 py-2 sm:px-6 sm:py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                View All Records
              </button>
              <button 
                onClick={() => router.push('/cpd-Logexternal')}
                className="px-4 py-2 sm:px-6 sm:py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                + Log External CPD
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {isLoading && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
            <Spinner />
            Loading audit data...
          </div>
        )}
        {loadError && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {loadError}
          </div>
        )}
        {generateSuccess && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {generateSuccess}
          </div>
        )}
        {generateError && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {generateError}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
          {/* Left Column - Compliance Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-semibold text-purple-700 mb-2">Compliance Summary</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Overview of your CPD compliance for audit purposes</p>

              {/* Hours Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">CPD Hours Completed</span>
                  <span className="px-2 sm:px-3 py-1 bg-purple-600 text-white rounded-full text-xs sm:text-sm font-bold">
                    {complianceData.percentage}%
                  </span>
                </div>
                <div className="flex items-end space-x-2 mb-2">
                  <span className="text-2xl sm:text-4xl font-bold text-purple-600">{complianceData.hoursCompleted}</span>
                  <span className="text-base sm:text-xl text-gray-500 pb-1">/ {complianceData.totalHours} hours</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-3 sm:mb-4">
                  <div
                    className="bg-purple-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                    style={{ width: `${complianceData.percentage}%` }}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-gray-600">
                    Current 5-year cycle: {complianceData.cycleStart} - {complianceData.cycleEnd}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {complianceData.hoursRemaining} hours remaining
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <StatBox
                  icon={<FileText size={20} />}
                  iconColor="text-purple-600"
                  bgColor="bg-purple-50"
                  label="Total Records"
                  value={complianceData.totalRecords}
                />
                <StatBox
                  icon={<CheckCircle size={20} />}
                  iconColor="text-green-600"
                  bgColor="bg-green-50"
                  label="Verified"
                  value={complianceData.verified}
                />
                <StatBox
                  icon={<FileText size={20} />}
                  iconColor="text-blue-600"
                  bgColor="bg-blue-50"
                  label="Self-Declared"
                  value={complianceData.selfDeclared}
                />
                <StatBox
                  icon={<CheckCircle size={20} />}
                  iconColor="text-purple-600"
                  bgColor="bg-purple-50"
                  label="With Evidence"
                  value={`${complianceData.evidencePercentage}%`}
                />
              </div>

              {/* CPD Hours by Category */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">CPD Hours by Category</h4>
                <div className="space-y-3 sm:space-y-4">
                  {categoryHours.map((category, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span className="text-xs sm:text-sm text-gray-700">{category.name}</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-900">
                          {category.hours} hours <span className="text-gray-500">{category.percentage}%</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                        <div
                          className="bg-purple-600 h-1.5 sm:h-2 rounded-full"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mandatory Training Status */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-semibold text-purple-700 mb-3 sm:mb-4">Mandatory Training Status</h3>
              <div className="space-y-2 sm:space-y-3">
                {mandatoryTraining.map((training, index) => (
                  <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <AlertCircle size={16} className="text-gray-400 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900 text-xs sm:text-sm">{training.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{training.date}</div>
                      </div>
                    </div>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${training.statusColor} flex-shrink-0`}>
                      {training.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* GDC Audit Readiness */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-200">
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <CheckCircle className="text-green-600" size={20} />
                <h3 className="text-base sm:text-lg font-semibold text-green-900">GDC Audit Readiness</h3>
              </div>
              <p className="text-xs sm:text-sm text-green-700 mb-3 sm:mb-4 font-medium">
                Your records meet GDC requirements for audit
              </p>
              <ul className="space-y-1.5 sm:space-y-2">
                {auditReadiness.map((item, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-green-800">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column - Export Options */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-semibold text-purple-700 mb-2">Export Options</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Configure your audit report</p>
              <div className="mb-4">
                <label className="mb-2 block text-xs sm:text-sm font-medium text-gray-700">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm"
                >
                  <option value="dentist">dentist</option>
                  <option value="dental_nurse">dental_nurse</option>
                  <option value="dental_care_professional">dental_care_professional</option>
                </select>
              </div>

              {/* Report Format */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Report Format</label>
                <div className="space-y-2 sm:space-y-3">
                  <RadioOption
                    id="comprehensive"
                    name="reportFormat"
                    value="comprehensive"
                    checked={reportFormat === 'comprehensive'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportFormat(e.target.value)}
                    icon={<FileText size={18} />}
                    label="Comprehensive PDF"
                    description="Full audit report with all records, reflections, and evidence"
                  />
                  <RadioOption
                    id="summary"
                    name="reportFormat"
                    value="summary"
                    checked={reportFormat === 'summary'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportFormat(e.target.value)}
                    icon={<FileText size={18} />}
                    label="Summary PDF"
                    description="Concise overview of CPD hours and compliance"
                  />
                  <RadioOption
                    id="spreadsheet"
                    name="reportFormat"
                    value="spreadsheet"
                    checked={reportFormat === 'spreadsheet'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportFormat(e.target.value)}
                    icon={<FileText size={18} />}
                    label="Excel Spreadsheet"
                    description="Detailed data table for analysis"
                  />
                  <RadioOption
                    id="evidence"
                    name="reportFormat"
                    value="evidence"
                    checked={reportFormat === 'evidence'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportFormat(e.target.value)}
                    icon={<FileText size={18} />}
                    label="Evidence Pack (ZIP)"
                    description="All certificates and evidence files bundled"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs sm:text-sm text-left hover:bg-gray-50 transition-colors">
                      <span className="flex items-center justify-between">
                        <span>{dateRange}</span>
                        <div className="ml-2 h-4 w-4 text-gray-400">▼</div>
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full min-w-[200px]">
                    <DropdownMenuItem 
                      onClick={() => setDateRange('Full 5-Year Cycle')}
                      className={dateRange === 'Full 5-Year Cycle' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      Full 5-Year Cycle
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDateRange('Last Year')}
                      className={dateRange === 'Last Year' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      Last Year
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDateRange('Custom Range')}
                      className={dateRange === 'Custom Range' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      Custom Range
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Include in Report */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Include in Report</label>
                <div className="space-y-2">
                  <CheckboxOption
                    id="certificates"
                    label="Certificates"
                    checked={includeOptions.certificates}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setIncludeOptions({ ...includeOptions, certificates: e.target.checked })
                    }
                  />
                  <CheckboxOption
                    id="evidence"
                    label="Supporting Evidence"
                    checked={includeOptions.evidence}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setIncludeOptions({ ...includeOptions, evidence: e.target.checked })
                    }
                  />
                  <CheckboxOption
                    id="reflections"
                    label="Reflections"
                    checked={includeOptions.reflections}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setIncludeOptions({ ...includeOptions, reflections: e.target.checked })
                    }
                  />
                  <CheckboxOption
                    id="outcomes"
                    label="Learning Outcomes"
                    checked={includeOptions.outcomes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setIncludeOptions({ ...includeOptions, outcomes: e.target.checked })
                    }
                  />
                  <CheckboxOption
                    id="verification"
                    label="Platform Verification Statement"
                    checked={includeOptions.verification}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setIncludeOptions({ ...includeOptions, verification: e.target.checked })
                    }
                  />
                </div>
              </div>

              {/* Generate Button */}
              <button 
                onClick={handleGenerateReport}
                disabled={isGenerating || isLoading}
                className="w-full py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors text-sm sm:text-base max-w-xs mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{isGenerating ? "Generating..." : "Generate Report"}</span>
              </button>
            </div>

            {/* About GDC Audits */}
            <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
              <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2 sm:mb-3">About GDC Audits</h3>
              <p className="text-xs sm:text-sm text-blue-800 mb-3 sm:mb-4">
                The GDC may audit your CPD records at any time. This report provides all documentation
                required for a successful audit.
              </p>
              <p className="text-xs sm:text-sm text-blue-800 mb-3 sm:mb-4">
                We recommend downloading and saving your audit report regularly, especially before
                submitting your annual declaration.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      </main>
      
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

function StatBox({
  icon,
  iconColor,
  bgColor,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="text-center">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColor} rounded-lg flex items-center justify-center mx-auto mb-2`}>
        <div className={`${iconColor} w-4 h-4 sm:w-5 sm:h-5`}>{icon}</div>
      </div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-lg sm:text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function RadioOption({
  id,
  name,
  value,
  checked,
  onChange,
  icon,
  label,
  description,
}: {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
        checked ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
      }`}
    >
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 text-purple-600 focus:ring-purple-500 w-4 h-4"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <div className={`${checked ? 'text-purple-600' : 'text-gray-600'} w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0`}>{icon}</div>
          <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{label}</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
      </div>
    </label>
  );
}

function CheckboxOption({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 flex-shrink-0"
      />
      <span className="text-xs sm:text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  );
}