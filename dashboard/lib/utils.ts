import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as USD currency with consistent formatting
 * @param value - The number to format
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
  value: number | string,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showCents?: boolean;
  } = {}
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '$0.00';
  }

  const {
    minimumFractionDigits = options.showCents === false ? 0 : 2,
    maximumFractionDigits = options.showCents === false ? 0 : 2,
  } = options;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numValue);
}

/**
 * Format a number with proper thousands separators
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string (e.g., "1,234" or "1,234.5")
 */
export function formatNumber(
  value: number | string,
  decimals: number = 0
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
}
