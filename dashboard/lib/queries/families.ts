// ABOUTME: Product family sales analysis and comparison queries
// ABOUTME: Provides family-level sales metrics with period-over-period growth comparisons
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getDateRange, type ProductFilters, type FamilyFilters } from '@/lib/filter-utils';

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
    const currentSales = Number(family.current_period_sales);
    const previousSales = Number(family.previous_period_sales);
    const currentOrders = Number(family.current_period_orders);
    const previousOrders = Number(family.previous_period_orders);
    const currentUnits = Number(family.current_period_units);
    const previousUnits = Number(family.previous_period_units);

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

export interface FamilyDetail {
  familyName: string;
  totalRevenue: string;
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  averageOrderValue: string;
  topMaterialTypes: string[];
  periodRevenue: string;
  periodOrders: number;
  periodGrowth: number;
  customersTo50Percent: number;
  customersTo80Percent: number;
}

export interface FamilyProduct {
  itemName: string;
  salesDescription: string;
  materialType: string;
  salesPrice: string;
  periodRevenue: string;
  periodOrders: number;
  periodUnits: string;
  marginPercentage: string;
}

export interface FamilyCustomer {
  companyName: string;
  companyDomainKey: string;
  totalSpent: string;
  totalOrders: number;
  lastOrderDate: string;
  periodSpent: string;
  periodOrders: number;
}

// Get detailed family information and metrics
export async function getFamilyDetail(familyName: string, filters: FamilyFilters = {}): Promise<FamilyDetail | null> {
  const dateRange = getDateRange(filters.period || '1y', true);
  const currentStart = dateRange.start;
  const currentEnd = dateRange.end;
  const previousStart = dateRange.compareStart;
  const previousEnd = dateRange.compareEnd;

  // Build the query conditionally based on whether comparison period exists
  const familyDetailData = previousStart && previousEnd ? await db.execute(sql`
    WITH current_period AS (
      SELECT 
        COUNT(DISTINCT product_service) as total_products,
        COUNT(DISTINCT customer) as total_customers,
        COUNT(DISTINCT order_number) as total_orders,
        SUM(product_service_amount) as total_revenue,
        AVG(product_service_amount) as avg_order_value,
        ARRAY_AGG(DISTINCT material_type ORDER BY material_type) as material_types
      FROM analytics_mart.fct_order_line_items
      WHERE product_family = ${familyName}
        AND order_date >= ${currentStart}
        AND order_date <= ${currentEnd}
        AND product_service_amount IS NOT NULL
    ),
    previous_period AS (
      SELECT 
        SUM(product_service_amount) as previous_revenue,
        COUNT(DISTINCT order_number) as previous_orders
      FROM analytics_mart.fct_order_line_items
      WHERE product_family = ${familyName}
        AND order_date >= ${previousStart}
        AND order_date <= ${previousEnd}
        AND product_service_amount IS NOT NULL
    ),
    all_time AS (
      SELECT 
        SUM(product_service_amount) as all_time_revenue,
        COUNT(DISTINCT order_number) as all_time_orders
      FROM analytics_mart.fct_order_line_items
      WHERE product_family = ${familyName}
        AND product_service_amount IS NOT NULL
    ),
    customer_spending AS (
      SELECT 
        customer,
        SUM(product_service_amount) as period_spent
      FROM analytics_mart.fct_order_line_items
      WHERE product_family = ${familyName}
        AND order_date >= ${currentStart}
        AND order_date <= ${currentEnd}
        AND product_service_amount IS NOT NULL
      GROUP BY customer
    ),
    customer_concentration AS (
      SELECT 
        customer,
        period_spent,
        SUM(period_spent) OVER() as total_revenue,
        SUM(period_spent) OVER(ORDER BY period_spent DESC) as running_total,
        ROW_NUMBER() OVER(ORDER BY period_spent DESC) as customer_rank
      FROM customer_spending
    ),
    concentration_metrics AS (
      SELECT 
        MIN(CASE WHEN running_total >= total_revenue * 0.5 THEN customer_rank END) as customers_to_50,
        MIN(CASE WHEN running_total >= total_revenue * 0.8 THEN customer_rank END) as customers_to_80
      FROM customer_concentration
    )
    SELECT 
      c.total_products,
      c.total_customers,
      c.total_orders,
      c.total_revenue,
      c.avg_order_value,
      c.material_types,
      p.previous_revenue,
      p.previous_orders,
      a.all_time_revenue,
      a.all_time_orders,
      COALESCE(cm.customers_to_50, 0) as customers_to_50,
      COALESCE(cm.customers_to_80, 0) as customers_to_80
    FROM current_period c
    CROSS JOIN previous_period p
    CROSS JOIN all_time a
    CROSS JOIN concentration_metrics cm
  `) : await db.execute(sql`
    WITH current_period AS (
      SELECT 
        COUNT(DISTINCT product_service) as total_products,
        COUNT(DISTINCT customer) as total_customers,
        COUNT(DISTINCT order_number) as total_orders,
        SUM(product_service_amount) as total_revenue,
        AVG(product_service_amount) as avg_order_value,
        ARRAY_AGG(DISTINCT material_type ORDER BY material_type) as material_types
      FROM analytics_mart.fct_order_line_items
      WHERE product_family = ${familyName}
        AND order_date >= ${currentStart}
        AND order_date <= ${currentEnd}
        AND product_service_amount IS NOT NULL
    ),
    all_time AS (
      SELECT 
        SUM(product_service_amount) as all_time_revenue,
        COUNT(DISTINCT order_number) as all_time_orders
      FROM analytics_mart.fct_order_line_items
      WHERE product_family = ${familyName}
        AND product_service_amount IS NOT NULL
    ),
    customer_spending AS (
      SELECT 
        customer,
        SUM(product_service_amount) as period_spent
      FROM analytics_mart.fct_order_line_items
      WHERE product_family = ${familyName}
        AND order_date >= ${currentStart}
        AND order_date <= ${currentEnd}
        AND product_service_amount IS NOT NULL
      GROUP BY customer
    ),
    customer_concentration AS (
      SELECT 
        customer,
        period_spent,
        SUM(period_spent) OVER() as total_revenue,
        SUM(period_spent) OVER(ORDER BY period_spent DESC) as running_total,
        ROW_NUMBER() OVER(ORDER BY period_spent DESC) as customer_rank
      FROM customer_spending
    ),
    concentration_metrics AS (
      SELECT 
        MIN(CASE WHEN running_total >= total_revenue * 0.5 THEN customer_rank END) as customers_to_50,
        MIN(CASE WHEN running_total >= total_revenue * 0.8 THEN customer_rank END) as customers_to_80
      FROM customer_concentration
    )
    SELECT 
      c.total_products,
      c.total_customers,
      c.total_orders,
      c.total_revenue,
      c.avg_order_value,
      c.material_types,
      0 as previous_revenue,
      0 as previous_orders,
      a.all_time_revenue,
      a.all_time_orders,
      COALESCE(cm.customers_to_50, 0) as customers_to_50,
      COALESCE(cm.customers_to_80, 0) as customers_to_80
    FROM current_period c
    CROSS JOIN all_time a
    CROSS JOIN concentration_metrics cm
  `);

  const results = familyDetailData as unknown as Array<{
    total_products: number;
    total_customers: number;
    total_orders: number;
    total_revenue: string;
    avg_order_value: string;
    material_types: string[];
    previous_revenue: string;
    previous_orders: number;
    all_time_revenue: string;
    all_time_orders: number;
    customers_to_50: number;
    customers_to_80: number;
  }>;

  if (results.length === 0) return null;

  const result = results[0];
  const currentRevenue = Number(result.total_revenue || 0);
  const previousRevenue = Number(result.previous_revenue || 0);
  const periodGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  return {
    familyName,
    totalRevenue: Number(result.all_time_revenue || 0).toFixed(2),
    totalProducts: result.total_products || 0,
    totalCustomers: result.total_customers || 0,
    totalOrders: result.all_time_orders || 0,
    averageOrderValue: Number(result.avg_order_value || 0).toFixed(2),
    topMaterialTypes: result.material_types || [],
    periodRevenue: currentRevenue.toFixed(2),
    periodOrders: result.total_orders || 0,
    periodGrowth: parseFloat(periodGrowth.toFixed(1)),
    customersTo50Percent: result.customers_to_50 || 0,
    customersTo80Percent: result.customers_to_80 || 0,
  };
}

// Get products within a family
export async function getFamilyProducts(familyName: string, filters: FamilyFilters = {}): Promise<FamilyProduct[]> {
  const dateRange = getDateRange(filters.period || '1y');
  const currentStart = dateRange.start;
  const currentEnd = dateRange.end;

  // Build search condition
  const searchCondition = filters.search
    ? sql`AND (LOWER(product_service) LIKE LOWER(${'%' + filters.search + '%'}) OR LOWER(product_service_description) LIKE LOWER(${'%' + filters.search + '%'}))`
    : sql``;

  // Build material type condition
  const materialTypeCondition = filters.materialType
    ? sql`AND material_type = ${filters.materialType}`
    : sql``;

  const familyProductsData = await db.execute(sql`
    WITH period_metrics AS (
      SELECT 
        product_service,
        MAX(product_service_description) as product_service_description,
        MAX(material_type) as material_type,
        AVG(product_service_rate) as avg_price,
        SUM(product_service_amount) as period_revenue,
        COUNT(DISTINCT order_number) as period_orders,
        SUM(product_service_quantity) as period_units
      FROM analytics_mart.fct_order_line_items
      WHERE product_family = ${familyName}
        AND order_date >= ${currentStart}
        AND order_date <= ${currentEnd}
        AND product_service_amount IS NOT NULL
        ${searchCondition}
        ${materialTypeCondition}
      GROUP BY product_service
    ),
    product_costs AS (
      SELECT 
        item_name,
        MAX(sales_price) as sales_price,
        MAX(purchase_cost) as purchase_cost,
        MAX(margin_percentage) as margin_percentage
      FROM analytics_mart.fct_products
      WHERE product_family = ${familyName}
      GROUP BY item_name
    )
    SELECT 
      p.product_service,
      p.product_service_description,
      p.material_type,
      COALESCE(pc.sales_price, p.avg_price) as sales_price,
      p.period_revenue,
      p.period_orders,
      p.period_units,
      COALESCE(pc.margin_percentage, 0) as margin_percentage
    FROM period_metrics p
    LEFT JOIN product_costs pc ON p.product_service = pc.item_name
    ORDER BY p.period_revenue DESC
    LIMIT 50
  `);

  const results = familyProductsData as unknown as Array<{
    product_service: string;
    product_service_description: string;
    material_type: string;
    sales_price: string;
    period_revenue: string;
    period_orders: number;
    period_units: string;
    margin_percentage: string;
  }>;

  return results.map(product => ({
    itemName: product.product_service || 'Unknown',
    salesDescription: product.product_service_description || '',
    materialType: product.material_type || 'Unknown',
    salesPrice: Number(product.sales_price || 0).toFixed(2),
    periodRevenue: Number(product.period_revenue || 0).toFixed(2),
    periodOrders: product.period_orders || 0,
    periodUnits: Number(product.period_units || 0).toFixed(0),
    marginPercentage: Number(product.margin_percentage || 0).toFixed(1),
  }));
}

// Get top customers for a family
export async function getFamilyTopCustomers(familyName: string, filters: FamilyFilters = {}): Promise<FamilyCustomer[]> {
  // Map period filter to DBT period types
  const periodMapping: Record<string, string> = {
    '7d': 'trailing_30d',    // Use 30d as closest available
    '30d': 'trailing_30d',
    '90d': 'trailing_90d', 
    '1y': 'trailing_1y',
    'all': 'all_time'
  };
  
  const period = filters.period || '1y';
  const periodType = periodMapping[period] || 'trailing_1y';

  const familyCustomersData = await db.execute(sql`
    WITH family_spending AS (
      SELECT 
        mart.company_domain_key,
        mart.company_name,
        SUM(mart.total_amount_spent) as period_spent,
        SUM(mart.total_transactions) as period_orders,
        MAX(mart.last_purchase_date) as last_order_date
      FROM analytics_mart.mart_product_company_period_spending mart
      JOIN analytics_mart.fct_products prod ON mart.product_service = prod.item_name
      WHERE prod.product_family = ${familyName}
        AND mart.period_type = ${periodType}
      GROUP BY mart.company_domain_key, mart.company_name
    ),
    all_time_spending AS (
      SELECT 
        mart.company_domain_key,
        SUM(mart.total_amount_spent) as total_spent,
        SUM(mart.total_transactions) as total_orders
      FROM analytics_mart.mart_product_company_period_spending mart
      JOIN analytics_mart.fct_products prod ON mart.product_service = prod.item_name
      WHERE prod.product_family = ${familyName}
        AND mart.period_type = 'all_time'
      GROUP BY mart.company_domain_key
    )
    SELECT 
      fs.company_name,
      fs.company_domain_key,
      COALESCE(ats.total_spent, 0) as total_spent,
      COALESCE(ats.total_orders, 0) as total_orders,
      fs.last_order_date,
      fs.period_spent,
      fs.period_orders
    FROM family_spending fs
    LEFT JOIN all_time_spending ats ON fs.company_domain_key = ats.company_domain_key
    ORDER BY fs.period_spent DESC
    LIMIT 20
  `);

  const results = familyCustomersData as unknown as Array<{
    company_name: string;
    company_domain_key: string;
    total_spent: string;
    total_orders: number;
    last_order_date: string;
    period_spent: string;
    period_orders: number;
  }>;

  return results.map(customer => ({
    companyName: customer.company_name || 'Unknown',
    companyDomainKey: customer.company_domain_key,
    totalSpent: Number(customer.total_spent || 0).toFixed(2),
    totalOrders: customer.total_orders || 0,
    lastOrderDate: customer.last_order_date || '',
    periodSpent: Number(customer.period_spent || 0).toFixed(2),
    periodOrders: customer.period_orders || 0,
  }));
}