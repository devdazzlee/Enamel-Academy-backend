"use client"

import { useEffect, useMemo, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { CertificateModal } from "@/components/certificate-modal"
import { Search, ChevronDown, Download, Calendar, Clock, Award, Filter, FileText, Eye, ChevronRight, X, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { certificatesService } from "@/lib/api/certificates";
import { userService } from "@/lib/api/user";
import { tokenStorage } from "@/lib/api/token";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

const columnFilters = [
  { label: "Date", active: true },
  { label: "Format", active: true },
  { label: "Status", active: true },
  { label: "Time Taken", active: false },
  { label: "Title", active: false },
  { label: "Type", active: false },
  { label: "Categories", active: false },
]

type CertificateRow = {
  id: string;
  title: string;
  category: string;
  type: string;
  date: string;
  completionDate: string;
  timeTaken: string;
  cpdHours: number;
  status: string;
  format: string;
  certificateUrl: string;
  downloadUrl?: string;
  score: number;
  instructor: string;
  courseId: number | null;
  userId: number | null;
};

export default function CertificatesPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [activeFilters, setActiveFilters] = useState(columnFilters)
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("desc")
  const [certificatesData, setCertificatesData] = useState<CertificateRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRow | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewingCertId, setViewingCertId] = useState<string | null>(null)
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null)
  const [verifyingCertId, setVerifyingCertId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState("")
  const [actionError, setActionError] = useState("")
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [certificateHtml, setCertificateHtml] = useState<string>("")
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false)
  const [htmlModalTitle, setHtmlModalTitle] = useState("")
  const [isLoadingCertHtml, setIsLoadingCertHtml] = useState(false)
  const [certificateDetails, setCertificateDetails] = useState<{
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
  } | null>(null)

  // Fetch current user ID for verification
  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const user = await userService.me()
        if (!alive) return
        // Convert user ID to number if it's a string
        const userId = user.id 
          ? (typeof user.id === 'number' ? user.id : Number(user.id) || null)
          : null
        setCurrentUserId(userId)
      } catch (error) {
        console.error("Failed to fetch user ID:", error)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true

    const getText = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback)
    const getNum = (v: unknown, fallback = 0) =>
      typeof v === "number" ? v : (typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : fallback)
    const toDuration = (minutes: number) => {
      if (minutes <= 0) return "N/A"
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      if (h && m) return `${h}h ${m}m`
      if (h) return `${h}h`
      return `${m}m`
    }

    const run = async () => {
      setIsLoading(true)
      setLoadError("")
      try {
        const raw = await certificatesService.getMyCertificates()
        if (!alive) return
        const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
        const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>
        const list = Array.isArray(data.certificates)
          ? data.certificates
          : Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.results)
              ? data.results
              : Array.isArray(raw)
                ? raw
                : []

        const mapped: CertificateRow[] = (list as unknown[]).map((item, index) => {
          const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
          const cpdHours = getNum(row.cpd_hours ?? row.cpdHours, 0)
          const minutes = getNum(row.time_taken_minutes ?? row.minutes, 0)
          const completionDate = getText(row.completion_date ?? row.completed_at ?? row.date, "")
          
          // Use API field names: course_title, certificate_title, certificate_url, etc.
          const courseTitle = getText(row.course_title ?? row.courseTitle, "")
          const certificateTitle = getText(row.certificate_title ?? row.certificateTitle, "")
          const title = certificateTitle || courseTitle || getText(row.title, "Untitled certificate")
          
          return {
            id: getText(row.id ?? row.certificate_id ?? row.certificateId, `CERT-${index + 1}`),
            title: title,
            category: getText(row.category, "General"),
            type: getText(row.type, "CPD"),
            date: completionDate || new Date().toISOString().slice(0, 10),
            completionDate: completionDate || new Date().toISOString().slice(0, 10),
            timeTaken: getText(row.time_taken, toDuration(minutes)),
            cpdHours,
            status: getText(row.status, "Completed"),
            format: getText(row.format, "Online"),
            certificateUrl: getText(row.certificate_url ?? row.certificateUrl, "#"),
            downloadUrl: getText(row.download_url ?? row.downloadUrl, ""),
            score: getNum(row.score ?? row.assessment_score, 0),
            instructor: getText(row.instructor, "Not specified"),
            courseId: getNum(row.course_id ?? row.courseId ?? row.related_course_id, 0) || null,
            userId: getNum(row.user_id ?? row.userId, 0) || null,
          }
        })
        setCertificatesData(mapped)
      } catch {
        if (!alive) return
        setCertificatesData([])
        setLoadError("Unable to load certificates right now.")
      } finally {
        if (alive) setIsLoading(false)
      }
    }

    void run()
    return () => {
      alive = false
    }
  }, [])

  const categoryOptions = useMemo(
    () => Array.from(new Set(certificatesData.map((cert) => cert.category).filter(Boolean))),
    [certificatesData]
  )

  const toggleFilter = (label: string) => {
    setActiveFilters(prev => 
      prev.map(filter => 
        filter.label === label 
          ? { ...filter, active: !filter.active }
          : filter
      )
    )
  }

  const filteredAndSortedData = certificatesData
    .filter(cert => {
      const matchesSearch = cert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cert.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cert.id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || 
        cert.category.toLowerCase().replace(/\s+/g, '-').includes(selectedCategory.toLowerCase()) ||
        selectedCategory.toLowerCase().includes(cert.category.toLowerCase().replace(/\s+/g, '-'))
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      let compareValue = 0
      switch (sortBy) {
        case "date":
          compareValue = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case "title":
          compareValue = a.title.localeCompare(b.title)
          break
        case "cpdHours":
          compareValue = a.cpdHours - b.cpdHours
          break
        case "score":
          compareValue = a.score - b.score
          break
        case "type":
          compareValue = a.type.localeCompare(b.type)
          break
        case "format":
          compareValue = a.format.localeCompare(b.format)
          break
        case "status":
          compareValue = a.status.localeCompare(b.status)
          break
        case "instructor":
          compareValue = a.instructor.localeCompare(b.instructor)
          break
        default:
          compareValue = 0
      }
      return sortOrder === "asc" ? compareValue : -compareValue
    })

  const totalCpdHours = certificatesData.reduce((sum, cert) => sum + cert.cpdHours, 0)
  const completedCourses = certificatesData.length
  const averageScore = certificatesData.length > 0
    ? Math.round(certificatesData.reduce((sum, cert) => sum + cert.score, 0) / certificatesData.length)
    : 0

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("desc")
    }
  }

  const handleExport = () => {
    try {
      // Prepare data for Excel export
      const exportData = filteredAndSortedData.map(cert => ({
        'Certificate ID': cert.id,
        'Course Title': cert.title,
        'Category': cert.category,
        'Type': cert.type,
        'Date': new Date(cert.date).toLocaleDateString(),
        'Completion Date': new Date(cert.completionDate).toLocaleDateString(),
        'Time Taken': cert.timeTaken,
        'CPD Hours': cert.cpdHours,
        'Status': cert.status,
        'Format': cert.format,
        'Instructor': cert.instructor,
        'Score (%)': cert.score
      }));

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "CPD Certificates");

      // Auto-size columns
      const colWidths = [
        { wch: 15 }, // Certificate ID
        { wch: 35 }, // Course Title
        { wch: 15 }, // Category
        { wch: 15 }, // Type
        { wch: 12 }, // Date
        { wch: 15 }, // Completion Date
        { wch: 12 }, // Time Taken
        { wch: 10 }, // CPD Hours
        { wch: 12 }, // Status
        { wch: 12 }, // Format
        { wch: 20 }, // Instructor
        { wch: 10 }  // Score
      ];
      ws['!cols'] = colWidths;

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      // Create blob and download
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `CPD-Certificates-${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  }

  // Helper to fetch certificate HTML through the proxy
  const fetchCertificateHtml = async (url: string): Promise<string> => {
    const token = tokenStorage.get()
    const proxyUrl = `/api/certificate-proxy?url=${encodeURIComponent(url)}`
    const headers: HeadersInit = {}
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    const res = await fetch(proxyUrl, { headers })
    if (!res.ok) throw new Error("Failed to fetch certificate HTML")
    return res.text()
  }

  const handleViewCertificate = async (certId: string) => {
    setActionMessage("")
    setActionError("")
    setViewingCertId(certId)
    setIsLoadingCertHtml(true)
    const certificate = certificatesData.find(cert => cert.id === certId)
    if (!certificate) {
            setViewingCertId(null)
      setIsLoadingCertHtml(false)
            return
          }

    if (!certificate.courseId) {
      setActionError("Course ID not available.")
            setViewingCertId(null)
      setIsLoadingCertHtml(false)
            return
          }

    try {
      // Fetch certificate details from API endpoint
      const certResponse = await certificatesService.getCourseCertificate(certificate.courseId)
      const certRoot = (certResponse && typeof certResponse === "object" ? certResponse : {}) as Record<string, unknown>
      const certData = (certRoot.data && typeof certRoot.data === "object" ? certRoot.data : certRoot) as Record<string, unknown>
      
      // Get certificate URL from API response
      const certificateUrl = typeof certData.certificate_url === "string" 
        ? certData.certificate_url 
        : typeof certData.certificateUrl === "string"
        ? certData.certificateUrl
        : null

      if (!certificateUrl) {
        setActionError("Certificate URL not available from API.")
        setViewingCertId(null)
        setIsLoadingCertHtml(false)
        return
      }

      // Get certificate title from API response
      const certTitle = typeof certData.certificate_title === "string"
        ? certData.certificate_title
        : typeof certData.certificateTitle === "string"
        ? certData.certificateTitle
        : typeof certData.course_title === "string"
        ? certData.course_title
        : certificate.title

      // Store certificate details from API
      const certDetails = {
        certificate_id: typeof certData.certificate_id === "string" || typeof certData.certificate_id === "number"
          ? String(certData.certificate_id)
          : "",
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
        certificate_url: certificateUrl,
        download_url: typeof certData.download_url === "string" ? certData.download_url : certificateUrl,
        is_completed: typeof certData.is_completed === "boolean" ? certData.is_completed : true,
        completion_date: typeof certData.completion_date === "string" ? certData.completion_date : null,
        course_title: typeof certData.course_title === "string" ? certData.course_title : "",
        user_name: typeof certData.user_name === "string" ? certData.user_name : "",
      }
      
      setCertificateDetails(certDetails)
      setHtmlModalTitle(certTitle)
      setIsHtmlModalOpen(true)
      } catch (error) {
        console.error("Error viewing certificate:", error)
      setActionError("Could not load certificate. Please try again.")
      } finally {
        setViewingCertId(null)
      setIsLoadingCertHtml(false)
    }
  }

  const handleDownloadCertificate = async (certId: string, title: string) => {
    setActionMessage("")
    setActionError("")
    setDownloadingCertId(certId)
    const certificate = certificatesData.find(cert => cert.id === certId)
    if (!certificate) {
      setDownloadingCertId(null)
      return
    }

    if (!certificate.courseId) {
      setActionError("Course ID not available.")
        setDownloadingCertId(null)
        return
      }
      
    try {
      // Fetch certificate details from API endpoint
      const certResponse = await certificatesService.getCourseCertificate(certificate.courseId)
      const certRoot = (certResponse && typeof certResponse === "object" ? certResponse : {}) as Record<string, unknown>
      const certData = (certRoot.data && typeof certRoot.data === "object" ? certRoot.data : certRoot) as Record<string, unknown>
      
      // Get certificate title from API response for filename
      const certTitle = typeof certData.certificate_title === "string"
        ? certData.certificate_title
        : typeof certData.certificateTitle === "string"
        ? certData.certificateTitle
        : typeof certData.course_title === "string"
        ? certData.course_title
        : title

      // Store certificate details (same as view)
      const certDetails = {
        certificate_id: typeof certData.certificate_id === "string" || typeof certData.certificate_id === "number"
          ? String(certData.certificate_id)
          : "",
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
        certificate_url: typeof certData.certificate_url === "string" ? certData.certificate_url : "",
        download_url: typeof certData.download_url === "string" ? certData.download_url : "",
        is_completed: typeof certData.is_completed === "boolean" ? certData.is_completed : true,
        completion_date: typeof certData.completion_date === "string" ? certData.completion_date : null,
        course_title: typeof certData.course_title === "string" ? certData.course_title : "",
        user_name: typeof certData.user_name === "string" ? certData.user_name : "",
      }

      // Determine PDF page dimensions
      const isLandscape = certDetails.certificate_options.pdf_page_orientation === "L"
      const isA4 = certDetails.certificate_options.pdf_page_format === "A4"
      
      // PDF page dimensions in mm
      // Letter: 8.5" x 11" = 215.9mm x 279.4mm
      // A4: 210mm x 297mm
      const pdfWidthMM = isA4 ? (isLandscape ? 297 : 210) : (isLandscape ? 279.4 : 215.9)
      const pdfHeightMM = isA4 ? (isLandscape ? 210 : 297) : (isLandscape ? 215.9 : 279.4)
      
      // Convert mm to pixels at 96 DPI (standard web DPI)
      // 1 inch = 25.4mm, 96 DPI = 96px per inch
      // So: 1mm = 96/25.4 ≈ 3.7795px
      const mmToPx = 96 / 25.4
      const htmlWidthPx = Math.round(pdfWidthMM * mmToPx)
      const htmlHeightPx = Math.round(pdfHeightMM * mmToPx)
      
      // Create a temporary container with proper dimensions matching PDF
      const container = document.createElement("div")
      container.style.position = "fixed"
      container.style.left = "-10000px"
      container.style.top = "-10000px"
      container.style.width = `${htmlWidthPx}px`
      container.style.height = `${htmlHeightPx}px`
      container.style.backgroundColor = "#f3f4f6"
      container.style.padding = "0"
      container.style.zIndex = "-9999"
      container.style.overflow = "hidden"
      
      // Calculate proportional sizes based on page dimensions
      const baseFontSize = htmlWidthPx * 0.022 // ~2.2% of page width
      const iconSize = Math.round(htmlWidthPx * 0.053) // ~5.3% of page width
      const titleFontSize = Math.round(baseFontSize * 1.27)
      const nameFontSize = Math.round(baseFontSize * 1.82)
      const courseFontSize = Math.round(baseFontSize * 1.27)
      const bodyFontSize = Math.round(baseFontSize * 0.73)
      const smallFontSize = Math.round(baseFontSize * 0.45)
      const padding = Math.round(htmlWidthPx * 0.027)
      const borderWidth = Math.round(htmlWidthPx * 0.0033)
      
      // Generate the certificate HTML with proportional dimensions
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

            <!-- Signature Section -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: ${Math.round(htmlWidthPx * 0.027)}px; margin-top: ${Math.round(htmlHeightPx * 0.02)}px;">
              <!-- Signature -->
              <div style="text-align: center;">
                <div style="margin-bottom: ${Math.round(htmlHeightPx * 0.005)}px;">
                  <div style="margin: 0 auto; width: ${Math.round(htmlWidthPx * 0.147)}px; height: ${Math.round(htmlHeightPx * 0.057)}px; background: white; border: ${Math.round(htmlWidthPx * 0.0008)}px solid #e5e7eb; border-radius: ${Math.round(htmlWidthPx * 0.0033)}px; box-shadow: 0 ${Math.round(htmlHeightPx * 0.0007)}px ${Math.round(htmlHeightPx * 0.002)}px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center;">
                    <svg style="width: ${Math.round(htmlWidthPx * 0.133)}px; height: ${Math.round(htmlHeightPx * 0.046)}px; color: #1f2937;" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 25 Q10 15, 20 20 Q30 25, 25 30 Q20 35, 30 40 Q40 45, 50 42 Q60 39, 70 38 Q80 37, 90 38 Q100 39, 110 40 Q120 41, 130 40 Q140 39, 150 38 Q160 37, 170 36 Q180 35, 185 38" 
                            stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div style="width: ${Math.round(htmlWidthPx * 0.107)}px; height: ${Math.round(htmlHeightPx * 0.0007)}px; background: #9ca3af; margin: 0 auto ${Math.round(htmlHeightPx * 0.006)}px;"></div>
                <p style="font-size: ${Math.round(bodyFontSize * 0.875)}px; font-weight: bold; color: #1f2937; margin: 0 0 ${Math.round(htmlHeightPx * 0.003)}px 0;">Dr. Sarah Johnson</p>
                <p style="font-size: ${smallFontSize}px; color: #4b5563; margin: 0 0 ${Math.round(htmlHeightPx * 0.0014)}px 0;">Director of Education</p>
                <p style="font-size: ${smallFontSize}px; color: #4b5563; margin: 0;">Enamel Academy</p>
              </div>
              
              <!-- Official Seal -->
              <div style="text-align: center;">
                <div style="margin-bottom: ${Math.round(htmlHeightPx * 0.005)}px;">
                  <div style="margin: 0 auto; width: ${Math.round(htmlWidthPx * 0.08)}px; height: ${Math.round(htmlWidthPx * 0.08)}px; background: linear-gradient(to bottom right, #8b5cf6, #a855f7); border-radius: 50%; border: ${Math.round(htmlWidthPx * 0.0033)}px solid #c084fc; box-shadow: 0 ${Math.round(htmlHeightPx * 0.006)}px ${Math.round(htmlHeightPx * 0.011)}px rgba(139, 92, 246, 0.3); display: flex; align-items: center; justify-content: center;">
                    <svg style="width: ${Math.round(htmlWidthPx * 0.04)}px; height: ${Math.round(htmlWidthPx * 0.04)}px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                    </svg>
                  </div>
                </div>
                <div style="width: ${Math.round(htmlWidthPx * 0.08)}px; height: ${Math.round(htmlHeightPx * 0.0007)}px; background: #9ca3af; margin: 0 auto ${Math.round(htmlHeightPx * 0.006)}px;"></div>
                <p style="font-size: ${Math.round(bodyFontSize * 0.875)}px; font-weight: bold; color: #8b5cf6; margin: 0 0 ${Math.round(htmlHeightPx * 0.003)}px 0;">ENAMEL ACADEMY</p>
                <p style="font-size: ${Math.round(smallFontSize * 0.83)}px; color: #6b7280; margin: 0 0 ${Math.round(htmlHeightPx * 0.0014)}px 0;">Official Seal</p>
                <p style="font-size: ${Math.round(smallFontSize * 0.83)}px; color: #6b7280; margin: 0;">
                  ${certDetails.completion_date ? new Date(certDetails.completion_date).getFullYear() : new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>
        </div>
      `
      
      document.body.appendChild(container)

      // Wait for content to render and images to load
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Capture with html2canvas at high quality (scale 2 for 192 DPI equivalent)
      const canvas = await html2canvas(container, {
        scale: 2, // 2x scale = 192 DPI (good quality for PDF)
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#f3f4f6",
        width: htmlWidthPx,
        height: htmlHeightPx,
        windowWidth: htmlWidthPx,
        windowHeight: htmlHeightPx,
      })

      // Create PDF with exact dimensions
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: isA4 ? "a4" : "letter",
      })

      // Convert canvas pixels to mm for PDF
      // Canvas is at 2x scale, so actual pixel dimensions are canvas.width/2 x canvas.height/2
      // But we want to use the full resolution, so we calculate based on the scale
      const canvasWidthMM = canvas.width / (2 * mmToPx) // Divide by scale and convert
      const canvasHeightMM = canvas.height / (2 * mmToPx)
      
      // PDF page dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // The canvas should match PDF dimensions exactly, but account for any rounding
      const imgData = canvas.toDataURL("image/png", 1.0)

      // Add image to fill the entire PDF page
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST")

      const fileName = `Certificate-${certTitle.replace(/\s+/g, "-")}.pdf`
      pdf.save(fileName)

      setActionMessage("Certificate PDF downloaded successfully.")

      // Clean up
      document.body.removeChild(container)
    } catch (error) {
      console.error("Error downloading certificate as PDF:", error)
      setActionError("Failed to download certificate as PDF. Please try again.")
    } finally {
      setDownloadingCertId(null)
    }
  }

  const handleVerifyCertificate = async (certId: string) => {
    setActionMessage("")
    setActionError("")
    setVerifyingCertId(certId)
    const certificate = certificatesData.find((cert) => cert.id === certId)
    
    // Use currentUserId from state (fetched from userService.me())
    const userId = currentUserId || certificate?.userId
    
    if (!certificate || !certificate.courseId) {
      setActionError("Certificate verification data is incomplete (course id missing).")
      toast({
        title: "Verification Failed",
        description: "Certificate verification data is incomplete (course id missing).",
        variant: "destructive",
      })
      setVerifyingCertId(null)
      return
    }
    
    if (!userId) {
      setActionError("User ID not available. Please try again.")
      toast({
        title: "Verification Failed",
        description: "User ID not available. Please try again.",
        variant: "destructive",
      })
      setVerifyingCertId(null)
      return
    }
    
    try {
      await certificatesService.verify({
        course_id: certificate.courseId,
        user_id: userId,
      })
      setActionMessage("Certificate verified successfully.")
      toast({
        title: "Verification Successful",
        description: "Certificate has been verified successfully.",
      })
    } catch (error) {
      console.error("Certificate verification error:", error)
      setActionError("Certificate verification failed. Please try again.")
      toast({
        title: "Verification Failed",
        description: "Certificate verification failed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setVerifyingCertId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#e8e8e8]">
      <Navigation activeItem="CPD Certificates" />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Training and Certificates</h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
            {isLoading ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-md bg-white/30" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-20 mb-2 bg-white/30" />
                        <Skeleton className="h-6 w-16 bg-white/30" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                <div>
                  <p className="text-white/80 text-xs sm:text-sm">Total CPD Hours</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{totalCpdHours.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                <div>
                  <p className="text-white/80 text-xs sm:text-sm">Completed Courses</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{completedCourses}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                <div>
                  <p className="text-white/80 text-xs sm:text-sm">Average Score</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{averageScore}%</p>
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        {isLoading && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
            <Spinner />
            Loading certificates...
          </div>
        )}
        {loadError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}
        {actionMessage && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {actionMessage}
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mb-4 sm:mb-6">
          {/* Sidebar Filters */}
          <div className="w-full lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-3 sm:p-4">
              <h2 className="text-[#8b5cf6] font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Filter className="h-4 w-4" />
                Filters
              </h2>
              <div>
                <label className="text-xs sm:text-sm text-[#6b7280] mb-1 sm:mb-2 block">Categories</label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs sm:text-sm text-[#1a1a1a] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] flex items-center justify-between hover:border-[#8b5cf6]/50 transition-colors cursor-pointer">
                    <span className={selectedCategory ? "text-[#1a1a1a]" : "text-[#6b7280]"}>
                      {selectedCategory ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace(/-/g, ' ') : "All Categories"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-[#6b7280]" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)] bg-white border border-[#e5e7eb] rounded-lg shadow-md">
                    <DropdownMenuLabel className="text-xs sm:text-sm text-[#6b7280] px-3 py-2">Select Category</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setSelectedCategory("")}
                      className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                    >
                      All Categories
                    </DropdownMenuItem>
                    {categoryOptions.map((category) => (
                    <DropdownMenuItem 
                        key={category}
                        onClick={() => setSelectedCategory(category.toLowerCase().replace(/\s+/g, '-'))}
                      className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                    >
                        {category}
                    </DropdownMenuItem>
                    ))}
                    {/* Additional common categories */}
                    {!categoryOptions.includes("Clinical") && (
                      <DropdownMenuItem 
                        onClick={() => setSelectedCategory("clinical")}
                        className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                      >
                        Clinical
                      </DropdownMenuItem>
                    )}
                    {!categoryOptions.includes("Compliance") && (
                      <DropdownMenuItem 
                        onClick={() => setSelectedCategory("compliance")}
                        className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                      >
                        Compliance
                      </DropdownMenuItem>
                    )}
                    {!categoryOptions.includes("Endodontics") && (
                      <DropdownMenuItem 
                        onClick={() => setSelectedCategory("endodontics")}
                        className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                      >
                        Endodontics
                      </DropdownMenuItem>
                    )}
                    {!categoryOptions.includes("Orthodontics") && (
                      <DropdownMenuItem 
                        onClick={() => setSelectedCategory("orthodontics")}
                        className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                      >
                        Orthodontics
                      </DropdownMenuItem>
                    )}
                    {!categoryOptions.includes("Periodontics") && (
                      <DropdownMenuItem 
                        onClick={() => setSelectedCategory("periodontics")}
                        className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                      >
                        Periodontics
                      </DropdownMenuItem>
                    )}
                    {!categoryOptions.includes("Prosthodontics") && (
                      <DropdownMenuItem 
                        onClick={() => setSelectedCategory("prosthodontics")}
                        className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                      >
                        Prosthodontics
                      </DropdownMenuItem>
                    )}
                    {!categoryOptions.includes("Oral Surgery") && (
                      <DropdownMenuItem 
                        onClick={() => setSelectedCategory("oral-surgery")}
                        className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                      >
                        Oral Surgery
                      </DropdownMenuItem>
                    )}
                    {!categoryOptions.includes("General Dentistry") && (
                      <DropdownMenuItem 
                        onClick={() => setSelectedCategory("general-dentistry")}
                        className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                      >
                        General Dentistry
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="mt-3 sm:mt-4">
                <label className="text-xs sm:text-sm text-[#6b7280] mb-1 sm:mb-2 block">Sort By</label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs sm:text-sm text-[#1a1a1a] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] flex items-center justify-between hover:border-[#8b5cf6]/50 transition-colors cursor-pointer">
                    <span>{sortBy === "date" ? "Date" : sortBy === "title" ? "Title" : sortBy === "cpdHours" ? "CPD Hours" : sortBy === "score" ? "Score" : sortBy === "type" ? "Type" : sortBy === "format" ? "Format" : sortBy === "status" ? "Status" : sortBy === "instructor" ? "Instructor" : sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
                    <ChevronDown className="h-4 w-4 text-[#6b7280]" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)] bg-white border border-[#e5e7eb] rounded-lg shadow-md" align="start">
                    <DropdownMenuLabel className="text-xs sm:text-sm text-[#6b7280] px-3 py-2">Sort By</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setSortBy("date")}
                      className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                    >
                      Date
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("title")}
                      className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                    >
                      Title
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("cpdHours")}
                      className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                    >
                      CPD Hours
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("score")}
                      className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                    >
                      Score
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("type")}
                      className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                    >
                      Type
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("format")}
                      className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                    >
                      Format
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("status")}
                      className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                    >
                      Status
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("instructor")}
                      className="text-xs sm:text-sm text-[#1a1a1a] hover:bg-[#f9f5ff] hover:text-[#8b5cf6] cursor-pointer"
                    >
                      Instructor
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search and Export */}
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search certificates by title, instructor, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-14 bg-white border border-[#e5e7eb] rounded-xl text-xs sm:text-base text-[#1a1a1a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 focus:border-[#8b5cf6] transition-colors"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-[#8b5cf6] rounded-lg flex items-center justify-center text-white hover:bg-[#7c3aed] transition-colors">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <button 
                onClick={handleExport}
                className="flex-shrink-0 px-3 sm:px-6 py-2 sm:py-2.5 bg-[#8b5cf6] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#7c3aed] transition-colors flex items-center justify-center gap-1 sm:gap-2"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Export to Excel</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>

            {/* Column Filters */}
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-6">
              {activeFilters.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => toggleFilter(filter.label)}
                  className={`px-3 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm rounded-full border transition-colors ${
                    filter.active
                      ? "border-[#8b5cf6] bg-white text-[#1a1a1a] shadow-sm"
                      : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#8b5cf6]/50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Results Summary */}
            <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-[#6b7280]">
              Showing {filteredAndSortedData.length} of {certificatesData.length} certificates
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e5e7eb] p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-6 w-12 rounded-md" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))
          ) : (
            filteredAndSortedData.map((certificate) => (
            <div key={certificate.id} className="bg-white rounded-xl border border-[#e5e7eb] p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] leading-snug">{certificate.title}</h3>
                  <p className="text-xs text-[#6b7280] mt-1">by {certificate.instructor}</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">ID: {certificate.id}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleViewCertificate(certificate.id)}
                    disabled={viewingCertId === certificate.id || isLoadingCertHtml}
                    className="p-2 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors disabled:opacity-50"
                    title="View Certificate"
                  >
                    {viewingCertId === certificate.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                    <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadCertificate(certificate.id, certificate.title)}
                    disabled={downloadingCertId === certificate.id}
                    className="p-2 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Download Certificate"
                  >
                    {downloadingCertId === certificate.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                    <Download className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(certificate.date).toLocaleDateString()}</span>
                </div>
                <span className="text-[#e5e7eb]">•</span>
                <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{certificate.timeTaken}</span>
                </div>
                <span className="text-[#e5e7eb]">•</span>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                  certificate.format === "Online" ? "bg-blue-100 text-blue-700" :
                  certificate.format === "Workshop" ? "bg-green-100 text-green-700" :
                  certificate.format === "Hands-on" ? "bg-purple-100 text-purple-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {certificate.format}
                </span>
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                  {certificate.status}
                </span>
              </div>
            </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          {activeFilters.filter(f => f.active).length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <Filter className="h-10 w-10 sm:h-12 sm:w-12 text-[#9ca3af] mx-auto mb-3 sm:mb-4" />
              <p className="text-[#1a1a1a] text-base sm:text-lg font-medium mb-2">No columns selected</p>
              <p className="text-[#6b7280] text-xs sm:text-sm">Please select at least one column filter above to view certificates</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f9f5ff] border-b border-[#e5e7eb]">
                <tr>
                  {activeFilters.filter(f => f.active).map((filter) => (
                    <th 
                      key={filter.label}
                      className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider cursor-pointer hover:bg-[#f0ebff] transition-colors"
                      onClick={() => {
                        if (filter.label === "Date") handleSort("date")
                        if (filter.label === "Title") handleSort("title")
                        if (filter.label === "Time Taken") handleSort("cpdHours")
                        if (filter.label === "Type") handleSort("type")
                        if (filter.label === "Format") handleSort("format")
                        if (filter.label === "Status") handleSort("status")
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate">{filter.label}</span>
                        {(filter.label === "Date" || filter.label === "Title" || filter.label === "Time Taken" || filter.label === "Type" || filter.label === "Format" || filter.label === "Status") && (
                          <span className="text-[#8b5cf6] flex-shrink-0">
                            {sortBy === (filter.label === "Time Taken" ? "cpdHours" : filter.label.toLowerCase()) && 
                             (sortOrder === "asc" ? "↑" : "↓")
                            }
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {activeFilters.filter(f => f.active).map((filter) => (
                        <td key={filter.label} className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-24" />
                        </td>
                      ))}
                      <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <Skeleton className="h-6 w-12 rounded-md" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredAndSortedData.map((certificate) => (
                  <tr key={certificate.id} className="hover:bg-[#f9f5ff] transition-colors">
                    {activeFilters.filter(f => f.active).map((filter) => (
                      <td key={filter.label} className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                        {filter.label === "Date" && (
                          <div>
                            <div className="text-sm font-medium text-[#1a1a1a]">
                              {new Date(certificate.date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-[#6b7280]">
                              Completed: {new Date(certificate.completionDate).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                        {filter.label === "Title" && (
                          <div>
                            <div className="text-sm font-medium text-[#1a1a1a]">{certificate.title}</div>
                            <div className="text-xs text-[#6b7280]">ID: {certificate.id}</div>
                            <div className="text-xs text-[#6b7280]">Instructor: {certificate.instructor}</div>
                          </div>
                        )}
                        {filter.label === "Format" && (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            certificate.format === "Online" ? "bg-blue-100 text-blue-700" :
                            certificate.format === "Workshop" ? "bg-green-100 text-green-700" :
                            certificate.format === "Hands-on" ? "bg-purple-100 text-purple-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {certificate.format}
                          </span>
                        )}
                        {filter.label === "Status" && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            {certificate.status}
                          </span>
                        )}
                        {filter.label === "Time Taken" && (
                          <div className="text-sm text-[#1a1a1a]">{certificate.timeTaken}</div>
                        )}
                        {filter.label === "Type" && (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            certificate.type === "Core CPD" ? "bg-[#8b5cf6]/10 text-[#8b5cf6]" :
                            certificate.type === "Mandatory" ? "bg-red-100 text-red-700" :
                            certificate.type === "Advanced" ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {certificate.type}
                          </span>
                        )}
                        {filter.label === "Categories" && (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            certificate.category === "Clinical" ? "bg-blue-100 text-blue-700" :
                            certificate.category === "Compliance" ? "bg-red-100 text-red-700" :
                            "bg-green-100 text-green-700"
                          }`}>
                            {certificate.category}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewCertificate(certificate.id)}
                          disabled={viewingCertId === certificate.id || isLoadingCertHtml}
                          className="p-2 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors disabled:opacity-50"
                          title="View Certificate"
                        >
                          {viewingCertId === certificate.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                          <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDownloadCertificate(certificate.id, certificate.title)}
                          disabled={downloadingCertId === certificate.id}
                          className="p-2 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Download Certificate"
                        >
                          {downloadingCertId === certificate.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                          <Download className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}
          </div>
          
        {!isLoading && filteredAndSortedData.length === 0 && (
          <div className="bg-white rounded-xl border border-[#e5e7eb] text-center py-8 sm:py-12">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-[#9ca3af] mx-auto mb-3 sm:mb-4" />
              <p className="text-[#9ca3af] text-base sm:text-lg">No certificates found</p>
              <p className="text-[#9ca3af] text-xs sm:text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          )}
      </main>

      <Footer />
      
      {/* Certificate Modal */}
      {selectedCertificate && (
        <CertificateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          certificate={selectedCertificate}
        />
      )}

      {/* Certificate HTML Viewer Modal */}
      {isHtmlModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0">
          <div className="bg-white w-full h-full sm:h-[90vh] sm:max-w-5xl sm:rounded-xl sm:m-4 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#8b5cf6] text-white p-3 sm:p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Award className="h-5 w-5 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold truncate">
                  {htmlModalTitle || "Certificate Preview"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsHtmlModalOpen(false)
                  setCertificateHtml("")
                  setHtmlModalTitle("")
                  setCertificateDetails(null)
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            {/* Modal Body - Custom Certificate Display */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 md:p-8">
              {isLoadingCertHtml ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
                    <p className="text-sm text-gray-600">Loading certificate...</p>
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

                      {/* Main Content */}
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
                              "{certificateDetails.certificate_content}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer Section */}
                      <div className="mt-4 sm:mt-6 md:mt-8 pt-4 sm:pt-6 border-t-2 border-gray-300">
                        {/* Certificate Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 text-xs sm:text-sm">
                          <div className="text-center sm:text-left">
                            <p className="text-gray-500 uppercase tracking-wide mb-1">Certificate ID</p>
                            <p className="font-bold text-gray-900">#{certificateDetails.certificate_id || "N/A"}</p>
                          </div>
                          {certificateDetails.completion_date && (
                            <div className="text-center sm:text-right">
                              <p className="text-gray-500 uppercase tracking-wide mb-1">Date</p>
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

                        {/* Signature Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                          {/* Signature */}
                          <div className="text-center">
                            <div className="mb-2 sm:mb-3">
                              <div className="mx-auto w-44 sm:w-52 md:w-60 h-20 sm:h-24 md:h-28 bg-white border border-gray-200 rounded flex items-center justify-center shadow-sm">
                                <svg className="w-40 sm:w-48 md:w-56 h-16 sm:h-20 md:h-24 text-gray-800" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  {/* Simple elegant signature - cursive J with flowing letters */}
                                  <path d="M15 25 Q10 15, 20 20 Q30 25, 25 30 Q20 35, 30 40 Q40 45, 50 42 Q60 39, 70 38 Q80 37, 90 38 Q100 39, 110 40 Q120 41, 130 40 Q140 39, 150 38 Q160 37, 170 36 Q180 35, 185 38" 
                                        stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            </div>
                            <div className="w-32 sm:w-40 h-0.5 bg-gray-400 mx-auto mb-2"></div>
                            <p className="text-xs sm:text-sm md:text-base font-bold text-gray-800">Dr. Sarah Johnson</p>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">Director of Education</p>
                            <p className="text-xs sm:text-sm text-gray-600">Enamel Academy</p>
                          </div>
                          
                          {/* Official Seal */}
                          <div className="text-center">
                            <div className="mb-2 sm:mb-3">
                              <div className="mx-auto w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] rounded-full flex items-center justify-center border-4 border-purple-300 shadow-lg">
                                <Award className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-white" />
                              </div>
                            </div>
                            <div className="w-24 sm:w-32 h-0.5 bg-gray-400 mx-auto mb-2"></div>
                            <p className="text-xs sm:text-sm md:text-base font-bold text-[#8b5cf6]">ENAMEL ACADEMY</p>
                            <p className="text-xs text-gray-500 mt-1">Official Seal</p>
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
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-600">No certificate data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}
