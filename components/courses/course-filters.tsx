"use client"

import { useEffect, useState } from "react"
import { Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { coursesService, type ApiCategory, type CourseFilters } from "@/lib/api/courses"
import { rolesService, type DentalRole } from "@/lib/api/roles"

export function CourseFilters({ onFiltersChange }: { onFiltersChange: (filters: Record<string, string[]>) => void }) {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [filters, setFilters] = useState<CourseFilters>({})
  const [roles, setRoles] = useState<DentalRole[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setIsLoading(true)
      try {
        const [cats, fltrs, rls] = await Promise.all([coursesService.categories(), coursesService.filters(), rolesService.roles()])
        if (!alive) return
        setCategories(cats)
        setFilters(fltrs)
        setRoles(rls)
      } catch {
        if (!alive) return
        setCategories([])
        setFilters({})
        setRoles([])
      } finally {
        if (!alive) return
        setIsLoading(false)
      }
    }
    void run()
    return () => { alive = false }
  }, [])

  const handleFilterChange = (filter: string, value: string) => {
    const newFilters = { ...selectedFilters }
    if (!newFilters[filter]) {
      newFilters[filter] = []
    }
    
    const currentValues = newFilters[filter]
    if (currentValues.includes(value)) {
      newFilters[filter] = currentValues.filter(v => v !== value)
    } else {
      newFilters[filter] = [...currentValues, value]
    }
    
    setSelectedFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const getFilterValueFromLabel = (filterType: string, label: string): string => {
    const filterMap = filters[filterType as keyof CourseFilters];
    if (!filterMap || !Array.isArray(filterMap)) return label;
    
    const filterItem = filterMap.find(item => item.label === label);
    return filterItem?.value || label;
  }

  const clearAllFilters = () => {
    setSelectedFilters({})
    onFiltersChange({})
  }

  const getActiveFilterCount = () => {
    return Object.values(selectedFilters).reduce((total, filterArray) => total + filterArray.length, 0)
  }

  const getFilterDisplayValue = (filter: string) => {
    const values = selectedFilters[filter] || []
    if (values.length === 0) return filter
    if (values.length === 1) return values[0]
    return `${values.length} selected`
  }

  const filterOptions = {
    Category: categories.map(c => ({ label: c.name, count: c.count || 0 })),
    Role: roles.map(r => ({ label: r.name, count: 0 })),
    // Map API filters to the format expected by the component
    Plan: filters.plan?.map(p => ({ label: p.label, count: 0 })) || [],
    Status: filters.status?.map(s => ({ label: s.label, count: 0 })) || [],
    Format: filters.format?.map(f => ({ label: f.label, count: 0 })) || [],
    Length: filters.length?.map(l => ({ label: l.label, count: 0 })) || [],
    Difficulty: filters.difficulty?.map(d => ({ label: d.label, count: 0 })) || [],
    Sort: filters.sort?.map(s => ({ label: s.label, count: 0 })) || [],
  }

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-primary font-medium text-sm sm:text-base">Filters</span>
          {getActiveFilterCount() > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              {getActiveFilterCount()}
            </span>
          )}
        </div>
        {getActiveFilterCount() > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {Object.keys(filterOptions).map((filter) => (
            <div key={filter}>
              <Select
                value={selectedFilters[filter]?.[0] || ""}
                onValueChange={(value) => handleFilterChange(filter, value)}
              >
                <SelectTrigger className="w-full bg-white border border-gray-200">
                  <SelectValue placeholder={filter} />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 max-h-60">
                  {(filterOptions[filter as keyof typeof filterOptions] || []).map((option) => {
                    // For API-driven filters, get the actual value to send to backend
                    const optionLabel = typeof option === 'string' ? option : option.label;
                    const optionCount = typeof option === 'string' ? 0 : option.count;
                    const actualValue = ['Plan', 'Status', 'Format', 'Length', 'Difficulty', 'Sort'].includes(filter) 
                      ? getFilterValueFromLabel(filter, optionLabel) 
                      : optionLabel;
                    
                    return (
                      <SelectItem key={actualValue} value={actualValue}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{optionLabel}</span>
                          {optionCount > 0 && (
                            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                              {optionCount}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
