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

/**
 * Format a comma-separated address string into a multi-line address
 * @param address - The comma-separated address string
 * @returns Formatted address with line breaks
 */
export function formatAddress(address: string | null | undefined): string {
  if (!address) {
    return '';
  }
  
  // Split on commas and clean up each part
  const parts = address.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  // Join with newlines to create multi-line format
  return parts.join('\n');
}

/**
 * Format a complete address from components
 * @param components - Object containing address components
 * @returns Formatted multi-line address string
 */
export function formatCompleteAddress(components: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string {
  const parts: string[] = [];
  
  // Add street address (split comma-separated if needed)
  if (components.address) {
    const streetParts = components.address.split(',').map(part => part.trim()).filter(part => part.length > 0);
    parts.push(...streetParts);
  }
  
  // Add city, state postal code line
  const cityStateZip: string[] = [];
  if (components.city) cityStateZip.push(components.city);
  if (components.state) cityStateZip.push(components.state);
  if (components.postalCode) cityStateZip.push(components.postalCode);
  
  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(', '));
  }
  
  // Add country if available and not US (assumed default)
  if (components.country && components.country.toLowerCase() !== 'united states' && components.country.toLowerCase() !== 'us') {
    parts.push(components.country);
  }
  
  return parts.join('\n');
}

/**
 * Determine if a customer should have a link to a company page
 * @param companyDomain - The company domain from the bridge table
 * @param isIndividualCustomer - Whether the customer is marked as individual
 * @returns Whether to show a company link
 */
export function shouldShowCompanyLink(
  companyDomain: string | null | undefined,
  isIndividualCustomer: boolean
): boolean {
  if (!companyDomain || isIndividualCustomer) {
    return false;
  }
  
  // Exclude special domain markers for individual customers and FBA orders
  const excludedDomains = [
    'NO_EMAIL_DOMAIN',
    'INDIVIDUAL_GMAIL.COM',
    'INDIVIDUAL_YAHOO.COM',
    'INDIVIDUAL_ICLOUD.COM',
    'INDIVIDUAL_HOTMAIL.COM',
    'INDIVIDUAL_AOL.COM',
  ];
  
  return !excludedDomains.includes(companyDomain.toUpperCase());
}
