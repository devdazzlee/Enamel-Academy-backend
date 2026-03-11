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

    try {
      const url = certificate.certificateUrl
      if (!url || url === "#") {
            setActionError("Certificate URL not available.")
        setViewingCertId(null)
        setIsLoadingCertHtml(false)
        return
      }

      // Fetch certificate HTML and display in modal
      const html = await fetchCertificateHtml(url)
      setCertificateHtml(html)
      setHtmlModalTitle(certificate.title)
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

    try {
      // Determine the URL to fetch HTML from
      const url = certificate.downloadUrl && certificate.downloadUrl !== ""
        ? certificate.downloadUrl
        : certificate.certificateUrl

      if (!url || url === "#") {
        setActionError("Download URL not available.")
        setDownloadingCertId(null)
        return
      }
      
      // Fetch HTML from the download URL via proxy (images are inlined as base64)
      const html = await fetchCertificateHtml(url)

      // Create a hidden container to render the HTML for capture
      const container = document.createElement("div")
      container.style.position = "fixed"
      container.style.left = "-10000px"
      container.style.top = "-10000px"
      container.style.width = "1200px"
      container.style.backgroundColor = "white"
      container.style.zIndex = "-9999"
      container.innerHTML = html
      document.body.appendChild(container)

      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Capture with html2canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 1200,
        windowWidth: 1200,
      })

      // Determine orientation based on captured content
      const isLandscape = canvas.width > canvas.height
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height)
      const imgW = canvas.width * ratio
      const imgH = canvas.height * ratio
      const imgX = (pdfWidth - imgW) / 2
      const imgY = (pdfHeight - imgH) / 2

      pdf.addImage(imgData, "PNG", imgX, imgY, imgW, imgH)

      const fileName = `Certificate-${title.replace(/\s+/g, "-")}.pdf`
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
                  <DropdownMenuTrigger className="w-full px-3 py-2 bg-[#f5f5f5] border-0 rounded-lg text-xs sm:text-sm text-[#9ca3af] appearance-none focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 flex items-center justify-between hover:bg-[#e8e8e8] transition-colors">
                    <span>{selectedCategory ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1) : "All Categories"}</span>
                    <ChevronDown className="h-4 w-4" />
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
            ))
          )}
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
                  ))
                )}
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

      {/* Certificate HTML Viewer Modal */}
      {isHtmlModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full h-full sm:h-[90vh] sm:max-w-5xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden">
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
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            {/* Modal Body - iframe renders the certificate HTML */}
            <div className="flex-1 overflow-hidden bg-gray-100">
              {isLoadingCertHtml ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
                    <p className="text-sm text-gray-600">Loading certificate...</p>
                  </div>
                </div>
              ) : (
                <iframe
                  srcDoc={certificateHtml}
                  className="w-full h-full border-0"
                  title="Certificate Preview"
                  sandbox="allow-same-origin allow-popups"
                />
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
