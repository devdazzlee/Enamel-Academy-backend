"use client"

import { useEffect, useMemo, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { CertificateModal } from "@/components/certificate-modal"
import { Search, ChevronDown, Download, Calendar, Clock, Award, Filter, FileText, Eye, ChevronRight } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { certificatesService } from "@/lib/api/certificates";

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
  score: number;
  instructor: string;
  courseId: number | null;
  userId: number | null;
};

export default function CertificatesPage() {
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
          return {
            id: getText(row.id, `CERT-${index + 1}`),
            title: getText(row.title, "Untitled certificate"),
            category: getText(row.category, "General"),
            type: getText(row.type, "CPD"),
            date: completionDate || new Date().toISOString().slice(0, 10),
            completionDate: completionDate || new Date().toISOString().slice(0, 10),
            timeTaken: getText(row.time_taken, toDuration(minutes)),
            cpdHours,
            status: getText(row.status, "Completed"),
            format: getText(row.format, "Online"),
            certificateUrl: getText(row.certificate_url, "#"),
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

  const getRemotePreviewUrl = (payload: unknown): string => {
    const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>
    const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>
    const possible = [
      data.preview_url,
      data.previewUrl,
      data.certificate_url,
      data.certificateUrl,
      root.preview_url,
      root.previewUrl,
      root.certificate_url,
      root.certificateUrl,
      data.url,
      root.url,
    ]
    const found = possible.find((v) => typeof v === "string" && v.trim().length > 0)
    return typeof found === "string" ? found : ""
  }

  const handleViewCertificate = async (certId: string) => {
    setActionMessage("")
    setActionError("")
    setViewingCertId(certId)
    let shouldOpenModal = false
    const certificate = certificatesData.find(cert => cert.id === certId)
    if (certificate) {
      try {
        if (certificate.courseId) {
          const [availabilityRes, previewRes, detailRes] = await Promise.all([
            certificatesService.checkAvailability(certificate.courseId),
            certificatesService.preview(certificate.courseId),
            certificatesService.getCourseCertificate(certificate.courseId),
          ])
          const availableRoot = (availabilityRes && typeof availabilityRes === "object" ? availabilityRes : {}) as Record<string, unknown>
          const availableData = (availableRoot.data && typeof availableRoot.data === "object" ? availableRoot.data : availableRoot) as Record<string, unknown>
          const isAvailable = Boolean(
            availableData.available ??
            availableData.is_available ??
            availableRoot.available ??
            availableRoot.is_available ??
            true
          )
          if (!isAvailable) {
            setActionError("Certificate is not available yet for this course.")
            return
          }
          const previewUrl = getRemotePreviewUrl(previewRes) || getRemotePreviewUrl(detailRes)
          setSelectedCertificate({
            ...certificate,
            certificateUrl: previewUrl || certificate.certificateUrl,
          })
          setActionMessage("Certificate details loaded from API.")
          shouldOpenModal = true
        } else {
          setSelectedCertificate(certificate)
          shouldOpenModal = true
        }
      } catch {
      setSelectedCertificate(certificate)
        shouldOpenModal = true
        setActionError("Could not fetch certificate preview details from API. Showing available data.")
      } finally {
        if (shouldOpenModal) setIsModalOpen(true)
        setViewingCertId(null)
      }
    } else {
      setViewingCertId(null)
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

    try {
      if (certificate.courseId) {
        const [availabilityRes, detailRes] = await Promise.all([
          certificatesService.checkAvailability(certificate.courseId),
          certificatesService.getCourseCertificate(certificate.courseId),
        ])
        const availableRoot = (availabilityRes && typeof availabilityRes === "object" ? availabilityRes : {}) as Record<string, unknown>
        const availableData = (availableRoot.data && typeof availableRoot.data === "object" ? availableRoot.data : availableRoot) as Record<string, unknown>
        const isAvailable = Boolean(
          availableData.available ??
          availableData.is_available ??
          availableRoot.available ??
          availableRoot.is_available ??
          true
        )
        if (!isAvailable) {
          setActionError("Certificate is not available yet for this course.")
          return
        }

        const remoteUrl = getRemotePreviewUrl(detailRes)
        if (remoteUrl) {
          window.open(remoteUrl, "_blank", "noopener,noreferrer")
          setActionMessage("Certificate download opened from API.")
          return
        }
      }
    } catch {
      setActionError("Could not fetch certificate file from API. Falling back to generated PDF.")
    } finally {
      setDownloadingCertId(null)
    }

    // Create a temporary certificate element for download
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    tempDiv.style.width = '800px'
    tempDiv.style.padding = '48px'
    tempDiv.style.backgroundColor = 'white'
    tempDiv.style.border = '1px solid #e5e7eb'
    tempDiv.style.borderRadius = '8px'
    tempDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif'

    tempDiv.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="color: #8b5cf6; margin-bottom: 16px;">
          <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
        </div>
        <h2 style="font-size: 32px; font-weight: bold; color: #7c3aed; margin-bottom: 8px;">Certificate of Completion</h2>
        <p style="color: #6b7280;">Continuing Professional Development</p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 32px 0; margin-bottom: 32px;">
        <p style="text-align: center; color: #6b7280; margin-bottom: 16px;">This is to certify that</p>
        <h3 style="font-size: 32px; font-weight: bold; color: #111827; text-align: center; margin-bottom: 8px;">Certificate Holder</h3>
        <p style="text-align: center; color: #6b7280; margin-bottom: 24px;">GDC Registration: N/A</p>
        
        <p style="text-align: center; color: #6b7280; margin-bottom: 16px;">has successfully completed</p>
        <h4 style="font-size: 24px; font-weight: bold; color: #7c3aed; text-align: center; margin-bottom: 16px;">${certificate.title}</h4>
        
        <div style="display: flex; justify-content: center; gap: 24px; color: #6b7280; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>${new Date(certificate.completionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>${certificate.cpdHours} CPD Hours</span>
          </div>
        </div>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; color: #15803d;">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span style="font-weight: 600;">Assessment Passed with ${certificate.score}%</span>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 14px; color: #6b7280;">
        <div>
          <p style="color: #9ca3af;">Provided by</p>
          <p style="font-weight: 600; color: #111827;">Enamel CPD</p>
        </div>
        <div style="text-align: right;">
          <p style="color: #9ca3af;">Certificate Number</p>
          <p style="font-weight: 600; color: #111827;">ENAMEL-CPD-${certificate.id}</p>
        </div>
      </div>
      
      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          This certificate is awarded in recognition of successful completion of verified CPD activity and meets the requirements of the GDC Enhanced CPD Framework.
        </p>
      </div>
    `

    document.body.appendChild(tempDiv)

    try {
      const dataUrl = await toPng(tempDiv, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      })

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const img = new Image()
      img.src = dataUrl
      await new Promise((res) => { img.onload = () => res(null) })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pdfWidth / img.width, pdfHeight / img.height)
      const imgW = img.width * ratio
      const imgH = img.height * ratio
      const imgX = (pdfWidth - imgW) / 2
      const imgY = 0

      pdf.addImage(img, 'PNG', imgX, imgY, imgW, imgH)

      const fileName = `CPD-Certificate-${title.replace(/\s+/g, '-')}-${certificate.date}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    } finally {
      document.body.removeChild(tempDiv)
    }
  }

  const handleVerifyCertificate = async (certId: string) => {
    setActionMessage("")
    setActionError("")
    setVerifyingCertId(certId)
    const certificate = certificatesData.find((cert) => cert.id === certId)
    if (!certificate || !certificate.courseId || !certificate.userId) {
      setActionError("Certificate verification data is incomplete (course/user id missing).")
      setVerifyingCertId(null)
      return
    }
    try {
      await certificatesService.verify({
        course_id: certificate.courseId,
        user_id: certificate.userId,
      })
      setActionMessage("Certificate verified successfully.")
    } catch {
      setActionError("Certificate verification failed. Please try again.")
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
                  <DropdownMenuTrigger className="w-full px-3 py-2 bg-[#f5f5f5] border-0 rounded-lg text-xs sm:text-sm text-[#9ca3af] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 flex items-center justify-between hover:bg-[#e8e8e8] transition-colors">
                    <span>{selectedCategory ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1) : "All Categories"}</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-white border border-[#e5e7eb] rounded-lg shadow-md">
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="mt-3 sm:mt-4">
                <label className="text-xs sm:text-sm text-[#6b7280] mb-1 sm:mb-2 block">Sort By</label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full px-3 py-2 bg-[#f5f5f5] border-0 rounded-lg text-xs sm:text-sm text-[#9ca3af] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 flex items-center justify-between hover:bg-[#e8e8e8] transition-colors">
                    <span>{sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-white border border-[#e5e7eb] rounded-lg shadow-md">
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search and Export */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
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
                className="w-full sm:w-auto px-3 sm:px-6 py-2 sm:py-2.5 bg-[#8b5cf6] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#7c3aed] transition-colors flex items-center justify-center gap-1 sm:gap-2"
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
          {filteredAndSortedData.map((certificate) => (
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
                    disabled={viewingCertId === certificate.id}
                    className="p-2 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors"
                    title="View Certificate"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadCertificate(certificate.id, certificate.title)}
                    disabled={downloadingCertId === certificate.id}
                    className="p-2 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors"
                    title="Download Certificate"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleVerifyCertificate(certificate.id)}
                    disabled={verifyingCertId === certificate.id}
                    className="px-2 py-1 text-[10px] font-medium text-[#8b5cf6] border border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/10 rounded-md transition-colors"
                    title="Verify Certificate"
                  >
                    {verifyingCertId === certificate.id ? "..." : "Verify"}
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
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
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
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate">{filter.label}</span>
                        {(filter.label === "Date" || filter.label === "Title" || filter.label === "Time Taken") && (
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
                {filteredAndSortedData.map((certificate) => (
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
                          disabled={viewingCertId === certificate.id}
                          className="p-2 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors"
                          title="View Certificate"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadCertificate(certificate.id, certificate.title)}
                          disabled={downloadingCertId === certificate.id}
                          className="p-2 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors"
                          title="Download Certificate"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleVerifyCertificate(certificate.id)}
                          disabled={verifyingCertId === certificate.id}
                          className="px-2 py-1 text-[10px] font-medium text-[#8b5cf6] border border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/10 rounded-md transition-colors"
                          title="Verify Certificate"
                        >
                          {verifyingCertId === certificate.id ? "..." : "Verify"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  )
}
