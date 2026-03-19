"use client"

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Download,
  Award,
  Loader2,
  Calendar,
  Hash,
  BookOpen
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { certificatesService } from "@/lib/api/certificates";

type CertificateDetails = {
  certificate_id: string;
  certificate_title: string;
  certificate_content: string;
  certificate_excerpt: string;
  certificate_options: {
    pdf_page_format: string;
    pdf_page_orientation: string;
  };
  certificate_url: string;
  download_url: string;
  is_completed: boolean;
  completion_date: string | null;
  course_title: string;
  user_name: string;
};

export default function CertificateViewPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [certificateDetails, setCertificateDetails] = useState<CertificateDetails | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    let alive = true;

    const run = async () => {
      setIsLoading(true);
      setError("");
      try {
        const certResponse = await certificatesService.getCourseCertificate(courseId);
        if (!alive) return;

        const certRoot = (certResponse && typeof certResponse === "object" ? certResponse : {}) as Record<string, unknown>;
        const certData = (certRoot.data && typeof certRoot.data === "object" ? certRoot.data : certRoot) as Record<string, unknown>;

        const certificateUrl = typeof certData.certificate_url === "string"
          ? certData.certificate_url
          : typeof certData.certificateUrl === "string"
            ? certData.certificateUrl
            : null;

        if (!certificateUrl && !certData.certificate_id) {
          const errorMsg = typeof certRoot.message === "string" ? certRoot.message : "";
          if (errorMsg.includes("not completed")) {
            setError("Certificate is not available yet. Please complete the course first.");
          } else {
            setError("Certificate is not available yet. The backend may still be processing your completion.");
          }
          return;
        }

        const details: CertificateDetails = {
          certificate_id: typeof certData.certificate_id === "string" || typeof certData.certificate_id === "number"
            ? String(certData.certificate_id) : "",
          certificate_title: typeof certData.certificate_title === "string" ? certData.certificate_title : "",
          certificate_content: typeof certData.certificate_content === "string" ? certData.certificate_content : "",
          certificate_excerpt: typeof certData.certificate_excerpt === "string" ? certData.certificate_excerpt : "",
          certificate_options: (certData.certificate_options && typeof certData.certificate_options === "object")
            ? {
                pdf_page_format: typeof (certData.certificate_options as Record<string, unknown>).pdf_page_format === "string"
                  ? (certData.certificate_options as Record<string, unknown>).pdf_page_format as string
                  : "LETTER",
                pdf_page_orientation: typeof (certData.certificate_options as Record<string, unknown>).pdf_page_orientation === "string"
                  ? (certData.certificate_options as Record<string, unknown>).pdf_page_orientation as string
                  : "L",
              }
            : { pdf_page_format: "LETTER", pdf_page_orientation: "L" },
          certificate_url: certificateUrl || "",
          download_url: typeof certData.download_url === "string" ? certData.download_url : (certificateUrl || ""),
          is_completed: typeof certData.is_completed === "boolean" ? certData.is_completed : true,
          completion_date: typeof certData.completion_date === "string" ? certData.completion_date : null,
          course_title: typeof certData.course_title === "string" ? certData.course_title : "",
          user_name: typeof certData.user_name === "string" ? certData.user_name : "",
        };

        setCertificateDetails(details);
      } catch (err: unknown) {
        if (!alive) return;
        const errorMsg = err instanceof Error ? err.message : "";
        if (errorMsg.includes("not completed")) {
          setError("Certificate is not available yet. Please complete the course first.");
        } else {
          setError("Unable to fetch certificate. Please try again later.");
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void run();
    return () => { alive = false; };
  }, [courseId]);

  const handleShare = async () => {
    const shareUrl = certificateDetails?.certificate_url || window.location.href;
    const title = `Certificate - ${certificateDetails?.course_title || certificateDetails?.certificate_title || "Course"}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Certificate link copied to clipboard!');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        alert('Unable to share. Link copied to clipboard instead.');
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!certificateDetails) return;
    setIsDownloading(true);

    const certDetails = certificateDetails;

    try {
      const isLandscape = certDetails.certificate_options.pdf_page_orientation === "L";
      const isA4 = certDetails.certificate_options.pdf_page_format === "A4";

      const pdfWidthMM = isA4 ? (isLandscape ? 297 : 210) : (isLandscape ? 279.4 : 215.9);
      const pdfHeightMM = isA4 ? (isLandscape ? 210 : 297) : (isLandscape ? 215.9 : 279.4);

      const mmToPx = 96 / 25.4;
      const htmlWidthPx = Math.round(pdfWidthMM * mmToPx);
      const htmlHeightPx = Math.round(pdfHeightMM * mmToPx);

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-10000px";
      container.style.top = "-10000px";
      container.style.width = `${htmlWidthPx}px`;
      container.style.height = `${htmlHeightPx}px`;
      container.style.backgroundColor = "#f3f4f6";
      container.style.padding = "0";
      container.style.zIndex = "-9999";
      container.style.overflow = "hidden";

      const baseFontSize = htmlWidthPx * 0.022;
      const iconSize = Math.round(htmlWidthPx * 0.053);
      const titleFontSize = Math.round(baseFontSize * 1.27);
      const nameFontSize = Math.round(baseFontSize * 1.82);
      const courseFontSize = Math.round(baseFontSize * 1.27);
      const bodyFontSize = Math.round(baseFontSize * 0.73);
      const smallFontSize = Math.round(baseFontSize * 0.45);
      const padding = Math.round(htmlWidthPx * 0.027);
      const borderWidth = Math.round(htmlWidthPx * 0.0033);
      const sealSize = Math.round(htmlWidthPx * 0.08);

      container.innerHTML = `
        <div style="width: ${htmlWidthPx}px; height: ${htmlHeightPx}px; margin: 0; background: white; border: ${borderWidth}px solid #8b5cf6; position: relative; display: flex; flex-direction: column; padding: ${padding}px;">
          <!-- Header Section -->
          <div style="text-align: center; margin-bottom: ${Math.round(htmlHeightPx * 0.015)}px;">
            <div style="margin-bottom: ${Math.round(htmlHeightPx * 0.008)}px;">
              <svg style="width: ${iconSize}px; height: ${iconSize}px; color: #8b5cf6; margin: 0 auto; display: block;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
              </svg>
            </div>
            <h1 style="font-size: ${titleFontSize}px; font-weight: bold; color: #8b5cf6; margin: 0 0 ${Math.round(htmlHeightPx * 0.006)}px 0; letter-spacing: ${Math.round(htmlWidthPx * 0.0017)}px; line-height: 1.3; padding-bottom: ${Math.round(htmlHeightPx * 0.006)}px; border-bottom: ${Math.round(htmlHeightPx * 0.0014)}px solid #8b5cf6; display: inline-block; white-space: nowrap;">
              CERTIFICATE OF COMPLETION
            </h1>
          </div>

          <!-- Main Content -->
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; text-align: center; padding: ${Math.round(htmlHeightPx * 0.02)}px 0;">
            <p style="font-size: ${bodyFontSize}px; color: #374151; font-style: italic; margin: 0 0 ${Math.round(htmlHeightPx * 0.015)}px 0;">
              This is to certify that
            </p>

            <div style="margin: ${Math.round(htmlHeightPx * 0.015)}px 0; text-align: center;">
              <h2 style="font-size: ${nameFontSize}px; font-weight: bold; color: #111827; margin: 0 auto; line-height: 1.3; padding-bottom: ${Math.round(htmlHeightPx * 0.005)}px; border-bottom: ${Math.round(htmlHeightPx * 0.0014)}px solid #8b5cf6; display: inline-block; max-width: ${Math.round(htmlWidthPx * 0.85)}px; word-break: keep-all;">
                ${certDetails.user_name || "Student Name"}
              </h2>
            </div>

            <p style="font-size: ${bodyFontSize}px; color: #374151; margin: ${Math.round(htmlHeightPx * 0.015)}px 0; padding: 0 ${Math.round(htmlWidthPx * 0.013)}px;">
              has successfully completed the course
            </p>

            <div style="margin: ${Math.round(htmlHeightPx * 0.015)}px 0; padding: 0 ${Math.round(htmlWidthPx * 0.013)}px;">
              <h3 style="font-size: ${courseFontSize}px; font-weight: bold; color: #8b5cf6; margin: 0; line-height: 1.2; word-wrap: break-word;">
                ${certDetails.course_title || certDetails.certificate_title}
              </h3>
            </div>

            ${certDetails.certificate_content ? `
              <div style="margin: ${Math.round(htmlHeightPx * 0.02)}px ${Math.round(htmlWidthPx * 0.013)}px; padding: ${Math.round(htmlHeightPx * 0.01)}px ${Math.round(htmlWidthPx * 0.017)}px; background: #fef3c7; border-left: ${Math.round(htmlWidthPx * 0.0033)}px solid #f59e0b;">
                <p style="font-size: ${Math.round(bodyFontSize * 0.875)}px; color: #374151; font-style: italic; white-space: pre-wrap; margin: 0; line-height: 1.6; word-wrap: break-word;">
                  "${certDetails.certificate_content}"
                </p>
              </div>
            ` : ''}
          </div>

          <!-- Footer Section -->
          <div style="margin-top: auto; padding-top: ${Math.round(htmlHeightPx * 0.015)}px; border-top: ${Math.round(htmlHeightPx * 0.0014)}px solid #d1d5db;">
            <!-- Certificate Details -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: ${Math.round(htmlWidthPx * 0.013)}px; margin-bottom: ${Math.round(htmlHeightPx * 0.015)}px; font-size: ${smallFontSize}px;">
              <div style="text-align: center;">
                <p style="color: #6b7280; text-transform: uppercase; letter-spacing: ${Math.round(htmlWidthPx * 0.0008)}px; margin: 0 0 ${Math.round(htmlHeightPx * 0.003)}px 0; font-size: ${Math.round(smallFontSize * 0.83)}px;">Certificate ID</p>
                <p style="font-weight: bold; color: #111827; margin: 0;">#${certDetails.certificate_id || "N/A"}</p>
              </div>
              ${certDetails.completion_date ? `
                <div style="text-align: center;">
                  <p style="color: #6b7280; text-transform: uppercase; letter-spacing: ${Math.round(htmlWidthPx * 0.0008)}px; margin: 0 0 ${Math.round(htmlHeightPx * 0.003)}px 0; font-size: ${Math.round(smallFontSize * 0.83)}px;">Date</p>
                  <p style="font-weight: bold; color: #111827; margin: 0;">
                    ${new Date(certDetails.completion_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              ` : ''}
            </div>

            <!-- Seal -->
            <div style="text-align: center; margin-top: ${Math.round(htmlHeightPx * 0.015)}px;">
              <div style="margin: 0 auto ${Math.round(htmlHeightPx * 0.005)}px; width: ${sealSize}px; height: ${sealSize}px; background: linear-gradient(to bottom right, #8b5cf6, #a855f7); border-radius: 50%; border: ${Math.round(htmlWidthPx * 0.0033)}px solid #c084fc; box-shadow: 0 ${Math.round(htmlHeightPx * 0.006)}px ${Math.round(htmlHeightPx * 0.011)}px rgba(139, 92, 246, 0.3); display: flex; align-items: center; justify-content: center;">
                <svg style="width: ${Math.round(htmlWidthPx * 0.04)}px; height: ${Math.round(htmlWidthPx * 0.04)}px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                </svg>
              </div>
              <p style="font-size: ${Math.round(bodyFontSize * 0.875)}px; font-weight: bold; color: #8b5cf6; margin: 0 0 ${Math.round(htmlHeightPx * 0.003)}px 0;">ENAMEL ACADEMY</p>
              <p style="font-size: ${Math.round(smallFontSize * 0.83)}px; color: #6b7280; margin: 0;">
                ${certDetails.completion_date ? new Date(certDetails.completion_date).getFullYear() : new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#f3f4f6",
        width: htmlWidthPx,
        height: htmlHeightPx,
        windowWidth: htmlWidthPx,
        windowHeight: htmlHeightPx,
      });

      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: isA4 ? "a4" : "letter",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL("image/png", 1.0);
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const certTitle = certDetails.certificate_title || certDetails.course_title || "Certificate";
      const fileName = `Certificate-${certTitle.replace(/\s+/g, "-")}.pdf`;
      pdf.save(fileName);

      document.body.removeChild(container);
    } catch (error) {
      console.error("Error downloading certificate as PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#8b5cf6] text-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base sm:text-lg font-bold truncate">
              {certificateDetails?.course_title || certificateDetails?.certificate_title || "Certificate"}
            </h1>
          </div>
          {certificateDetails && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => router.push('/courses')}
                className="px-3 py-1.5 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <BookOpen size={14} />
                <span className="hidden sm:inline">Browse Courses</span>
                <span className="sm:hidden">Courses</span>
              </button>
              <button
                onClick={handleShare}
                className="px-3 py-1.5 border border-white/80 text-white rounded-lg font-medium hover:bg-white hover:text-purple-600 transition flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <Share2 size={14} />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="px-3 py-1.5 border border-white/80 text-white rounded-lg font-medium hover:bg-white hover:text-purple-600 transition flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <Download size={14} />
                <span className="hidden sm:inline">{isDownloading ? "Generating..." : "Download PDF"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 md:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
              <p className="text-sm text-gray-600">Loading certificate...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center max-w-md">
              <p className="text-amber-800 text-sm sm:text-base">{error}</p>
              <button
                onClick={() => router.back()}
                className="mt-4 px-4 py-2 bg-[#8b5cf6] text-white rounded-lg text-sm hover:bg-purple-700 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : certificateDetails ? (
          <div className="w-full max-w-4xl mx-auto px-1 sm:px-2 md:px-4 pb-4 sm:pb-8">
            {/* Professional Certificate Container */}
            <div className="relative bg-white shadow-2xl border-2 sm:border-4 border-[#8b5cf6] min-h-[500px] sm:min-h-[700px] md:min-h-[800px] w-full">
              {/* Certificate Content */}
              <div className="relative min-h-full flex flex-col p-2 sm:p-3 md:p-4 lg:p-6 xl:p-8">
                {/* Header Section */}
                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                  <div className="mb-3 sm:mb-4">
                    <Award className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 mx-auto text-[#8b5cf6]" />
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#8b5cf6] mb-2 tracking-wide">
                    CERTIFICATE OF COMPLETION
                  </h1>
                  <div className="w-20 sm:w-32 md:w-40 h-0.5 bg-[#8b5cf6] mx-auto"></div>
                </div>

                {/* Main Content - All from API */}
                <div className="flex-1 flex flex-col justify-center text-center space-y-3 sm:space-y-4 md:space-y-6">
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 italic">
                    This is to certify that
                  </p>

                  <div className="py-2 sm:py-4">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 break-words">
                      {certificateDetails.user_name || "Student Name"}
                    </h2>
                    <div className="w-24 sm:w-32 md:w-48 h-0.5 bg-[#8b5cf6] mx-auto mt-2"></div>
                  </div>

                  <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 px-2">
                    has successfully completed the course
                  </p>

                  <div className="py-2 sm:py-3 md:py-4 px-2">
                    <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#8b5cf6] break-words">
                      {certificateDetails.course_title || certificateDetails.certificate_title}
                    </h3>
                  </div>

                  {certificateDetails.certificate_content && (
                    <div className="mt-2 sm:mt-4 p-3 sm:p-4 md:p-6 bg-amber-50 border-l-4 border-amber-400 mx-2 sm:mx-4">
                      <p className="text-xs sm:text-sm md:text-base text-gray-700 italic whitespace-pre-wrap break-words">
                        &ldquo;{certificateDetails.certificate_content}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Section - All from API */}
                <div className="mt-4 sm:mt-6 md:mt-8 pt-4 sm:pt-6 border-t-2 border-gray-300">
                  {/* Certificate Details Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 text-xs sm:text-sm">
                    <div className="text-center sm:text-left">
                      <p className="text-gray-500 uppercase tracking-wide mb-1 flex items-center justify-center sm:justify-start gap-1">
                        <Hash size={12} /> Certificate ID
                      </p>
                      <p className="font-bold text-gray-900">#{certificateDetails.certificate_id || "N/A"}</p>
                    </div>
                    {certificateDetails.completion_date && (
                      <div className="text-center sm:text-right">
                        <p className="text-gray-500 uppercase tracking-wide mb-1 flex items-center justify-center sm:justify-end gap-1">
                          <Calendar size={12} /> Date
                        </p>
                        <p className="font-bold text-gray-900">
                          {new Date(certificateDetails.completion_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Enamel Academy Seal */}
                  <div className="text-center mt-4 sm:mt-6">
                    <div className="mb-2 sm:mb-3">
                      <div className="mx-auto w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] rounded-full flex items-center justify-center border-4 border-purple-300 shadow-lg">
                        <Award className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-white" />
                      </div>
                    </div>
                    <div className="w-24 sm:w-32 h-0.5 bg-gray-400 mx-auto mb-2"></div>
                    <p className="text-xs sm:text-sm md:text-base font-bold text-[#8b5cf6]">ENAMEL ACADEMY</p>
                    <p className="text-xs text-gray-500">
                      {certificateDetails.completion_date
                        ? new Date(certificateDetails.completion_date).getFullYear()
                        : new Date().getFullYear()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
