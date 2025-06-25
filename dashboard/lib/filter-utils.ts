// ABOUTME: Utilities for parsing and handling URL-based filter parameters across dashboard tables
// ABOUTME: Provides consistent filter state management and date range calculations for saved views
import { format, subDays, subYears, startOfDay, endOfDay } from 'date-fns';

// Base filter interfaces
export interface DateRange {
  start: string;
  end: string;
  compareStart?: string;
  compareEnd?: string;
}

export interface BaseFilters {
  period?: string;
}

export interface ProductFilters extends BaseFilters {
  family?: string;
  materialType?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProductDetailFilters extends BaseFilters {
  // Product detail-specific filters can be added here in the future
}

export interface OrderFilters extends BaseFilters {
  search?: string;
  status?: string;
  customer?: string;
  isPaid?: boolean;
}

export interface CompanyFilters extends BaseFilters {
  search?: string;
  businessSize?: string;
  region?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DashboardFilters extends BaseFilters {
  // Dashboard-specific filters can be added here in the future
}

// Period shortcuts mapping
const PERIOD_SHORTCUTS = {
  '7d': { days: 7, label: '7 days' },
  '30d': { days: 30, label: '30 days' },
  '90d': { days: 90, label: '90 days' },
  '1y': { years: 1, label: '1 year' },
  'all': { all: true, label: 'All time' },
} as const;

export type PeriodShortcut = keyof typeof PERIOD_SHORTCUTS;

// Parse URL searchParams into filters object
export function parseFilters<T extends BaseFilters>(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): T {
  const filters: Record<string, string | number | boolean> = {};
  
  // Handle URLSearchParams or plain object
  const getParam = (key: string): string | null => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key);
    }
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value || null;
  };

  // Parse common filter parameters
  const period = getParam('period');
  if (period) filters.period = period;

  const search = getParam('search');
  if (search) filters.search = search;

  const status = getParam('status');
  if (status) filters.status = status;

  const customer = getParam('customer');
  if (customer) filters.customer = customer;

  const family = getParam('family');
  if (family) filters.family = family;

  const materialType = getParam('materialType');
  if (materialType) filters.materialType = materialType;

  const businessSize = getParam('businessSize');
  if (businessSize) filters.businessSize = businessSize;

  const region = getParam('region');
  if (region) filters.region = region;

  const isPaid = getParam('isPaid');
  if (isPaid) filters.isPaid = isPaid === 'true';

  return filters as unknown as T;
}

// Convert period shortcut to actual date range
export function getDateRange(period: string = '30d', includeComparison: boolean = true): DateRange {
  const today = endOfDay(new Date());
  
  // Handle "all time" period - return very early start date to include all data
  if (period === 'all') {
    return {
      start: '1900-01-01', // Very early date to include all historical data
      end: format(today, 'yyyy-MM-dd'),
      // No comparison period for "all time"
    };
  }

  let startDate: Date;

  // Parse period shortcut
  if (period in PERIOD_SHORTCUTS) {
    const periodConfig = PERIOD_SHORTCUTS[period as PeriodShortcut];
    if ('days' in periodConfig) {
      startDate = startOfDay(subDays(today, periodConfig.days));
    } else if ('years' in periodConfig) {
      startDate = startOfDay(subYears(today, periodConfig.years));
    } else {
      // Fallback for any other config (shouldn't happen)
      startDate = startOfDay(subDays(today, 30));
    }
  } else {
    // Default to 30 days if period not recognized
    startDate = startOfDay(subDays(today, 30));
  }

  const dateRange: DateRange = {
    start: format(startDate, 'yyyy-MM-dd'),
    end: format(today, 'yyyy-MM-dd'),
  };

  // Add comparison period if requested
  if (includeComparison) {
    const periodLength = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const compareEnd = startOfDay(subDays(startDate, 1));
    const compareStart = startOfDay(subDays(compareEnd, periodLength - 1));
    
    dateRange.compareStart = format(compareStart, 'yyyy-MM-dd');
    dateRange.compareEnd = format(compareEnd, 'yyyy-MM-dd');
  }

  return dateRange;
}

// Get display label for period
export function getPeriodLabel(period: string = '30d'): string {
  if (period in PERIOD_SHORTCUTS) {
    return PERIOD_SHORTCUTS[period as PeriodShortcut].label;
  }
  return period;
}

// Get all available period options
export function getPeriodOptions(): Array<{ value: string; label: string }> {
  return Object.entries(PERIOD_SHORTCUTS).map(([value, config]) => ({
    value,
    label: config.label,
  }));
}

// Build URL with filters
export function buildFilterUrl(baseUrl: string, filters: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(baseUrl, window.location.origin);
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  
  return url.pathname + url.search;
}

// Helper to merge current filters with new filter values
export function updateFilters<T extends BaseFilters>(
  currentFilters: T,
  updates: Partial<T>
): T {
  return { ...currentFilters, ...updates };
}