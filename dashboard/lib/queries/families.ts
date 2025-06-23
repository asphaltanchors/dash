// ABOUTME: Product family sales analysis and comparison queries
// ABOUTME: Provides family-level sales metrics with period-over-period growth comparisons
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getDateRange, type ProductFilters } from '@/lib/filter-utils';

export interface FamilySales {
  productFamily: string;
  currentPeriodSales: string;
  currentPeriodOrders: number;
  currentPeriodUnits: string;
  previousPeriodSales: string;
  previousPeriodOrders: number;
  previousPeriodUnits: string;
  salesGrowth: number;
  orderGrowth: number;
  unitsGrowth: number;
}

// Get family sales with period comparison
export async function getFamilySales(filters: ProductFilters = {}): Promise<FamilySales[]> {
  const dateRange = getDateRange(filters.period || '1y', true);
  const currentStart = dateRange.start;
  const currentEnd = dateRange.end;
  const previousStart = dateRange.compareStart!;
  const previousEnd = dateRange.compareEnd!;

  // Build family filter condition
  const familyCondition = filters.family 
    ? sql`AND product_family = ${filters.family}`
    : sql``;

  const familySalesData = await db.execute(sql`
    WITH current_period AS (
      SELECT 
        product_family,
        COUNT(DISTINCT order_number) as current_orders,
        SUM(product_service_quantity) as current_units,
        SUM(product_service_amount) as current_sales
      FROM analytics_mart.fct_order_line_items
      WHERE product_family IS NOT NULL
        AND order_date >= ${currentStart}
        AND order_date <= ${currentEnd}
        AND product_service_amount IS NOT NULL
        ${familyCondition}
      GROUP BY product_family
    ),
    previous_period AS (
      SELECT 
        product_family,
        COUNT(DISTINCT order_number) as previous_orders,
        SUM(product_service_quantity) as previous_units,
        SUM(product_service_amount) as previous_sales
      FROM analytics_mart.fct_order_line_items
      WHERE product_family IS NOT NULL
        AND order_date >= ${previousStart}
        AND order_date <= ${previousEnd}
        AND product_service_amount IS NOT NULL
        ${familyCondition}
      GROUP BY product_family
    )
    SELECT 
      COALESCE(c.product_family, p.product_family) as product_family,
      COALESCE(c.current_sales, 0) as current_period_sales,
      COALESCE(c.current_orders, 0) as current_period_orders,
      COALESCE(c.current_units, 0) as current_period_units,
      COALESCE(p.previous_sales, 0) as previous_period_sales,
      COALESCE(p.previous_orders, 0) as previous_period_orders,
      COALESCE(p.previous_units, 0) as previous_period_units
    FROM current_period c
    FULL OUTER JOIN previous_period p ON c.product_family = p.product_family
    WHERE COALESCE(c.product_family, p.product_family) IS NOT NULL
    ORDER BY COALESCE(c.current_sales, 0) DESC
  `);

  // Handle different return formats from Drizzle
  const results = familySalesData as unknown as Array<{
    product_family: string;
    current_period_sales: string;
    current_period_orders: number;
    current_period_units: string;
    previous_period_sales: string;
    previous_period_orders: number;
    previous_period_units: string;
  }>;

  return results.map(family => {
    const currentSales = Number(family.current_period_sales || 0);
    const previousSales = Number(family.previous_period_sales || 0);
    const currentOrders = Number(family.current_period_orders || 0);
    const previousOrders = Number(family.previous_period_orders || 0);
    const currentUnits = Number(family.current_period_units || 0);
    const previousUnits = Number(family.previous_period_units || 0);

    const salesGrowth = previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : 0;
    const orderGrowth = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;
    const unitsGrowth = previousUnits > 0 ? ((currentUnits - previousUnits) / previousUnits) * 100 : 0;

    return {
      productFamily: family.product_family,
      currentPeriodSales: currentSales.toFixed(2),
      currentPeriodOrders: currentOrders,
      currentPeriodUnits: currentUnits.toFixed(0),
      previousPeriodSales: previousSales.toFixed(2),
      previousPeriodOrders: previousOrders,
      previousPeriodUnits: previousUnits.toFixed(0),
      salesGrowth: parseFloat(salesGrowth.toFixed(1)),
      orderGrowth: parseFloat(orderGrowth.toFixed(1)),
      unitsGrowth: parseFloat(unitsGrowth.toFixed(1)),
    };
  });
}