"use client"

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { 
  ArrowLeft, 
  Share2, 
  Download, 
  CheckCircle, 
  Award, 
  Calendar, 
  Clock,
  FileText,
  Lightbulb
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { certificatesService } from "@/lib/api/certificates";
import { coursesService } from "@/lib/api/courses";
import { userService } from "@/lib/api/user";

function CPDCertificateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [certificateData, setCertificateData] = useState({
    recipientName: "Learner",
    gdcRegistration: "N/A",
    courseTitle: "Course",
    completionDateLabel: "N/A",
    cpdHours: 0,
    score: 0,
    hasScore: false,
    provider: "Enamel CPD",
    certificateNumber: "N/A",
    statusText: "Course completed successfully",
    certificateViewUrl: "",   // from API certificate_url
    certificateDownloadUrl: "", // from API download_url
  });

  useEffect(() => {
    let alive = true;
    const courseId = searchParams.get("courseId") || searchParams.get("id") || "";

    const toObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
    const toText = (v: unknown, fallback = "") => (typeof v === "string" && v.trim().length > 0 ? v : fallback);
    const toNum = (v: unknown, fallback = 0) =>
      typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : fallback);
    const pickData = (raw: unknown) => {
      const root = toObj(raw);
      const data = root.data;
      return data && typeof data === "object" ? (data as Record<string, unknown>) : root;
    };
    const parseDateLabel = (value: unknown) => {
      const text = toText(value, "");
      if (!text) return "N/A";
      const date = new Date(text);
      if (Number.isNaN(date.getTime())) return text;
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    };
    const parseName = (user: Record<string, unknown>) => {
      const title = toText(user.title, "");
      const first = toText(user.first_name ?? user.firstName, "");
      const last = toText(user.last_name ?? user.lastName, "");
      const display = toText(user.display_name ?? user.displayName, "");
      const combined = [title, first, last].filter(Boolean).join(" ").trim();
      return combined || display || "Learner";
    };
    const parseGdc = (user: Record<string, unknown>) => {
      const direct = toText(user.gdc_registration ?? user.gdcNumber ?? user.registration_number, "");
      if (direct) return direct;
      const dentalFields = Array.isArray(user.dental_fields) ? user.dental_fields : [];
      for (const field of dentalFields) {
        const obj = toObj(field);
        const key = toText(obj.key ?? obj.name ?? obj.label, "").toLowerCase();
        if (key.includes("gdc") || key.includes("registration")) {
          const value = toText(obj.value ?? obj.field_value, "");
          if (value) return value;
        }
      }
      return "N/A";
    };
    const listFromPayload = (raw: unknown): Record<string, unknown>[] => {
      const data = pickData(raw);
      const rows = Array.isArray(data.certificates)
        ? data.certificates
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.results)
            ? data.results
            : Array.isArray(raw)
              ? raw
              : [];
      return (rows as unknown[]).map((item) => toObj(item));
    };
    const certFromPayload = (raw: unknown): Record<string, unknown> => {
      const data = pickData(raw);
      if (data.certificate && typeof data.certificate === "object") return toObj(data.certificate);
      return data;
    };

    const run = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const [userRaw, myCertsRaw, courseCertRaw, courseRaw] = await Promise.allSettled([
          userService.me(),
          certificatesService.getMyCertificates({ page: 1, perPage: 200 }),
          courseId ? certificatesService.getCourseCertificate(courseId) : Promise.resolve(null),
          courseId ? coursesService.details(courseId) : Promise.resolve(null),
        ]);
        if (!alive) return;

        const userObj = userRaw.status === "fulfilled" ? toObj(userRaw.value) : {};
        const userName = parseName(userObj);
        const gdc = parseGdc(userObj);

        const list = myCertsRaw.status === "fulfilled" ? listFromPayload(myCertsRaw.value) : [];
        const byCourse = list.find((row) => String(row.course_id ?? row.courseId ?? "") === String(courseId));
        const fallbackCert = byCourse ?? list[0] ?? {};
        const courseCert = courseCertRaw.status === "fulfilled" && courseCertRaw.value ? certFromPayload(courseCertRaw.value) : {};
        const cert = Object.keys(courseCert).length ? courseCert : fallbackCert;

        // Extract course details from coursesService.details() for CPD hours etc.
        const courseRawObj = courseRaw.status === "fulfilled" && courseRaw.value ? toObj(courseRaw.value) : {};
        const courseRawData = toObj(courseRawObj.data);
        const courseObj = toObj(courseRawData.course ?? courseRawData);

        // Certificate API response fields (from /certificates/course/{id}):
        // certificate_id, certificate_title, course_title, user_name,
        // certificate_url, download_url, is_completed, completion_date
        const rawId = cert.certificate_id ?? cert.id ?? cert.number;
        const certId = typeof rawId === "string" || typeof rawId === "number" ? String(rawId) : "";
        const rawScore = toNum(cert.score ?? cert.assessment_score, -1);

        // Use user_name from certificate API if available, fall back to user profile
        const certUserName = toText(cert.user_name ?? cert.userName, "");
        const finalUserName = certUserName || userName;

        // Course title: prefer certificate API's course_title, then certificate_title, then course details
        const finalCourseTitle = toText(
          cert.course_title ?? cert.certificate_title ?? cert.title ?? courseObj.title ?? courseRawObj.title,
          "Course"
        );

        // CPD hours: from course details API (cpd_points field) since certificate API doesn't include it
        const finalCpdHours = toNum(
          cert.cpd_hours ?? cert.hours ?? cert.cpdHours ?? courseObj.cpd_points ?? courseObj.cpd_hours,
          0
        );

        // Certificate URLs from API
        const certViewUrl = toText(cert.certificate_url ?? cert.certificateUrl, "");
        const certDownUrl = toText(cert.download_url ?? cert.downloadUrl, "");

        setCertificateData({
          recipientName: finalUserName,
          gdcRegistration: gdc,
          courseTitle: finalCourseTitle,
          completionDateLabel: parseDateLabel(cert.completion_date ?? cert.completed_at ?? cert.date),
          cpdHours: finalCpdHours,
          score: rawScore >= 0 ? rawScore : 0,
          hasScore: rawScore >= 0,
          provider: toText(cert.provider ?? cert.issuer, "Enamel CPD"),
          certificateNumber: toText(cert.certificate_number ?? cert.number, certId ? `ENAMEL-CPD-${certId}` : "N/A"),
          statusText: toText(cert.status_message ?? cert.message, "Course completed successfully"),
          certificateViewUrl: certViewUrl,
          certificateDownloadUrl: certDownUrl,
        });
      } catch {
        if (!alive) return;
        setLoadError("Unable to load certificate details right now.");
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [searchParams]);

  const shareTitle = useMemo(
    () => `CPD Certificate - ${certificateData.courseTitle}`,
    [certificateData.courseTitle]
  );
  const shareText = useMemo(
    () => `I have successfully completed ${certificateData.courseTitle} and earned ${certificateData.cpdHours} CPD hours!`,
    [certificateData.courseTitle, certificateData.cpdHours]
  );

  const handleShare = async () => {
    const shareUrl = certificateData.certificateViewUrl || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Certificate link copied to clipboard!');
      }
    } catch (error) {
      console.log('Share cancelled or failed:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        alert('Unable to share. Link copied to clipboard instead.');
        await navigator.clipboard.writeText(shareUrl);
      }
    }
  };

  const handleDownloadPDF = async () => {
    // If API provides a download URL, use it directly
    if (certificateData.certificateDownloadUrl) {
      window.open(certificateData.certificateDownloadUrl, '_blank');
      return;
    }

    // Fallback: generate PDF locally from the rendered certificate
    if (!certificateRef.current) return;
    
    try {
      setIsDownloading(true);

      const dataUrl = await toPng(certificateRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node: HTMLElement) => !node.classList?.contains('no-print')
      });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = () => res(null); });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / img.width, pdfHeight / img.height);
      const imgW = img.width * ratio;
      const imgH = img.height * ratio;
      const imgX = (pdfWidth - imgW) / 2;
      const imgY = 0;

      pdf.addImage(img, 'PNG', imgX, imgY, imgW, imgH);

      const fileName = `CPD-Certificate-${certificateData.courseTitle}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewCPDRecords = () => {
    router.push('/cpd-activities-log');
  };

  const handleBrowseCourses = () => {
    router.push('/courses');
  };

  const handleUpdatePDP = () => {
    router.push('/pdp');
  };

  const handleGoToCPDDashboard = () => {
    router.push('/cpd');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          .print-break {
            page-break-after: always;
          }
        }
      `}</style>
      {/* Header */}
      <div className="bg-[#8b5cf6] text-white p-4 sm:p-8">
        <button 
          onClick={handleGoToCPDDashboard}
          className="flex items-center gap-2 text-white mb-3 sm:mb-4 hover:text-[#e0e7ff] transition-colors no-print text-sm sm:text-base"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Go to CPD Dashboard</span>
          <span className="sm:hidden">Dashboard</span>
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Your CPD Certificate</h1>
            <p className="text-purple-100 text-sm sm:text-base">{certificateData.statusText}</p>
          </div>
          <div className="flex gap-2 sm:gap-3 no-print">
            <button 
              onClick={handleShare}
              className="px-3 sm:px-4 py-2 border-2 border-white text-white rounded-lg font-medium hover:bg-white hover:text-purple-600 transition flex items-center gap-2 text-xs sm:text-sm"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">Share</span>
              <span className="sm:hidden">Share</span>
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-3 sm:px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition flex items-center gap-2 text-xs sm:text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">{isDownloading ? "Generating PDF..." : "Download PDF"}</span>
              <span className="sm:hidden">{isDownloading ? "Generating..." : "PDF"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {isLoading && (
          <div className="lg:col-span-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            Loading certificate details...
          </div>
        )}
        {loadError && (
          <div className="lg:col-span-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {loadError}
          </div>
        )}
        {/* Certificate Card - Left Side (2/3) */}
        <div className="lg:col-span-2">
          <div ref={certificateRef} className="bg-white rounded-lg shadow-sm p-6 sm:p-12 border border-gray-200">
            {/* Award Icon */}
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="text-purple-600">
                <Award size={48} className="w-8 h-8 sm:w-12 sm:h-12" />
              </div>
            </div>

            {/* Certificate Title */}
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-700 text-center mb-2">
              Certificate of Completion
            </h2>
            <p className="text-center text-gray-600 mb-4 sm:mb-8 text-sm sm:text-base">
              Continuing Professional Development
            </p>

            <div className="border-t border-b border-gray-200 py-4 sm:py-8 mb-4 sm:mb-8">
              {/* Recipient Info */}
              <p className="text-center text-gray-600 mb-2 sm:mb-4 text-sm sm:text-base">This is to certify that</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-1 sm:mb-2">
                {certificateData.recipientName}
              </h3>
              <p className="text-center text-gray-600 mb-3 sm:mb-6 text-sm sm:text-base">GDC Registration: {certificateData.gdcRegistration}</p>

              <p className="text-center text-gray-600 mb-2 sm:mb-4 text-sm sm:text-base">has successfully completed</p>
              
              {/* Course Title */}
              <h4 className="text-xl sm:text-2xl font-bold text-purple-700 text-center mb-2 sm:mb-4">
                {certificateData.courseTitle}
              </h4>

              {/* Date and Hours */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>{certificateData.completionDateLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>{certificateData.cpdHours} CPD Hours</span>
                </div>
              </div>

              {/* Assessment Badge */}
              {certificateData.hasScore && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-center justify-center gap-2 text-green-700">
                  <CheckCircle size={16} />
                  <span className="font-semibold text-sm sm:text-base">Assessment Passed with {certificateData.score}%</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-end text-xs sm:text-sm text-gray-600">
              <div>
                <p className="text-gray-500">Provided by</p>
                <p className="font-semibold text-gray-900">{certificateData.provider}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Certificate Number</p>
                <p className="font-semibold text-gray-900">{certificateData.certificateNumber}</p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                This certificate is awarded in recognition of successful completion of verified CPD activity and meets the requirements of the GDC Enhanced CPD Framework.
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Info Cards */}
        <div className="space-y-4 sm:space-y-6 no-print">
          {/* Course Completed Card */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="text-green-600 mt-1">
                <CheckCircle size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 mb-1 text-sm sm:text-base">Course Completed!</h3>
                <p className="text-xs sm:text-sm text-green-800">
                  Congratulations on completing this course. Your CPD hours have been automatically logged.
                </p>
              </div>
            </div>
          </div>

          {/* Course Summary Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Course Summary</h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-xs sm:text-sm">CPD Hours</span>
                <span className="bg-purple-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                  {certificateData.cpdHours} hours
                </span>
              </div>
              
              {certificateData.hasScore && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs sm:text-sm">Assessment Score</span>
                  <span className="bg-green-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                    {certificateData.score}%
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-xs sm:text-sm">Completion Date</span>
                <span className="text-gray-900 font-medium text-xs sm:text-sm">{certificateData.completionDateLabel}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-xs sm:text-sm">Certificate Number</span>
                <span className="text-gray-900 font-medium text-xs sm:text-sm">{certificateData.certificateNumber}</span>
              </div>
            </div>
          </div>

          {/* CPD Record Updated Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">CPD Record Updated</h3>
            
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <div className="text-green-600 mt-0.5">
                  <CheckCircle size={14} />
                </div>
                <span className="text-gray-700">{certificateData.cpdHours} hours added to your CPD log</span>
              </div>
              
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <div className="text-green-600 mt-0.5">
                  <CheckCircle size={14} />
                </div>
                <span className="text-gray-700">Certificate stored in your evidence vault</span>
              </div>
              
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <div className="text-green-600 mt-0.5">
                  <CheckCircle size={14} />
                </div>
                <span className="text-gray-700">Reflection saved to CPD record</span>
              </div>
              
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <div className="text-green-600 mt-0.5">
                  <CheckCircle size={14} />
                </div>
                <span className="text-gray-700">Learning outcomes documented</span>
              </div>
            </div>

            <button 
              onClick={handleViewCPDRecords}
              className="w-full mt-3 sm:mt-4 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">View CPD Records</span>
              <span className="sm:hidden">Records</span>
            </button>
          </div>

          {/* Next Steps Card */}
          <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Next Steps</h3>
            
            <div className="space-y-2 sm:space-y-3">
              <button 
                onClick={handleBrowseCourses}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center gap-2 text-xs sm:text-sm"
              >
                <Lightbulb size={16} />
                <span className="hidden sm:inline">Browse More Courses</span>
                <span className="sm:hidden">Courses</span>
              </button>
              
              <button 
                onClick={handleUpdatePDP}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center gap-2 text-xs sm:text-sm"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">Update Your PDP</span>
                <span className="sm:hidden">PDP</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CPDCertificate() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl text-center text-sm text-gray-600">Loading certificate...</div>
        </main>
      }
    >
      <CPDCertificateContent />
    </Suspense>
  )
}
