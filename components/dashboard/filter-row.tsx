"use client"

import * as React from "react"
import { format, addDays, isWithinInterval, parseISO } from "date-fns"
import { CalendarIcon, Search, X, Filter, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useDebounce } from "@/hooks/use-debounce"
import { useFilterParams, type FilterState } from "@/lib/url-params"
import { useIsMobile } from "@/hooks/use-mobile"

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterRowProps {
  statusOptions?: FilterOption[]
  categoryOptions?: FilterOption[]
  className?: string
}

export function FilterRow({
  statusOptions = [],
  categoryOptions = [],
  className
}: FilterRowProps) {
  const isMobile = useIsMobile()
  const { filters, updateFilter, clearFilters, hasActiveFilters, activeFilterCount } = useFilterParams()
  const [searchInput, setSearchInput] = React.useState(filters.search || "")
  const [dateRange, setDateRange] = React.useState<{
    from?: Date
    to?: Date
  }>({
    from: filters.dateFrom ? parseISO(filters.dateFrom) : undefined,
    to: filters.dateTo ? parseISO(filters.dateTo) : undefined,
  })

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 300)

  // Update URL with debounced search
  React.useEffect(() => {
    updateFilter("search", debouncedSearch || undefined)
  }, [debouncedSearch, updateFilter])

  // Update date range when URL params change
  React.useEffect(() => {
    setDateRange({
      from: filters.dateFrom ? parseISO(filters.dateFrom) : undefined,
      to: filters.dateTo ? parseISO(filters.dateTo) : undefined,
    })
  }, [filters.dateFrom, filters.dateTo])

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatuses = filters.status || []
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status)
    updateFilter("status", newStatuses.length > 0 ? newStatuses : undefined)
  }

  const handleCategoryChange = (category: string, checked: boolean) => {
    const currentCategories = filters.category || []
    const newCategories = checked
      ? [...currentCategories, category]
      : currentCategories.filter(c => c !== category)
    updateFilter("category", newCategories.length > 0 ? newCategories : undefined)
  }

  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      setDateRange({})
      updateFilter("dateFrom", undefined)
      updateFilter("dateTo", undefined)
      return
    }

    setDateRange(range)
    updateFilter("dateFrom", range.from ? format(range.from, "yyyy-MM-dd") : undefined)
    updateFilter("dateTo", range.to ? format(range.to, "yyyy-MM-dd") : undefined)
  }

  const handleClearFilters = () => {
    clearFilters()
    setSearchInput("")
    setDateRange({})
  }

  const selectedStatusCount = filters.status?.length || 0
  const selectedCategoryCount = filters.category?.length || 0
  const hasDateRange = !!(dateRange.from || dateRange.to)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Filters</h3>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} active
            </Badge>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
            aria-label="Search input"
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchInput("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Status Filter Dropdown */}
        {statusOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="justify-between min-w-[150px]"
                aria-label="Status filter"
              >
                Status
                {selectedStatusCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1 text-xs">
                    {selectedStatusCount}
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  {selectedStatusCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        updateFilter("status", undefined)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <span className="ml-1">▼</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-64">
                {statusOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={filters.status?.includes(option.value) || false}
                    onCheckedChange={(checked) =>
                      handleStatusChange(option.value, checked as boolean)
                    }
                  >
                    <div className="flex items-center justify-between flex-1">
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {option.count}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Category Filter Dropdown */}
        {categoryOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="justify-between min-w-[150px]"
                aria-label="Category filter"
              >
                Category
                {selectedCategoryCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1 text-xs">
                    {selectedCategoryCount}
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  {selectedCategoryCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        updateFilter("category", undefined)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <span className="ml-1">▼</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-64">
                {categoryOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={filters.category?.includes(option.value) || false}
                    onCheckedChange={(checked) =>
                      handleCategoryChange(option.value, checked as boolean)
                    }
                  >
                    <div className="flex items-center justify-between flex-1">
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {option.count}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal min-w-[250px]",
                !dateRange.from && "text-muted-foreground"
              )}
              aria-label="Date range filter"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
              {hasDateRange && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent ml-auto"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDateRangeChange({})
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={isMobile ? 1 : 2}
              className="rounded-md border"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {filters.search && (
            <Badge variant="default" className="gap-1">
              Search: "{filters.search}"
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => {
                  updateFilter("search", undefined)
                  setSearchInput("")
                }}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}

          {filters.status?.map((status) => (
            <Badge key={status} variant="default" className="gap-1">
              Status: {statusOptions.find(opt => opt.value === status)?.label || status}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => handleStatusChange(status, false)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}

          {filters.category?.map((category) => (
            <Badge key={category} variant="default" className="gap-1">
              Category: {categoryOptions.find(opt => opt.value === category)?.label || category}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => handleCategoryChange(category, false)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}

          {(dateRange.from || dateRange.to) && (
            <Badge variant="default" className="gap-1">
              Date: {dateRange.from && format(dateRange.from, "MMM dd")}
              {dateRange.to && ` - ${format(dateRange.to, "MMM dd")}`}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => handleDateRangeChange({})}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}