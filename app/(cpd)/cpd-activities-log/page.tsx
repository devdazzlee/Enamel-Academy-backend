'use client';

import React, { useState } from 'react';
import { ArrowLeft, Filter, Search, FileText, CheckCircle, Clock, Eye, BarChart3, ChevronDown, X, Calendar, Award, User } from 'lucide-react';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';

export default function CPDActivitiesLog() {
  const router = useRouter();
  const defaultCategory = 'All Categories';
  const defaultType = 'All Types';
  const defaultYear = 'All Years';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(defaultCategory);
  const [typeFilter, setTypeFilter] = useState(defaultType);
  const [yearFilter, setYearFilter] = useState(defaultYear);
  const [selectedActivity, setSelectedActivity] = useState<typeof activities[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activities = [
    {
      id: 1,
      title: 'Advanced Endodontics: Root Canal Techniques',
      description: 'Enhanced understanding of modern root canal preparation techniques',
      date: '15 Jan 2026',
      hours: 3,
      category: 'Clinical',
      type: 'Platform Course',
      status: 'Verified',
      files: 1
    },
    {
      id: 2,
      title: 'Practice Management Masterclass',
      description: 'Improved practice efficiency strategies',
      date: '10 Jan 2026',
      hours: 2,
      category: 'Management & Leadership',
      type: 'External',
      status: 'Verified',
      files: 1
    },
    {
      id: 3,
      title: 'Dental Implant Workshop - London',
      description: 'Hands-on experience with implant placement',
      date: '20 Dec 2025',
      hours: 6,
      category: 'Clinical',
      type: 'External',
      status: 'Verified',
      files: 3
    },
    {
      id: 4,
      title: 'Medical Emergencies in Dental Practice',
      description: 'Updated emergency protocols and response procedures',
      date: '05 Dec 2025',
      hours: 4,
      category: 'Clinical',
      type: 'Platform Course',
      status: 'Verified',
      files: 1
    },
    {
      id: 5,
      title: 'Effective Communication with Anxious Patients',
      description: 'New techniques for patient anxiety management',
      date: '22 Nov 2025',
      hours: 1.5,
      category: 'Communication',
      type: 'Platform Course',
      status: 'Verified',
      files: 1
    },
    {
      id: 6,
      title: 'Digital Dentistry Conference 2025',
      description: 'Latest advances in CAD/CAM technology',
      date: '10 Nov 2025',
      hours: 8,
      category: 'Clinical',
      type: 'External',
      status: 'Verified',
      files: 3
    },
    {
      id: 7,
      title: 'GDC Standards and Professional Ethics',
      description: 'Updated understanding of GDC standards',
      date: '15 Oct 2025',
      hours: 2,
      category: 'Professionalism',
      type: 'Platform Course',
      status: 'Verified',
      files: 1
    },
    {
      id: 8,
      title: 'Team Leadership in Dental Practice',
      description: 'Leadership skills for managing dental teams',
      date: '05 Oct 2025',
      hours: 3,
      category: 'Management & Leadership',
      type: 'External',
      status: 'Verified',
      files: 1
    },
    {
      id: 9,
      title: 'Periodontal Disease Management',
      description: 'Evidence-based periodontal treatment protocols',
      date: '20 Sept 2025',
      hours: 4,
      category: 'Clinical',
      type: 'Platform Course',
      status: 'Verified',
      files: 1
    },
    {
      id: 10,
      title: 'Dental Photography Workshop',
      description: 'Clinical photography techniques for documentation',
      date: '08 Sept 2025',
      hours: 5,
      category: 'Clinical',
      type: 'External',
      status: 'Verified',
      files: 2
    }
  ];

  const categoryBreakdown = [
    { name: 'Clinical', hours: 30 },
    { name: 'Management & Leadership', hours: 5 },
    { name: 'Communication', hours: 1.5 },
    { name: 'Professionalism', hours: 2 }
  ];

  const handleDownloadCertificate = (activity: typeof activities[0]) => {
    // Create a simple certificate download
    const certificateContent = `
CPD Certificate of Completion
============================

Activity: ${activity.title}
Description: ${activity.description}
Date: ${activity.date}
Duration: ${activity.hours} CPD Hours
Category: ${activity.category}
Type: ${activity.type}
Status: Verified

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

  const handleViewEvidenceFiles = (activity: typeof activities[0]) => {
    // Simulate viewing evidence files - in a real app, this would open a file viewer
    const evidenceFiles = [
      { name: 'Certificate of Completion.pdf', type: 'PDF', size: '2.3 MB' },
      { name: 'Attendance Record.pdf', type: 'PDF', size: '1.1 MB' },
      { name: 'Course Evaluation.pdf', type: 'PDF', size: '856 KB' }
    ].slice(0, activity.files);

    alert(`Evidence Files for ${activity.title}:\n\n${evidenceFiles.map((file, index) => 
      `${index + 1}. ${file.name} (${file.type}, ${file.size})`
    ).join('\n')}\n\nIn a production environment, this would open a file viewer or download manager.`);
  };

  const handleViewActivity = (activity: typeof activities[0]) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  };

  const getActivityYear = (date: string) => {
    const match = date.match(/\b\d{4}\b/);
    return match ? match[0] : '';
  };

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <StatCard
            icon={<FileText className="text-purple-600" size={24} />}
            label="Total Records"
            value="10"
          />
          <StatCard
            icon={<Clock className="text-purple-600" size={24} />}
            label="Total Hours"
            value="38.5"
          />
          <StatCard
            icon={<CheckCircle className="text-green-600" size={24} />}
            label="Verified Hours"
            value="14.5"
          />
          <StatCard
            icon={<FileText className="text-purple-600" size={24} />}
            label="With Evidence"
            value="10"
          />
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 mt-6 sm:mt-8">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 lg:sticky lg:top-6">
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
                  <DropdownMenuContent className="w-full min-w-[200px]">
                    <DropdownMenuItem 
                      onClick={() => setCategoryFilter('All Categories')}
                      className={categoryFilter === 'All Categories' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      All Categories
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setCategoryFilter('Clinical')}
                      className={categoryFilter === 'Clinical' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      Clinical
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setCategoryFilter('Management & Leadership')}
                      className={categoryFilter === 'Management & Leadership' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      Management & Leadership
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setCategoryFilter('Communication')}
                      className={categoryFilter === 'Communication' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      Communication
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setCategoryFilter('Professionalism')}
                      className={categoryFilter === 'Professionalism' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      Professionalism
                    </DropdownMenuItem>
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
                  <DropdownMenuContent className="w-full min-w-[200px]">
                    <DropdownMenuItem 
                      onClick={() => setTypeFilter('All Types')}
                      className={typeFilter === 'All Types' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      All Types
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setTypeFilter('Platform Course')}
                      className={typeFilter === 'Platform Course' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      Platform Course
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setTypeFilter('External')}
                      className={typeFilter === 'External' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      External
                    </DropdownMenuItem>
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
                  <DropdownMenuContent className="w-full min-w-[200px]">
                    <DropdownMenuItem 
                      onClick={() => setYearFilter('All Years')}
                      className={yearFilter === 'All Years' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      All Years
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setYearFilter('2026')}
                      className={yearFilter === '2026' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      2026
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setYearFilter('2025')}
                      className={yearFilter === '2025' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      2025
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setYearFilter('2024')}
                      className={yearFilter === '2024' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      2024
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setYearFilter('2023')}
                      className={yearFilter === '2023' ? 'bg-purple-50 text-purple-700' : ''}
                    >
                      2023
                    </DropdownMenuItem>
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
                          style={{ width: `${(cat.hours / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Activities List */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-purple-700">All CPD Activities</h3>
                <p className="text-sm text-gray-600">Showing {filteredActivities.length} records</p>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                <div className="divide-y divide-gray-200">
                  {filteredActivities.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">{activity.title}</h4>
                          <p className="text-xs text-gray-600 line-clamp-2">{activity.description}</p>
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
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[1600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[450px]">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[160px]">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[120px]">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[200px]">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[200px]">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[150px]">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[120px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{activity.title}</div>
                            <div className="text-xs text-gray-600 mt-1 whitespace-normal">{activity.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1 text-sm text-gray-700">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{activity.date}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1 text-sm text-gray-700">
                            <Clock size={16} className="text-gray-400" />
                            <span>{activity.hours}h</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{activity.category}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            activity.type === 'Platform Course'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {activity.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1">
                            <CheckCircle size={16} className="text-green-600" />
                            <span className="text-sm text-gray-700">{activity.files} file</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                    <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2">{selectedActivity.description}</p>
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
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">Verified Status</span>
                    <span className="text-green-600 font-medium text-xs sm:text-sm">Verified</span>
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
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-xs sm:text-sm sm:text-base"
                >
                  Download Certificate
                </button>
                <button 
                  onClick={() => handleViewEvidenceFiles(selectedActivity)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors text-xs sm:text-sm sm:text-base"
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
