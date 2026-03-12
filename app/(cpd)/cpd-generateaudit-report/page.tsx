'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, CheckCircle, Download, AlertCircle } from 'lucide-react';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cpdService } from "@/lib/api/cpd";
import { rolesService, type DentalRole } from "@/lib/api/roles";
import { userService } from "@/lib/api/user";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function GenerateAuditReport() {
  const router = useRouter();
  const [reportFormat, setReportFormat] = useState('comprehensive');
  const [dateRange, setDateRange] = useState<'full_cycle' | 'last_year' | 'custom'>('full_cycle');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
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
  const [selectedRole, setSelectedRole] = useState("");
  const [roleOptions, setRoleOptions] = useState<DentalRole[]>([]);
  const [dateRangeLabels, setDateRangeLabels] = useState({
    fullCycle: "Full 5-Year Cycle",
    lastYear: "Last Year",
    custom: "Custom Range",
  });
  const [complianceData, setComplianceData] = useState<{
    hoursCompleted: number;
    totalHours: number;
    percentage: number;
    cycleStart: string;
    cycleEnd: string;
    hoursRemaining: number;
    totalRecords: number;
    verified: number;
    selfDeclared: number;
    evidencePercentage: number;
  } | null>(null);
  const [categoryHours, setCategoryHours] = useState<Array<{ name: string; hours: number; percentage: number }>>([]);
  const [mandatoryTraining, setMandatoryTraining] = useState<Array<{ name: string; status: string; date: string; statusColor: string }>>([]);

  const auditReadiness = useMemo(() => {
    if (!complianceData) return [];
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
        const userRaw = await userService.me().catch(() => null);
        const userRole = (userRaw?.role as string | undefined) || "";
        if (!alive) return;
        if (userRole && !selectedRole) setSelectedRole(userRole);
        const roleForReq = userRole || selectedRole || "dentist";
        const [summaryRaw, analyticsRaw, requirementsRaw, rolesRaw] = await Promise.all([
          cpdService.summary(),
          cpdService.analytics(),
          cpdService.requirements(roleForReq),
          rolesService.roles(),
        ]);
        if (!alive) return;

        const summaryRoot = (summaryRaw && typeof summaryRaw === "object" ? summaryRaw : {}) as Record<string, unknown>;
        const summaryData = (summaryRoot.data && typeof summaryRoot.data === "object" ? summaryRoot.data : summaryRoot) as Record<string, unknown>;
        const analyticsRoot = (analyticsRaw && typeof analyticsRaw === "object" ? analyticsRaw : {}) as Record<string, unknown>;
        const analyticsData = (analyticsRoot.data && typeof analyticsRoot.data === "object" ? analyticsRoot.data : analyticsRoot) as Record<string, unknown>;
        const requirementsRoot = (requirementsRaw && typeof requirementsRaw === "object" ? requirementsRaw : {}) as Record<string, unknown>;
        const requirementsData = (requirementsRoot.data && typeof requirementsRoot.data === "object" ? requirementsRoot.data : requirementsRoot) as Record<string, unknown>;
        const summaryBlock = (summaryData.summary && typeof summaryData.summary === "object"
          ? summaryData.summary
          : {}) as Record<string, unknown>;
        const cycleBlock = (summaryData.cycle && typeof summaryData.cycle === "object"
          ? summaryData.cycle
          : {}) as Record<string, unknown>;
        const reqBlock = (summaryData.requirements && typeof summaryData.requirements === "object"
          ? summaryData.requirements
          : {}) as Record<string, unknown>;
        const parsedRoles = Array.isArray(rolesRaw) ? rolesRaw : [];
        setRoleOptions(parsedRoles.filter((r) => r?.name));

        const cycleStart = getText(summaryData.cycle_start ?? cycleBlock.start_date_formatted ?? cycleBlock.start_date, 'N/A');
        const cycleEnd = getText(summaryData.cycle_end ?? cycleBlock.end_date_formatted ?? cycleBlock.end_date, 'N/A');
        setDateRangeLabels({
          fullCycle: cycleStart !== "N/A" && cycleEnd !== "N/A" ? `Full Cycle (${cycleStart} - ${cycleEnd})` : "Full 5-Year Cycle",
          lastYear: "Last Year",
          custom: "Custom Range",
        });

        const hoursCompleted = getNum(summaryData.hours_completed ?? summaryData.completed_hours ?? summaryBlock.total_completed, 0);
        const totalHours = getNum(summaryData.total_required_hours ?? summaryData.total_hours ?? reqBlock.total_hours ?? summaryBlock.target_hours, 0);
        const percentage = totalHours > 0 ? Math.round((hoursCompleted / totalHours) * 100) : 0;
        const totalRecords = getNum(summaryData.total_records ?? summaryData.activities_count ?? summaryBlock.total_courses, 0);
        const verified = getNum(summaryData.verified_records ?? summaryData.verified_count ?? summaryData.verified_hours, 0);
        const evidencePercentage = getNum(summaryData.evidence_coverage ?? summaryData.evidence_percentage ?? summaryBlock.evidence_percentage, 0);
        setComplianceData({
          hoursCompleted,
          totalHours,
          percentage,
          cycleStart,
          cycleEnd,
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
          const name = getText(row.name ?? row.category, "");
          const hours = getNum(row.hours, 0);
          // Only include categories with a name and hours > 0
          if (!name || hours === 0) return null;
          return {
            name,
            hours,
            percentage: getNum(row.percentage, 0),
          };
        }).filter((cat): cat is { name: string; hours: number; percentage: number } => cat !== null);
        setCategoryHours(categoryRows);

        const requirements = Array.isArray(requirementsData.mandatory_training)
          ? requirementsData.mandatory_training
          : Array.isArray(requirementsData.requirements)
            ? requirementsData.requirements
            : [];
        const mappedReq = (requirements as unknown[]).map((item) => {
          const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          const name = getText(row.name ?? row.title, "");
          const status = getText(row.status, "");
          const date = getText(row.date ?? row.expiry_date, "");
          // Only include training items with a name
          if (!name) return null;
          const statusColor = status.toLowerCase().includes("valid")
            ? "text-green-600 bg-green-100"
            : status.toLowerCase().includes("expir")
              ? "text-amber-600 bg-amber-100"
              : "text-red-600 bg-red-100";
          return {
            name,
            status: status || "Unknown",
            date: date || "N/A",
            statusColor,
          };
        }).filter((training): training is { name: string; status: string; date: string; statusColor: string } => training !== null);
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

  const generateReportHTML = (): string => {
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const dateRangeText = dateRange === 'full_cycle' 
      ? `${complianceData.cycleStart} - ${complianceData.cycleEnd}`
      : dateRange === 'last_year'
        ? `Last Year (${new Date().getFullYear() - 1})`
        : `${customStartDate || 'N/A'} - ${customEndDate || 'N/A'}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>CPD Audit Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Arial', sans-serif;
            color: #1a1a1a;
            line-height: 1.6;
            padding: 40px;
            background: white;
          }
          .header {
            border-bottom: 3px solid #8b5cf6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #8b5cf6;
            font-size: 32px;
            margin-bottom: 10px;
          }
          .header p {
            color: #6b7280;
            font-size: 14px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-title {
            color: #8b5cf6;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .stat-box {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e5e7eb;
          }
          .stat-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #1a1a1a;
          }
          .progress-bar {
            width: 100%;
            height: 30px;
            background: #e5e7eb;
            border-radius: 15px;
            overflow: hidden;
            margin: 15px 0;
          }
          .progress-fill {
            height: 100%;
            background: #8b5cf6;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          }
          .category-item {
            margin-bottom: 15px;
            padding: 10px;
            background: #f9fafb;
            border-radius: 6px;
          }
          .category-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .category-name {
            font-weight: bold;
            color: #1a1a1a;
          }
          .category-hours {
            color: #6b7280;
            font-size: 14px;
          }
          .training-item {
            padding: 12px;
            background: #f9fafb;
            border-left: 4px solid #8b5cf6;
            margin-bottom: 10px;
            border-radius: 4px;
          }
          .training-name {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .training-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          th {
            background: #f9fafb;
            font-weight: bold;
            color: #1a1a1a;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CPD Audit Report</h1>
          <p>Generated on ${currentDate} | Date Range: ${dateRangeText}</p>
        </div>

        <div class="section">
          <div class="section-title">Compliance Summary</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Hours Completed</div>
              <div class="stat-value">${complianceData.hoursCompleted}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Required</div>
              <div class="stat-value">${complianceData.totalHours}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Hours Remaining</div>
              <div class="stat-value">${complianceData.hoursRemaining}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Completion</div>
              <div class="stat-value">${complianceData.percentage}%</div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${complianceData.percentage}%">
              ${complianceData.percentage}%
            </div>
          </div>
          <p style="margin-top: 10px; color: #6b7280;">
            Current 5-year cycle: ${complianceData.cycleStart} - ${complianceData.cycleEnd}
          </p>
        </div>

        <div class="section">
          <div class="section-title">Record Statistics</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Total Records</div>
              <div class="stat-value">${complianceData.totalRecords}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Verified</div>
              <div class="stat-value">${complianceData.verified}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Self-Declared</div>
              <div class="stat-value">${complianceData.selfDeclared}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">With Evidence</div>
              <div class="stat-value">${complianceData.evidencePercentage}%</div>
            </div>
          </div>
        </div>

        ${categoryHours.length > 0 ? `
        <div class="section">
          <div class="section-title">CPD Hours by Category</div>
          ${categoryHours.map(cat => `
            <div class="category-item">
              <div class="category-header">
                <span class="category-name">${cat.name}</span>
                <span class="category-hours">${cat.hours} hours (${cat.percentage}%)</span>
              </div>
              <div class="progress-bar" style="height: 20px;">
                <div class="progress-fill" style="width: ${cat.percentage}%; font-size: 12px;">
                  ${cat.percentage}%
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${mandatoryTraining.length > 0 ? `
        <div class="section">
          <div class="section-title">Mandatory Training Status</div>
          ${mandatoryTraining.map(training => `
            <div class="training-item">
              <div class="training-name">${training.name}</div>
              <div style="margin-top: 5px;">
                <span class="training-status" style="background: ${training.statusColor.includes('green') ? '#d1fae5' : training.statusColor.includes('amber') ? '#fef3c7' : '#fee2e2'}; color: ${training.statusColor.includes('green') ? '#065f46' : training.statusColor.includes('amber') ? '#92400e' : '#991b1b'};">
                  ${training.status}
                </span>
                <span style="margin-left: 10px; color: #6b7280; font-size: 12px;">${training.date}</span>
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">GDC Audit Readiness</div>
          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="color: #065f46; font-weight: bold; margin-bottom: 10px;">
              Your records meet GDC requirements for audit
            </p>
            <ul style="list-style: none; padding-left: 0;">
              ${auditReadiness.map(item => `
                <li style="color: #065f46; margin: 5px 0; padding-left: 20px; position: relative;">
                  <span style="position: absolute; left: 0;">✓</span>
                  ${item}
                </li>
              `).join('')}
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>This report was generated by Enamel Academy CPD System</p>
          <p>Report Format: ${reportFormat === 'comprehensive' ? 'Comprehensive PDF' : reportFormat === 'summary' ? 'Summary PDF' : 'Evidence Pack'}</p>
          <p>Includes: ${Object.entries(includeOptions).filter(([_, v]) => v).map(([k]) => k).join(', ')}</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleGenerateReport = async () => {
    setGenerateError("");
    setGenerateSuccess("");
    setIsGenerating(true);

    const formatMap: Record<string, string> = {
      comprehensive: "pdf",
      summary: "summary",
      evidence: "evidence_zip",
    };

    // Calculate last year date range
    const now = new Date();
    const lastYearStart = `${now.getFullYear() - 1}-01-01`;
    const lastYearEnd = `${now.getFullYear() - 1}-12-31`;

    let apiDateRange: string;
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (dateRange === "full_cycle") {
      apiDateRange = "full_cycle";
    } else if (dateRange === "last_year") {
      apiDateRange = "custom";
      startDate = lastYearStart;
      endDate = lastYearEnd;
    } else {
      apiDateRange = "custom";
      startDate = customStartDate || undefined;
      endDate = customEndDate || undefined;
    }

    try {
      // Step 1: Call API to generate report and get download_url
      const response = await cpdService.generateAuditReport({
        format: formatMap[reportFormat] ?? "pdf",
        date_range: apiDateRange,
        start_date: startDate,
        end_date: endDate,
        include_certificates: includeOptions.certificates,
        include_evidence: includeOptions.evidence,
        include_reflections: includeOptions.reflections,
        include_outcomes: includeOptions.outcomes,
        include_verification: includeOptions.verification,
      });

      // Step 2: Extract download_url and format from API response
      const resData = (response && typeof response === "object" ? response : {}) as Record<string, unknown>;
      const dataBlock = (resData.data && typeof resData.data === "object" ? resData.data : resData) as Record<string, unknown>;
      const downloadUrl = dataBlock.download_url as string | undefined;
      const apiFormat = (dataBlock.format as string | undefined) || formatMap[reportFormat] || "pdf";

      if (!downloadUrl) {
        throw new Error("API did not return download_url");
      }

      // Step 3: Handle different formats
      const dateStr = new Date().toISOString().split('T')[0];
      
      // For ZIP format, download via proxy to avoid CORS
      if (apiFormat === "evidence_zip") {
        try {
          // Fetch file via proxy
          const proxyUrl = `/api/audit-report-proxy?url=${encodeURIComponent(downloadUrl)}`;
          const fileResponse = await fetch(proxyUrl);
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file from download_url`);
          }
          const blob = await fileResponse.blob();
          
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `audit-report-evidence-${dateStr}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          setGenerateSuccess("Audit report downloaded successfully.");
        } catch (error) {
          // Fallback: try direct download
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = `audit-report-evidence-${dateStr}.zip`;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setGenerateSuccess("Audit report download initiated.");
        }
        return;
      }

      // For PDF and Summary formats, convert HTML to PDF
      // Step 4: Fetch HTML content from download_url via proxy to avoid CORS
      const proxyUrl = `/api/audit-report-proxy?url=${encodeURIComponent(downloadUrl)}`;
      const htmlResponse = await fetch(proxyUrl);
      if (!htmlResponse.ok) {
        throw new Error(`Failed to fetch HTML from download_url`);
      }
      const htmlContent = await htmlResponse.text();

      // Step 5: Create a temporary container for the HTML
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '210mm'; // A4 width
      container.style.padding = '20mm';
      container.style.backgroundColor = 'white';
      container.style.fontFamily = 'Arial, sans-serif';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Step 6: Wait for content to render and images to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 7: Convert HTML to canvas with better quality
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: container.scrollWidth,
        height: container.scrollHeight,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
        allowTaint: true,
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Step 8: Create PDF from canvas
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Step 9: Generate filename and download PDF
      const filename = `audit-report-${dateStr}.pdf`;

      // Download PDF
      pdf.save(filename);
      
      setGenerateSuccess("Audit report generated and downloaded successfully.");
    } catch (error) {
      console.error('Error generating report:', error);
      setGenerateError(`Failed to generate report: ${error instanceof Error ? error.message : 'Please try again.'}`);
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

              {isLoading || !complianceData ? (
                <>
                  {/* Skeleton for Hours Progress */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex items-end space-x-2 mb-2">
                      <div className="h-10 w-16 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-3 sm:mb-4">
                      <div className="bg-gray-300 h-2 sm:h-3 rounded-full w-0 animate-pulse"></div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>

                  {/* Skeleton for Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-2 animate-pulse"></div>
                        <div className="h-3 w-20 bg-gray-200 rounded mx-auto mb-1 animate-pulse"></div>
                        <div className="h-6 w-12 bg-gray-200 rounded mx-auto animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

              {/* CPD Hours by Category */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">CPD Hours by Category</h4>
                {isLoading ? (
                  <div className="space-y-3 sm:space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div className="bg-gray-300 h-1.5 sm:h-2 rounded-full w-0 animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : categoryHours.length > 0 ? (
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
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500">No category breakdown returned by API.</p>
                )}
              </div>
            </div>

            {/* Mandatory Training Status */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-semibold text-purple-700 mb-3 sm:mb-4">Mandatory Training Status</h3>
              {isLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse"></div>
                        <div>
                          <div className="h-4 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : mandatoryTraining.length > 0 ? (
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
              ) : (
                <p className="text-xs sm:text-sm text-gray-500">No mandatory training records returned by API.</p>
              )}
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
                <Select value={selectedRole} onValueChange={setSelectedRole} disabled={isLoading}>
                  <SelectTrigger className="w-full text-xs sm:text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {roleOptions.map((role) => {
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
                <Select value={dateRange} onValueChange={(value) => setDateRange(value as 'full_cycle' | 'last_year' | 'custom')}>
                  <SelectTrigger className="w-full text-xs sm:text-sm">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="full_cycle">{dateRangeLabels.fullCycle}</SelectItem>
                    <SelectItem value="last_year">{dateRangeLabels.lastYear}</SelectItem>
                    <SelectItem value="custom">{dateRangeLabels.custom}</SelectItem>
                  </SelectContent>
                </Select>
                {dateRange === "custom" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Include in Report */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Include in Report</label>
                <div className="space-y-2">
                  <CheckboxOption
                    id="certificates"
                    label="Certificates"
                    checked={includeOptions.certificates}
                    onCheckedChange={(checked) => setIncludeOptions({ ...includeOptions, certificates: checked })}
                  />
                  <CheckboxOption
                    id="evidence"
                    label="Supporting Evidence"
                    checked={includeOptions.evidence}
                    onCheckedChange={(checked) => setIncludeOptions({ ...includeOptions, evidence: checked })}
                  />
                  <CheckboxOption
                    id="reflections"
                    label="Reflections"
                    checked={includeOptions.reflections}
                    onCheckedChange={(checked) => setIncludeOptions({ ...includeOptions, reflections: checked })}
                  />
                  <CheckboxOption
                    id="outcomes"
                    label="Learning Outcomes"
                    checked={includeOptions.outcomes}
                    onCheckedChange={(checked) => setIncludeOptions({ ...includeOptions, outcomes: checked })}
                  />
                  <CheckboxOption
                    id="verification"
                    label="Platform Verification Statement"
                    checked={includeOptions.verification}
                    onCheckedChange={(checked) => setIncludeOptions({ ...includeOptions, verification: checked })}
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
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(state) => onCheckedChange(state === true)}
        className="h-4 w-4 sm:h-5 sm:w-5 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
      />
      <span className="text-xs sm:text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  );
}