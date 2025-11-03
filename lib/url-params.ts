import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback, useMemo } from "react"

export interface FilterState {
  search?: string
  status?: string[]
  category?: string[]
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
}

/**
 * Custom hook to manage filter state through URL search parameters
 * Provides utilities to parse, update, and clear URL parameters
 */
export function useFilterParams() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse current filters from URL
  const filters = useMemo((): FilterState => {
    const params = new URLSearchParams(searchParams.toString())

    return {
      search: params.get("search") || undefined,
      status: params.getAll("status"),
      category: params.getAll("category"),
      dateFrom: params.get("dateFrom") || undefined,
      dateTo: params.get("dateTo") || undefined,
      sortBy: params.get("sortBy") || undefined,
      sortOrder: (params.get("sortOrder") as "asc" | "desc") || undefined,
      page: params.get("page") ? parseInt(params.get("page")!, 10) : undefined,
      limit: params.get("limit") ? parseInt(params.get("limit")!, 10) : undefined,
    }
  }, [searchParams])

  // Update URL with new filter values
  const updateFilters = useCallback(
    (newFilters: Partial<FilterState>) => {
      const params = new URLSearchParams(searchParams.toString())

      // Update or remove parameters based on new filters
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
          params.delete(key)
        } else if (Array.isArray(value)) {
          params.delete(key) // Remove existing values
          value.forEach(v => params.append(key, v))
        } else {
          params.set(key, String(value))
        }
      })

      const newUrl = `${pathname}?${params.toString()}`
      router.push(newUrl, { scroll: false })
    },
    [searchParams, pathname, router]
  )

  // Update a single filter
  const updateFilter = useCallback(
    (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
      updateFilters({ [key]: value })
    },
    [updateFilters]
  )

  // Clear all filters
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams()
    const newUrl = `${pathname}?${params.toString()}`
    router.push(newUrl, { scroll: false })
  }, [pathname, router])

  // Clear specific filters
  const clearFilterKeys = useCallback(
    (keys: (keyof FilterState)[]) => {
      const params = new URLSearchParams(searchParams.toString())
      keys.forEach(key => params.delete(key))
      const newUrl = `${pathname}?${params.toString()}`
      router.push(newUrl, { scroll: false })
    },
    [searchParams, pathname, router]
  )

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value =>
      value !== undefined &&
      value !== null &&
      (Array.isArray(value) ? value.length > 0 : true)
    )
  }, [filters])

  // Get count of active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(value =>
      value !== undefined &&
      value !== null &&
      (Array.isArray(value) ? value.length > 0 : true)
    ).length
  }, [filters])

  return {
    filters,
    updateFilters,
    updateFilter,
    clearFilters,
    clearFilterKeys,
    hasActiveFilters,
    activeFilterCount,
  }
}

/**
 * Utility function to create a query string from filter state
 * Useful for API calls
 */
export function createQueryString(filters: Partial<FilterState>): string {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (Array.isArray(value)) {
      if (value.length > 0) {
        value.forEach(v => params.append(key, v))
      }
    } else {
      params.set(key, String(value))
    }
  })

  return params.toString()
}

/**
 * Utility function to parse query string back to filter state
 */
export function parseQueryString(queryString: string): FilterState {
  const params = new URLSearchParams(queryString)

  return {
    search: params.get("search") || undefined,
    status: params.getAll("status"),
    category: params.getAll("category"),
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    sortBy: params.get("sortBy") || undefined,
    sortOrder: (params.get("sortOrder") as "asc" | "desc") || undefined,
    page: params.get("page") ? parseInt(params.get("page")!, 10) : undefined,
    limit: params.get("limit") ? parseInt(params.get("limit")!, 10) : undefined,
  }
}