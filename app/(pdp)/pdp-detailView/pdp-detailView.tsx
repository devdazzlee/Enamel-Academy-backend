"use client"

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft,
  FileDown,
  Printer,
  Target,
  TrendingUp,
  FileText,
  Calendar,
  Eye,
  CheckCircle,
  Edit2,
  Save,
  X,
  Plus,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export default function PDPDetailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPDPData, setEditedPDPData] = useState<typeof pdpData | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  
  const pdpData = {
    title: '2023 Annual Plan',
    status: 'Completed',
    dateRange: 'January 1, 2023 - December 31, 2023',
    lastUpdated: 'December 15, 2023',
    progress: 100,
    careerObjectives: [
      'Become a specialist in Advanced Endodontics',
      'Achieve proficiency in Digital Smile Design',
      'Obtain Implantology Certification',
      'Develop expertise in aesthetic dentistry procedures'
    ],
    currentSkills: [
      { skill: 'General Dentistry', level: 'Advanced' },
      { skill: 'Root Canal Treatment', level: 'Intermediate' },
      { skill: 'Crown & Bridge Work', level: 'Intermediate' },
      { skill: 'Patient Communication', level: 'Advanced' }
    ],
    skillsToDevelop: [
      { skill: 'Endodontics', target: 'Advanced' },
      { skill: 'Implantology', target: 'Intermediate' },
      { skill: 'Digital Dentistry', target: 'Intermediate' },
      { skill: 'Aesthetic Procedures', target: 'Advanced' }
    ],
    courses: [
      { title: 'Advanced Endodontics Masterclass', duration: '40 hours', status: 'Completed' },
      { title: 'Digital Smile Design Workshop', duration: '20 hours', status: 'Completed' },
      { title: 'Implantology Certification Program', duration: '60 hours', status: 'Completed' },
      { title: 'Aesthetic Dentistry Techniques', duration: '30 hours', status: 'Completed' }
    ],
    milestones: [
      { quarter: 'Q1 2025', goal: 'Complete Endodontics course', status: 'Completed' },
      { quarter: 'Q2 2025', goal: 'Finish Digital Smile Design', status: 'Completed' },
      { quarter: 'Q3 2025', goal: 'Start Implantology certification', status: 'Completed' },
      { quarter: 'Q4 2025', goal: 'Complete all certifications', status: 'Completed' }
    ],
    achievements: [
      'Successfully completed 4 advanced courses',
      'Gained proficiency in 3 new dental specialties',
      'Logged 150 CPD hours',
      'Improved patient satisfaction scores by 25%'
    ],
    reflection: 'This year has been transformative for my dental career. The combination of advanced endodontics training and digital dentistry skills has significantly enhanced my clinical capabilities. I feel more confident in complex cases and have received excellent patient feedback.'
  };

  const dentalSpecialties = [
    'General Dentistry',
    'Endodontics',
    'Implantology',
    'Prosthodontics',
    'Orthodontics',
    'Periodontics',
    'Oral Surgery',
    'Aesthetic Dentistry',
    'Paediatric Dentistry',
    'Restorative Dentistry',
    'Digital Dentistry',
    'Oral Pathology',
    'Dental Anesthesiology',
    'Dental Radiology'
  ];

  const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  const handleEdit = () => {
    setEditedPDPData({ ...pdpData });
    setIsEditing(true);
    // Open mobile modal if on mobile device
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileModalOpen(true);
    }
  };

  const handleSave = () => {
    // Here you would typically save data to your backend
    console.log('Saving PDP data:', editedPDPData);
    setIsEditing(false);
    setIsMobileModalOpen(false);
    // Show success message
    alert('PDP data saved successfully!');
  };

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current || isDownloadingPdf) return;
    try {
      setIsDownloadingPdf(true);
      const dataUrl = await toPng(printAreaRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        filter: (node: HTMLElement) => !node.classList?.contains("no-print"),
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = () => resolve(null);
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / img.width, pdfHeight / img.height);
      const imgW = img.width * ratio;
      const imgH = img.height * ratio;
      const imgX = (pdfWidth - imgW) / 2;
      const imgY = 0;

      pdf.addImage(img, "PNG", imgX, imgY, imgW, imgH);
      const fileName = `PDP-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCancel = () => {
    setEditedPDPData(null);
    setIsEditing(false);
    setIsMobileModalOpen(false);
  };

  const updateCareerObjective = (index: number, value: string) => {
    setEditedPDPData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        careerObjectives: prev.careerObjectives.map((obj: string, i: number) => 
          i === index ? value : obj
        )
      };
    });
  };

  const addCareerObjective = () => {
    setEditedPDPData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        careerObjectives: [...prev.careerObjectives, '']
      };
    });
  };

  const removeCareerObjective = (index: number) => {
    setEditedPDPData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        careerObjectives: prev.careerObjectives.filter((_: string, i: number) => i !== index)
      };
    });
  };

  const currentData = editedPDPData || pdpData;

  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const el = document.getElementById(`pdp-section-${stepParam}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <button onClick={() => router.push('/pdp')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to My PDPs</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">{currentData.title}</h1>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  {currentData.status}
                </span>
              </div>
              <p className="text-gray-600 text-sm sm:text-base">{currentData.dateRange}</p>
              <p className="text-xs sm:text-sm text-gray-500">Last updated: {currentData.lastUpdated}</p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleSave} 
                    className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm hidden sm:flex"
                  >
                    <Save size={16} />
                    <span className="ml-1">Save</span>
                  </Button>
                  <Button 
                    onClick={handleCancel} 
                    variant="outline" 
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm hidden sm:flex"
                  >
                    <X size={16} />
                    <span className="ml-1">Cancel</span>
                  </Button>
                  {/* Mobile Edit Button */}
                  <Button 
                    onClick={() => setIsMobileModalOpen(true)}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:hidden"
                  >
                    <Edit2 size={16} />
                    <span className="ml-1">Edit Form</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleEdit} 
                    variant="outline" 
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm"
                  >
                    <Edit2 size={16} />
                    <span className="hidden sm:inline ml-1">Edit</span>
                  </Button>
                  <Button 
                    onClick={() => window.print()} 
                    variant="outline" 
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm hidden sm:flex"
                  >
                    <Printer size={16} />
                    <span className="ml-1">Print</span>
                  </Button>
                  <Button 
                    onClick={handleDownloadPDF} 
                    disabled={isDownloadingPdf}
                    className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm hidden sm:flex disabled:opacity-50"
                  >
                    <FileDown size={16} />
                    <span className="ml-1">{isDownloadingPdf ? "Generating..." : "PDF"}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div ref={printAreaRef} id="pdp-print-area" className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-xs sm:text-sm font-bold text-green-600">{pdpData.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 sm:h-3 rounded-full"
              style={{ width: `${pdpData.progress}%` }}
            />
          </div>
        </div>

        {/* Career Objectives */}
        <div id="pdp-section-1" className="bg-white rounded-lg shadow-sm p-4 sm:p-8 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Target size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Career Objectives</h2>
                  <p className="text-sm sm:text-base text-gray-600">Your professional goals and career aspirations</p>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  Completed
                </span>
              </div>
              <div className="mt-3 sm:mt-4 space-y-2">
                {isEditing ? (
                  <>
                    {currentData.careerObjectives.map((objective: string, index: number) => (
                      <div key={index} className="flex flex-col gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-2 flex-1">
                          <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="flex-1 flex items-center text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                <span className="flex-1">{objective || "Select or type career objective"}</span>
                                <div className="ml-2 h-4 w-4 text-gray-400 flex-shrink-0">▼</div>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-full min-w-[300px] max-h-60 overflow-y-auto">
                              <DropdownMenuItem 
                                onClick={() => updateCareerObjective(index, "Become a specialist in Advanced Endodontics")}
                                className={objective === "Become a specialist in Advanced Endodontics" ? "bg-purple-50 text-purple-700" : ""}
                              >
                                Become a specialist in Advanced Endodontics
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateCareerObjective(index, "Achieve proficiency in Digital Smile Design")}
                                className={objective === "Achieve proficiency in Digital Smile Design" ? "bg-purple-50 text-purple-700" : ""}
                              >
                                Achieve proficiency in Digital Smile Design
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateCareerObjective(index, "Obtain Implantology Certification")}
                                className={objective === "Obtain Implantology Certification" ? "bg-purple-50 text-purple-700" : ""}
                              >
                                Obtain Implantology Certification
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateCareerObjective(index, "Develop expertise in aesthetic dentistry procedures")}
                                className={objective === "Develop expertise in aesthetic dentistry procedures" ? "bg-purple-50 text-purple-700" : ""}
                              >
                                Develop expertise in aesthetic dentistry procedures
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateCareerObjective(index, "Master advanced surgical techniques")}
                                className={objective === "Master advanced surgical techniques" ? "bg-purple-50 text-purple-700" : ""}
                              >
                                Master advanced surgical techniques
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateCareerObjective(index, "Become a leader in dental practice management")}
                                className={objective === "Become a leader in dental practice management" ? "bg-purple-50 text-purple-700" : ""}
                              >
                                Become a leader in dental practice management
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateCareerObjective(index, "Specialize in paediatric dentistry")}
                                className={objective === "Specialize in paediatric dentistry" ? "bg-purple-50 text-purple-700" : ""}
                              >
                                Specialize in paediatric dentistry
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateCareerObjective(index, "Excel in cosmetic dentistry")}
                                className={objective === "Excel in cosmetic dentistry" ? "bg-purple-50 text-purple-700" : ""}
                              >
                                Excel in cosmetic dentistry
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateCareerObjective(index, "Become an orthodontic specialist")}
                                className={objective === "Become an orthodontic specialist" ? "bg-purple-50 text-purple-700" : ""}
                              >
                                Become an orthodontic specialist
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateCareerObjective(index, "Master digital dentistry technologies")}
                                className={objective === "Master digital dentistry technologies" ? "bg-purple-50 text-purple-700" : ""}
                              >
                                Master digital dentistry technologies
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Button
                          onClick={() => removeCareerObjective(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 self-start sm:self-auto"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={addCareerObjective}
                      variant="outline"
                      className="w-full sm:w-auto border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Career Objective
                    </Button>
                  </>
                ) : (
                  currentData.careerObjectives.map((objective: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-gray-700 text-sm sm:text-base">{objective}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skills Assessment */}
        <div id="pdp-section-2" className="bg-white rounded-lg shadow-sm p-4 sm:p-8 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Skills Assessment</h2>
                  <p className="text-sm sm:text-base text-gray-600">Current skills and areas for development</p>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  Completed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Current Skills</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {isEditing ? (
                      currentData.currentSkills.map((skill: { skill: string; level: string }, index: number) => (
                        <div key={index} className="flex flex-col gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg overflow-hidden">
                          <div className="flex items-start gap-2 min-w-0">
                            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                            <Select
                              value={skill.skill}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    currentSkills: prev.currentSkills.map((s, i) => 
                                      i === index ? { ...s, skill: value } : s
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="flex-1 text-sm min-w-0">
                                <SelectValue placeholder="Select skill" />
                              </SelectTrigger>
                              <SelectContent>
                                {dentalSpecialties.map(specialty => (
                                  <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="pl-6">
                            <Select
                              value={skill.level}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    currentSkills: prev.currentSkills.map((s, i) => 
                                      i === index ? { ...s, level: value } : s
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="w-full text-sm">
                                <SelectValue placeholder="Level" />
                              </SelectTrigger>
                              <SelectContent>
                                {skillLevels.map(level => (
                                  <SelectItem key={level} value={level}>{level}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))
                    ) : (
                      currentData.currentSkills.map((skill: { skill: string; level: string }, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-900 text-xs sm:text-sm truncate flex-1">{skill.skill}</span>
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                            skill.level === 'Advanced' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {skill.level}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Skills to Develop</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {isEditing ? (
                      currentData.skillsToDevelop.map((skill: { skill: string; target: string }, index: number) => (
                        <div key={index} className="flex flex-col gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
                            <Select
                              value={skill.skill}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    skillsToDevelop: prev.skillsToDevelop.map((s, i) => 
                                      i === index ? { ...s, skill: value } : s
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="flex-1 text-sm">
                                <SelectValue placeholder="Select skill" />
                              </SelectTrigger>
                              <SelectContent>
                                {dentalSpecialties.map(specialty => (
                                  <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Select
                            value={skill.target}
                            onValueChange={(value) => {
                              setEditedPDPData(prev => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  skillsToDevelop: prev.skillsToDevelop.map((s, i) => 
                                    i === index ? { ...s, target: value } : s
                                  )
                                };
                              });
                            }}
                          >
                            <SelectTrigger className="w-full text-sm">
                              <SelectValue placeholder="Target" />
                            </SelectTrigger>
                            <SelectContent>
                              {skillLevels.map(level => (
                                <SelectItem key={level} value={level}>Target: {level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))
                    ) : (
                      currentData.skillsToDevelop.map((skill: { skill: string; target: string }, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-900 text-xs sm:text-sm truncate flex-1">{skill.skill}</span>
                          <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex-shrink-0">
                            Target: {skill.target}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Plan */}
        <div id="pdp-section-3" className="bg-white rounded-lg shadow-sm p-4 sm:p-8 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Learning Plan</h2>
                  <p className="text-sm sm:text-base text-gray-600">Selected courses and learning activities</p>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  Completed
                </span>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {isEditing ? (
                  currentData.courses.map((course: { title: string; duration: string; status: string }, index: number) => (
                    <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                          <div className="flex-1">
                            <Select
                              value={course.title}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    courses: prev.courses.map((c, i) => 
                                      i === index ? { ...c, title: value } : c
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="flex-1 text-sm">
                                <SelectValue placeholder="Select course" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Advanced Endodontics Masterclass">Advanced Endodontics Masterclass</SelectItem>
                                <SelectItem value="Digital Smile Design Workshop">Digital Smile Design Workshop</SelectItem>
                                <SelectItem value="Implantology Certification Program">Implantology Certification Program</SelectItem>
                                <SelectItem value="Aesthetic Dentistry Techniques">Aesthetic Dentistry Techniques</SelectItem>
                                <SelectItem value="Modern Prosthodontics Course">Modern Prosthodontics Course</SelectItem>
                                <SelectItem value="Orthodontic Biomechanics">Orthodontic Biomechanics</SelectItem>
                                <SelectItem value="Periodontal Surgery Advanced">Periodontal Surgery Advanced</SelectItem>
                                <SelectItem value="Paediatric Behavior Management">Paediatric Behavior Management</SelectItem>
                                <SelectItem value="CAD/CAM Technology in Dentistry">CAD/CAM Technology in Dentistry</SelectItem>
                                <SelectItem value="Cone Beam CT Interpretation">Cone Beam CT Interpretation</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={course.duration}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    courses: prev.courses.map((c, i) => 
                                      i === index ? { ...c, duration: value } : c
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="w-full text-sm mt-2">
                                <SelectValue placeholder="Duration" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="20 hours">20 hours</SelectItem>
                                <SelectItem value="30 hours">30 hours</SelectItem>
                                <SelectItem value="40 hours">40 hours</SelectItem>
                                <SelectItem value="50 hours">50 hours</SelectItem>
                                <SelectItem value="60 hours">60 hours</SelectItem>
                                <SelectItem value="80 hours">80 hours</SelectItem>
                                <SelectItem value="100 hours">100 hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Select
                          value={course.status}
                          onValueChange={(value) => {
                            setEditedPDPData(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                courses: prev.courses.map((c, i) => 
                                  i === index ? { ...c, status: value } : c
                                )
                              };
                            });
                          }}
                        >
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                ) : (
                  currentData.courses.map((course: { title: string; duration: string; status: string }, index: number) => (
                    <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 mb-1 text-sm sm:text-base leading-tight">{course.title}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">Duration: {course.duration}</p>
                        </div>
                        <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex-shrink-0">
                          {course.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline & Milestones */}
        <div id="pdp-section-4" className="bg-white rounded-lg shadow-sm p-4 sm:p-8 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Calendar size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Timeline & Milestones</h2>
                  <p className="text-sm sm:text-base text-gray-600">Key deadlines and progress checkpoints</p>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  Completed
                </span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {isEditing ? (
                  currentData.milestones.map((milestone: { quarter: string; goal: string; status: string }, index: number) => (
                    <div key={index} className="flex flex-col gap-3">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col gap-2">
                            <Select
                              value={milestone.quarter}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    milestones: prev.milestones.map((m, i) => 
                                      i === index ? { ...m, quarter: value } : m
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="w-full sm:w-auto text-sm">
                                <SelectValue placeholder="Quarter" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                                <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                                <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                                <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                                <SelectItem value="Q1 2026">Q1 2026</SelectItem>
                                <SelectItem value="Q2 2026">Q2 2026</SelectItem>
                                <SelectItem value="Q3 2026">Q3 2026</SelectItem>
                                <SelectItem value="Q4 2026">Q4 2026</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={milestone.status}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    milestones: prev.milestones.map((m, i) => 
                                      i === index ? { ...m, status: value } : m
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="w-full text-sm">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Not Started">Not Started</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Delayed">Delayed</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={milestone.goal}
                              onValueChange={(value) => {
                                setEditedPDPData(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    milestones: prev.milestones.map((m, i) => 
                                      i === index ? { ...m, goal: value } : m
                                    )
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="flex-1 text-sm">
                                <SelectValue placeholder="Milestone goal" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Complete Endodontics course">Complete Endodontics course</SelectItem>
                                <SelectItem value="Finish Digital Smile Design">Finish Digital Smile Design</SelectItem>
                                <SelectItem value="Start Implantology certification">Start Implantology certification</SelectItem>
                                <SelectItem value="Complete all certifications">Complete all certifications</SelectItem>
                                <SelectItem value="Master advanced techniques">Master advanced techniques</SelectItem>
                                <SelectItem value="Obtain practical experience">Obtain practical experience</SelectItem>
                                <SelectItem value="Pass final assessment">Pass final assessment</SelectItem>
                                <SelectItem value="Submit portfolio">Submit portfolio</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  currentData.milestones.map((milestone: { quarter: string; goal: string; status: string }, index: number) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-green-700 text-xs sm:text-sm">{milestone.quarter}</span>
                            <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold inline-block">
                              {milestone.status}
                            </span>
                            <p className="text-gray-900 mt-1 text-sm sm:text-base leading-relaxed">{milestone.goal}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Review & Reflection */}
        <div id="pdp-section-5" className="bg-white rounded-lg shadow-sm p-4 sm:p-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Eye size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Review & Reflection</h2>
                  <p className="text-sm sm:text-base text-gray-600">Progress evaluation and personal insights</p>
                </div>
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                  Completed
                </span>
              </div>

              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Key Achievements</h3>
                <div className="space-y-1 sm:space-y-2">
                  {pdpData.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-gray-700 text-sm sm:text-base leading-relaxed">{achievement}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Personal Reflection</h3>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{pdpData.reflection}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Edit Modal */}
        {isMobileModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex flex-col z-50 sm:hidden">
            <div className="bg-white shadow-2xl w-full flex-1 flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 relative">
                <h3 className="text-base font-bold pr-8">Edit PDP</h3>
                <p className="text-purple-100 text-xs">Edit your professional development plan</p>
                <button 
                  onClick={handleCancel}
                  className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-3 py-3 overflow-y-auto flex-1">
                {/* Career Objectives Section */}
                <div className="mb-5">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Career Objectives</h4>
                  <div className="space-y-2">
                    {editedPDPData?.careerObjectives.map((objective, index) => (
                      <div key={index} className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg">
                        <CheckCircle className="text-green-600 flex-shrink-0" size={14} />
                        <Select
                          value={objective}
                          onValueChange={(value) => updateCareerObjective(index, value)}
                        >
                          <SelectTrigger className="flex-1 text-xs h-8">
                            <SelectValue placeholder="Select career objective" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Become a specialist in Advanced Endodontics">Become a specialist in Advanced Endodontics</SelectItem>
                            <SelectItem value="Achieve proficiency in Digital Smile Design">Achieve proficiency in Digital Smile Design</SelectItem>
                            <SelectItem value="Obtain Implantology Certification">Obtain Implantology Certification</SelectItem>
                            <SelectItem value="Develop expertise in aesthetic dentistry procedures">Develop expertise in aesthetic dentistry procedures</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => removeCareerObjective(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <Button
                      onClick={addCareerObjective}
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50 text-xs h-8"
                    >
                      <Plus size={14} className="mr-1.5" />
                      Add Career Objective
                    </Button>
                  </div>
                </div>

                {/* Skills Section */}
                <div className="mb-5">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Current Skills</h4>
                  <div className="space-y-2">
                    {editedPDPData?.currentSkills.map((skill, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded-lg space-y-1.5 overflow-hidden">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle className="text-green-600 flex-shrink-0" size={14} />
                          <Select
                            value={skill.skill}
                            onValueChange={(value) => {
                              setEditedPDPData(prev => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  currentSkills: prev.currentSkills.map((s, i) => 
                                    i === index ? { ...s, skill: value } : s
                                  )
                                };
                              });
                            }}
                          >
                            <SelectTrigger className="flex-1 text-xs h-8 min-w-0">
                              <SelectValue placeholder="Select skill" />
                            </SelectTrigger>
                            <SelectContent>
                              {dentalSpecialties.map(specialty => (
                                <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="pl-5">
                          <Select
                            value={skill.level}
                            onValueChange={(value) => {
                              setEditedPDPData(prev => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  currentSkills: prev.currentSkills.map((s, i) => 
                                    i === index ? { ...s, level: value } : s
                                  )
                                };
                              });
                            }}
                          >
                            <SelectTrigger className="w-full text-xs h-8">
                              <SelectValue placeholder="Level" />
                            </SelectTrigger>
                            <SelectContent>
                              {skillLevels.map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex gap-2 pt-3 border-t sticky bottom-0 bg-white pb-1">
                  <Button 
                    onClick={handleSave}
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                  >
                    <Save size={14} className="mr-1.5" />
                    Save Changes
                  </Button>
                  <Button 
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-9"
                  >
                    <X size={14} className="mr-1.5" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

    
      </div>
    </div>
  );
}
