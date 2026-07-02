// ABOUTME: Query functions for customer contacts data
// ABOUTME: Handles fetching and filtering contact records from dim_customer_contacts

import { db } from '@/lib/db'
import { dimCustomerContactsInAnalyticsMart } from '@/lib/db/schema'
import { desc, asc, ilike, eq, and, or, count, type SQL } from 'drizzle-orm'

export interface ContactFilters {
  search?: string
  contactRole?: string
  businessSize?: string
  revenueCategory?: string
  contactTier?: string
  emailMarketable?: boolean
  keyAccountContact?: boolean
}

export interface Contact {
  contactDimKey: string | null
  fullName: string | null
  firstName: string | null
  lastName: string | null
  jobTitle: string | null
  primaryEmail: string | null
  primaryPhone: string | null
  companyName: string | null
  contactRole: string | null
  isPrimaryCompanyContact: boolean | null
  businessSizeCategory: string | null
  revenueCategory: string | null
  contactDataQuality: string | null
  contactTier: string | null
  emailMarketable: boolean | null
  keyAccountContact: boolean | null
  companyTotalRevenue: number | null
  companyTotalOrders: string | null
}

export async function getContacts(
  page: number = 1,
  pageSize: number = 50,
  searchTerm: string = '',
  sortBy: string = 'companyTotalRevenue',
  sortOrder: 'asc' | 'desc' = 'desc',
  filters: ContactFilters = {}
) {
  const offset = (page - 1) * pageSize

  // Build where conditions
  const whereConditions: SQL[] = []

  if (searchTerm) {
    const searchCondition = or(
      ilike(dimCustomerContactsInAnalyticsMart.fullName, `%${searchTerm}%`),
      ilike(dimCustomerContactsInAnalyticsMart.primaryEmail, `%${searchTerm}%`),
      ilike(dimCustomerContactsInAnalyticsMart.companyName, `%${searchTerm}%`)
    )
    if (searchCondition) {
      whereConditions.push(searchCondition)
    }
  }

  if (filters.contactRole) {
    whereConditions.push(eq(dimCustomerContactsInAnalyticsMart.contactRole, filters.contactRole))
  }

  if (filters.businessSize) {
    whereConditions.push(eq(dimCustomerContactsInAnalyticsMart.businessSizeCategory, filters.businessSize))
  }

  if (filters.revenueCategory) {
    whereConditions.push(eq(dimCustomerContactsInAnalyticsMart.revenueCategory, filters.revenueCategory))
  }

  if (filters.contactTier) {
    whereConditions.push(eq(dimCustomerContactsInAnalyticsMart.contactTier, filters.contactTier))
  }

  if (filters.emailMarketable !== undefined) {
    whereConditions.push(eq(dimCustomerContactsInAnalyticsMart.emailMarketable, filters.emailMarketable))
  }

  if (filters.keyAccountContact !== undefined) {
    whereConditions.push(eq(dimCustomerContactsInAnalyticsMart.keyAccountContact, filters.keyAccountContact))
  }

  // Build the query with sorting
  const sortField = sortBy === 'fullName' 
    ? dimCustomerContactsInAnalyticsMart.fullName
    : sortBy === 'companyName'
    ? dimCustomerContactsInAnalyticsMart.companyName
    : sortBy === 'primaryEmail'
    ? dimCustomerContactsInAnalyticsMart.primaryEmail
    : dimCustomerContactsInAnalyticsMart.companyTotalRevenue

  // Build and execute the main query
  const queryBuilder = db
    .select({
      contactDimKey: dimCustomerContactsInAnalyticsMart.contactDimKey,
      fullName: dimCustomerContactsInAnalyticsMart.fullName,
      firstName: dimCustomerContactsInAnalyticsMart.firstName,
      lastName: dimCustomerContactsInAnalyticsMart.lastName,
      jobTitle: dimCustomerContactsInAnalyticsMart.jobTitle,
      primaryEmail: dimCustomerContactsInAnalyticsMart.primaryEmail,
      primaryPhone: dimCustomerContactsInAnalyticsMart.primaryPhone,
      companyName: dimCustomerContactsInAnalyticsMart.companyName,
      contactRole: dimCustomerContactsInAnalyticsMart.contactRole,
      isPrimaryCompanyContact: dimCustomerContactsInAnalyticsMart.isPrimaryCompanyContact,
      businessSizeCategory: dimCustomerContactsInAnalyticsMart.businessSizeCategory,
      revenueCategory: dimCustomerContactsInAnalyticsMart.revenueCategory,
      contactDataQuality: dimCustomerContactsInAnalyticsMart.contactDataQuality,
      contactTier: dimCustomerContactsInAnalyticsMart.contactTier,
      emailMarketable: dimCustomerContactsInAnalyticsMart.emailMarketable,
      keyAccountContact: dimCustomerContactsInAnalyticsMart.keyAccountContact,
      companyTotalRevenue: dimCustomerContactsInAnalyticsMart.companyTotalRevenue,
      companyTotalOrders: dimCustomerContactsInAnalyticsMart.companyTotalOrders,
    })
    .from(dimCustomerContactsInAnalyticsMart)

  const contacts = await (whereConditions.length > 0
    ? queryBuilder.where(and(...whereConditions))
    : queryBuilder)
    .orderBy(sortOrder === 'desc' ? desc(sortField) : asc(sortField))
    .limit(pageSize)
    .offset(offset)

  // Get total count for pagination
  const countQueryBuilder = db
    .select({ count: count() })
    .from(dimCustomerContactsInAnalyticsMart)

  const [{ count: totalCount }] = await (whereConditions.length > 0
    ? countQueryBuilder.where(and(...whereConditions))
    : countQueryBuilder)

  return {
    contacts: contacts as Contact[],
    totalCount
  }
}

export async function getCompanyContacts(companyDomainKey: string) {
  const contacts = await db
    .select({
      contactDimKey: dimCustomerContactsInAnalyticsMart.contactDimKey,
      fullName: dimCustomerContactsInAnalyticsMart.fullName,
      firstName: dimCustomerContactsInAnalyticsMart.firstName,
      lastName: dimCustomerContactsInAnalyticsMart.lastName,
      jobTitle: dimCustomerContactsInAnalyticsMart.jobTitle,
      primaryEmail: dimCustomerContactsInAnalyticsMart.primaryEmail,
      primaryPhone: dimCustomerContactsInAnalyticsMart.primaryPhone,
      contactRole: dimCustomerContactsInAnalyticsMart.contactRole,
      isPrimaryCompanyContact: dimCustomerContactsInAnalyticsMart.isPrimaryCompanyContact,
      contactDataQuality: dimCustomerContactsInAnalyticsMart.contactDataQuality,
      emailMarketable: dimCustomerContactsInAnalyticsMart.emailMarketable,
      keyAccountContact: dimCustomerContactsInAnalyticsMart.keyAccountContact,
      contactTier: dimCustomerContactsInAnalyticsMart.contactTier,
    })
    .from(dimCustomerContactsInAnalyticsMart)
    .where(eq(dimCustomerContactsInAnalyticsMart.companyDomainKey, companyDomainKey))
    .orderBy(
      desc(dimCustomerContactsInAnalyticsMart.isPrimaryCompanyContact),
      asc(dimCustomerContactsInAnalyticsMart.fullName)
    )

  return contacts as Contact[]
}