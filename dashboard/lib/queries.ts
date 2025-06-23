import { db, fctOrdersInAnalyticsMart, fctProductsInAnalyticsMart, fctInventoryHistoryInAnalyticsMart, fctOrderLineItemsInAnalyticsMart, fctCompaniesInAnalyticsMart, bridgeCustomerCompanyInAnalyticsMart, fctCompanyOrdersInAnalyticsMart, fctCompanyProductsInAnalyticsMart, dimCompanyHealthInAnalyticsMart } from '@/lib/db';
import { desc, asc, gte, lte, sql, count, sum, avg, and, notInArray } from 'drizzle-orm';
import { format } from 'date-fns';
import { getDateRange, type ProductFilters, type DashboardFilters } from '@/lib/filter-utils';

export interface DashboardMetrics {
  sales365Days: string;
  totalRevenue: string;
  totalOrders: number;
  averageOrderValue: string;
  previousPeriodRevenue: string;
  previousPeriodOrders: number;
  revenueGrowth: number;
  orderGrowth: number;
  sales365DaysGrowth: number;
}

export interface RecentOrder {
  orderNumber: string;
  customer: string;
  orderDate: string;
  totalAmount: string;
  status: string;
  isPaid: boolean;
}

export interface WeeklyRevenue {
  date: string;
  revenue: string;
  orderCount: number;
}

export interface OrderDetail {
  orderNumber: string;
  customer: string;
  orderDate: string;
  dueDate: string | null;
  shipDate: string | null;
  totalAmount: string;
  totalLineItemsAmount: string | null;
  totalTax: string | null;
  effectiveTaxRate: string | null;
  status: string;
  isPaid: boolean;
  paymentMethod: string | null;
  shippingMethod: string | null;
  salesRep: string | null;
  currency: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
}

export interface OrderLineItem {
  lineItemId: string;
  productService: string;
  productServiceDescription: string;
  quantity: string;
  rate: string;
  amount: string;
  unitOfMeasure: string | null;
  productFamily: string | null;
  materialType: string | null;
  marginPercentage: string | null;
  marginAmount: string | null;
}

export interface OrderTableItem {
  orderNumber: string;
  customer: string;
  orderDate: string;
  totalAmount: string;
  status: string;
  isPaid: boolean;
  dueDate: string | null;
  shipDate: string | null;
}

export interface OrdersResponse {
  orders: OrderTableItem[];
  totalCount: number;
}

export interface SalesPeriodMetric {
  period_start: string;
  period_end: string;
  total_revenue: string;
  order_count: string;
}

export interface SalesChannelMetric {
  sales_channel: string;
  periods: SalesPeriodMetric[];
}

// Get dashboard metrics with flexible period comparison
export async function getDashboardMetrics(filters: DashboardFilters = {}): Promise<DashboardMetrics> {
  const currentDateRange = getDateRange(filters.period || '30d', true);
  const currentStart = currentDateRange.start;
  const currentEnd = currentDateRange.end;
  const previousStart = currentDateRange.compareStart!;
  const previousEnd = currentDateRange.compareEnd!;

  // Calculate 365 day periods (for 365 day sales card)
  const yearDateRange = getDateRange('1y', true);
  const yearStart = yearDateRange.start;
  const yearEnd = yearDateRange.end;
  const previousYearStart = yearDateRange.compareStart!;
  const previousYearEnd = yearDateRange.compareEnd!;

  // 365 day sales - only paid orders 
  const sales365 = await db
    .select({
      totalSales: sum(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, yearStart),
        lte(fctOrdersInAnalyticsMart.orderDate, yearEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`,
        sql`${fctOrdersInAnalyticsMart.isPaid} = true`
      )
    );

  // Previous 365 day sales - only paid orders
  const previousSales365 = await db
    .select({
      totalSales: sum(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, previousYearStart),
        lte(fctOrdersInAnalyticsMart.orderDate, previousYearEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`,
        sql`${fctOrdersInAnalyticsMart.isPaid} = true`
      )
    );

  // Current period (based on selected period)
  const currentPeriod = await db
    .select({
      totalRevenue: sum(fctOrdersInAnalyticsMart.totalAmount),
      totalOrders: count(),
      averageOrderValue: avg(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, currentStart),
        lte(fctOrdersInAnalyticsMart.orderDate, currentEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    );

  // Previous period (comparison period)
  const previousPeriod = await db
    .select({
      totalRevenue: sum(fctOrdersInAnalyticsMart.totalAmount),
      totalOrders: count(),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, previousStart),
        lte(fctOrdersInAnalyticsMart.orderDate, previousEnd),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    );

  const current = currentPeriod[0];
  const previous = previousPeriod[0];

  const currentRevenue = Number(current.totalRevenue || 0);
  const previousRevenue = Number(previous.totalRevenue || 0);
  const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  
  const orderGrowth = previous.totalOrders > 0 ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100 : 0;

  const current365Sales = Number(sales365[0].totalSales || 0);
  const previous365Sales = Number(previousSales365[0].totalSales || 0);
  const sales365Growth = previous365Sales > 0 ? ((current365Sales - previous365Sales) / previous365Sales) * 100 : 0;

  return {
    sales365Days: current365Sales.toFixed(2),
    totalRevenue: currentRevenue.toFixed(2),
    totalOrders: current.totalOrders,
    averageOrderValue: Number(current.averageOrderValue || 0).toFixed(2),
    previousPeriodRevenue: previousRevenue.toFixed(2),
    previousPeriodOrders: previous.totalOrders,
    revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
    orderGrowth: parseFloat(orderGrowth.toFixed(1)),
    sales365DaysGrowth: parseFloat(sales365Growth.toFixed(1)),
  };
}

// Get recent orders
export async function getRecentOrders(limit: number = 20): Promise<RecentOrder[]> {
  const orders = await db
    .select({
      orderNumber: fctOrdersInAnalyticsMart.orderNumber,
      customer: fctOrdersInAnalyticsMart.customer,
      orderDate: fctOrdersInAnalyticsMart.orderDate,
      totalAmount: fctOrdersInAnalyticsMart.totalAmount,
      status: fctOrdersInAnalyticsMart.status,
      isPaid: fctOrdersInAnalyticsMart.isPaid,
    })
    .from(fctOrdersInAnalyticsMart)
    .where(sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`)
    .orderBy(desc(fctOrdersInAnalyticsMart.orderDate))
    .limit(limit);

  return orders.map(order => ({
    orderNumber: order.orderNumber || 'N/A',
    customer: order.customer || 'Unknown',
    orderDate: order.orderDate as string,
    totalAmount: Number(order.totalAmount || 0).toFixed(2),
    status: order.status!,
    isPaid: order.isPaid!,
  }));
}

// Get single order by order number
export async function getOrderByNumber(orderNumber: string): Promise<OrderDetail | null> {
  const orders = await db
    .select({
      orderNumber: fctOrdersInAnalyticsMart.orderNumber,
      customer: fctOrdersInAnalyticsMart.customer,
      orderDate: fctOrdersInAnalyticsMart.orderDate,
      dueDate: fctOrdersInAnalyticsMart.dueDate,
      shipDate: fctOrdersInAnalyticsMart.shipDate,
      totalAmount: fctOrdersInAnalyticsMart.totalAmount,
      totalLineItemsAmount: fctOrdersInAnalyticsMart.totalLineItemsAmount,
      totalTax: fctOrdersInAnalyticsMart.totalTax,
      effectiveTaxRate: fctOrdersInAnalyticsMart.effectiveTaxRate,
      status: fctOrdersInAnalyticsMart.status,
      isPaid: fctOrdersInAnalyticsMart.isPaid,
      paymentMethod: fctOrdersInAnalyticsMart.paymentMethod,
      shippingMethod: fctOrdersInAnalyticsMart.shippingMethod,
      salesRep: fctOrdersInAnalyticsMart.salesRep,
      currency: fctOrdersInAnalyticsMart.currency,
      billingAddress: fctOrdersInAnalyticsMart.billingAddress,
      shippingAddress: fctOrdersInAnalyticsMart.shippingAddress,
    })
    .from(fctOrdersInAnalyticsMart)
    .where(sql`${fctOrdersInAnalyticsMart.orderNumber} = ${orderNumber}`)
    .limit(1);

  if (orders.length === 0) {
    return null;
  }

  const order = orders[0];
  return {
    orderNumber: order.orderNumber || 'N/A',
    customer: order.customer || 'Unknown',
    orderDate: order.orderDate as string,
    dueDate: order.dueDate as string | null,
    shipDate: order.shipDate as string | null,
    totalAmount: Number(order.totalAmount || 0).toFixed(2),
    totalLineItemsAmount: order.totalLineItemsAmount ? Number(order.totalLineItemsAmount).toFixed(2) : null,
    totalTax: order.totalTax ? Number(order.totalTax).toFixed(2) : null,
    effectiveTaxRate: order.effectiveTaxRate ? Number(order.effectiveTaxRate).toFixed(4) : null,
    status: order.status || 'Unknown',
    isPaid: order.isPaid || false,
    paymentMethod: order.paymentMethod,
    shippingMethod: order.shippingMethod,
    salesRep: order.salesRep,
    currency: order.currency,
    billingAddress: order.billingAddress,
    shippingAddress: order.shippingAddress,
  };
}

// Get order line items by order number
export async function getOrderLineItems(orderNumber: string): Promise<OrderLineItem[]> {
  const lineItems = await db
    .select({
      lineItemId: fctOrderLineItemsInAnalyticsMart.lineItemId,
      productService: fctOrderLineItemsInAnalyticsMart.productService,
      productServiceDescription: fctOrderLineItemsInAnalyticsMart.productServiceDescription,
      productServiceQuantity: fctOrderLineItemsInAnalyticsMart.productServiceQuantity,
      productServiceRate: fctOrderLineItemsInAnalyticsMart.productServiceRate,
      productServiceAmount: fctOrderLineItemsInAnalyticsMart.productServiceAmount,
      unitOfMeasure: fctOrderLineItemsInAnalyticsMart.unitOfMeasure,
      productFamily: fctOrderLineItemsInAnalyticsMart.productFamily,
      materialType: fctOrderLineItemsInAnalyticsMart.materialType,
      marginPercentage: fctOrderLineItemsInAnalyticsMart.marginPercentage,
      marginAmount: fctOrderLineItemsInAnalyticsMart.marginAmount,
    })
    .from(fctOrderLineItemsInAnalyticsMart)
    .where(sql`${fctOrderLineItemsInAnalyticsMart.orderNumber} = ${orderNumber}`)
    .orderBy(fctOrderLineItemsInAnalyticsMart.lineItemId);

  return lineItems.map(item => ({
    lineItemId: item.lineItemId || 'N/A',
    productService: item.productService || 'Unknown',
    productServiceDescription: item.productServiceDescription || '',
    quantity: Number(item.productServiceQuantity || 0).toFixed(2),
    rate: Number(item.productServiceRate || 0).toFixed(2),
    amount: Number(item.productServiceAmount || 0).toFixed(2),
    unitOfMeasure: item.unitOfMeasure,
    productFamily: item.productFamily,
    materialType: item.materialType,
    marginPercentage: item.marginPercentage ? Number(item.marginPercentage).toFixed(1) : null,
    marginAmount: item.marginAmount ? Number(item.marginAmount).toFixed(2) : null,
  }));
}

// Get all orders with pagination, sorting, and search
export async function getAllOrders(
  page: number = 1,
  limit: number = 25,
  searchTerm: string = '',
  sortBy: string = 'orderDate',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<OrdersResponse> {
  const offset = (page - 1) * limit;
  
  // Build the where clause
  let whereClause = sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`;
  
  if (searchTerm) {
    whereClause = and(
      whereClause,
      sql`(${fctOrdersInAnalyticsMart.orderNumber} ILIKE ${`%${searchTerm}%`} OR ${fctOrdersInAnalyticsMart.customer} ILIKE ${`%${searchTerm}%`})`
    )!;
  }

  // Build the order clause
  let orderClause;
  if (sortBy === 'orderDate') {
    orderClause = sortOrder === 'desc' ? desc(fctOrdersInAnalyticsMart.orderDate) : asc(fctOrdersInAnalyticsMart.orderDate);
  } else if (sortBy === 'totalAmount') {
    orderClause = sortOrder === 'desc' ? desc(fctOrdersInAnalyticsMart.totalAmount) : asc(fctOrdersInAnalyticsMart.totalAmount);
  } else if (sortBy === 'customer') {
    orderClause = sortOrder === 'desc' ? desc(fctOrdersInAnalyticsMart.customer) : asc(fctOrdersInAnalyticsMart.customer);
  } else if (sortBy === 'orderNumber') {
    orderClause = sortOrder === 'desc' ? desc(fctOrdersInAnalyticsMart.orderNumber) : asc(fctOrdersInAnalyticsMart.orderNumber);
  } else {
    orderClause = desc(fctOrdersInAnalyticsMart.orderDate); // default
  }

  // Get the orders
  const orders = await db
    .select({
      orderNumber: fctOrdersInAnalyticsMart.orderNumber,
      customer: fctOrdersInAnalyticsMart.customer,
      orderDate: fctOrdersInAnalyticsMart.orderDate,
      totalAmount: fctOrdersInAnalyticsMart.totalAmount,
      status: fctOrdersInAnalyticsMart.status,
      isPaid: fctOrdersInAnalyticsMart.isPaid,
      dueDate: fctOrdersInAnalyticsMart.dueDate,
      shipDate: fctOrdersInAnalyticsMart.shipDate,
    })
    .from(fctOrdersInAnalyticsMart)
    .where(whereClause)
    .orderBy(orderClause)
    .limit(limit)
    .offset(offset);

  // Get the total count for pagination
  const countResult = await db
    .select({ count: count() })
    .from(fctOrdersInAnalyticsMart)
    .where(whereClause);

  const totalCount = countResult[0].count;

  return {
    orders: orders.map(order => ({
      orderNumber: order.orderNumber || 'N/A',
      customer: order.customer || 'Unknown',
      orderDate: order.orderDate as string,
      totalAmount: Number(order.totalAmount || 0).toFixed(2),
      status: order.status || 'Unknown',
      isPaid: order.isPaid || false,
      dueDate: order.dueDate as string | null,
      shipDate: order.shipDate as string | null,
    })),
    totalCount,
  };
}

// Get channel metrics with 4-year trailing trends
export async function getChannelMetrics(): Promise<SalesChannelMetric[]> {
  const today = new Date();
  const fourYearsAgo = new Date();
  fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
  
  // Generate 4 trailing year periods from today
  const periods = [];
  for (let i = 0; i < 4; i++) {
    const periodEnd = new Date(today);
    periodEnd.setFullYear(periodEnd.getFullYear() - i);
    
    const periodStart = new Date(periodEnd);
    periodStart.setFullYear(periodStart.getFullYear() - 1);
    periodStart.setDate(periodStart.getDate() + 1); // Start day after to avoid overlap
    
    periods.push({
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      period_label: `${periodStart.getFullYear()}-${periodEnd.getFullYear()}`
    });
  }
  
  const channelMap = new Map<string, SalesPeriodMetric[]>();
  
  // Query each period separately to get trailing year data
  for (const period of periods) {
    const channelData = await db.execute(sql`
      SELECT 
        class as sales_channel,
        SUM(total_amount) as total_revenue,
        COUNT(*) as order_count
      FROM analytics_mart.fct_orders 
      WHERE total_amount IS NOT NULL 
        AND order_date >= ${period.period_start}
        AND order_date <= ${period.period_end}
        AND class IS NOT NULL 
        AND class != ''
        AND class NOT IN ('Contractor', 'EXPORT from WWD')
      GROUP BY class
      ORDER BY class
    `);

    // Handle different return formats from Drizzle
    const results = channelData as unknown as Array<{ 
      sales_channel: string; 
      total_revenue: string; 
      order_count: number;
    }>;
    
    results.forEach(row => {
      const channel = row.sales_channel;
      
      if (!channelMap.has(channel)) {
        channelMap.set(channel, []);
      }
      
      channelMap.get(channel)!.push({
        period_start: period.period_start,
        period_end: period.period_end,
        total_revenue: Number(row.total_revenue || 0).toFixed(2),
        order_count: row.order_count.toString(),
      });
    });
  }

  // Convert to final format and ensure periods are in reverse chronological order (most recent first)
  return Array.from(channelMap.entries()).map(([sales_channel, periods]) => ({
    sales_channel,
    periods: periods.sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime()),
  }));
}

// Get revenue trend for specified period with appropriate granularity
export async function getWeeklyRevenue(filters: DashboardFilters = {}): Promise<WeeklyRevenue[]> {
  const period = filters.period || '30d';
  
  // Use the actual selected period for data range
  const dateRange = getDateRange(period, false);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  // Determine appropriate grouping based on period length
  let dateGrouping: string;
  switch (period) {
    case '7d':
      dateGrouping = 'day'; // Daily granularity for 7 days
      break;
    case '30d':
      dateGrouping = 'week'; // Weekly granularity for 30 days
      break;
    case '90d':
      dateGrouping = 'week'; // Weekly granularity for 90 days
      break;
    case '1y':
      dateGrouping = 'month'; // Monthly granularity for 1 year
      break;
    default:
      dateGrouping = 'week';
  }

  const revenueData = await db.execute(sql`
    SELECT 
      DATE_TRUNC('${sql.raw(dateGrouping)}', order_date) as period_start,
      SUM(total_amount) as revenue,
      COUNT(*) as order_count
    FROM analytics_mart.fct_orders
    WHERE order_date >= ${startDate}
      AND order_date <= ${endDate}
      AND total_amount IS NOT NULL
    GROUP BY DATE_TRUNC('${sql.raw(dateGrouping)}', order_date)
    ORDER BY period_start
  `);

  // Handle different return formats from Drizzle
  const results = revenueData as unknown as Array<{ period_start: string; revenue: string; order_count: number }>;
  
  return results.map(period => ({
    date: period.period_start,
    revenue: Number(period.revenue || 0).toFixed(2),
    orderCount: Number(period.order_count || 0),
  }));
}

// Get monthly revenue for a specific product (all time)
export async function getProductMonthlyRevenue(itemName: string): Promise<WeeklyRevenue[]> {
  const monthlyData = await db.execute(sql`
    SELECT 
      DATE_TRUNC('month', order_date) as month_start,
      SUM(product_service_amount) as revenue,
      COUNT(DISTINCT order_number) as order_count
    FROM analytics_mart.fct_order_line_items
    WHERE product_service_amount IS NOT NULL
      AND product_service = ${itemName}
    GROUP BY DATE_TRUNC('month', order_date)
    ORDER BY month_start
  `);

  // Handle different return formats from Drizzle
  const results = monthlyData as unknown as Array<{ month_start: string; revenue: string; order_count: number }>;
  
  return results.map(month => ({
    date: month.month_start,
    revenue: Number(month.revenue || 0).toFixed(2),
    orderCount: Number(month.order_count || 0),
  }));
}

// Get order status breakdown
export async function getOrderStatusBreakdown() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

  return await db
    .select({
      status: fctOrdersInAnalyticsMart.status,
      count: count(),
      totalAmount: sum(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, thirtyDaysAgoStr),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    )
    .groupBy(fctOrdersInAnalyticsMart.status)
    .orderBy(desc(count()));
}

// Product interfaces and queries
export interface ProductMetrics {
  totalProducts: number;
  averageMargin: string;
  totalInventoryValue: string;
  kitProducts: number;
  averageSalesPrice: string;
  averagePurchaseCost: string;
  marginGrowth: number;
}

export interface Product {
  quickBooksInternalId: string;
  itemName: string;
  salesDescription: string;
  productFamily: string;
  materialType: string;
  salesPrice: string;
  purchaseCost: string;
  marginPercentage: string;
  marginAmount: string;
  isKit: boolean;
  itemType: string;
  periodSales: string;
  periodUnits: number;
  periodOrders: number;
}


// Get product metrics
export async function getProductMetrics(): Promise<ProductMetrics> {
  // Get basic product metrics
  const productMetrics = await db
    .select({
      totalProducts: count(),
      averageMargin: avg(fctProductsInAnalyticsMart.marginPercentage),
      kitProducts: sql<number>`count(case when ${fctProductsInAnalyticsMart.isKit} = true then 1 end)`,
      averageSalesPrice: avg(fctProductsInAnalyticsMart.salesPrice),
      averagePurchaseCost: avg(fctProductsInAnalyticsMart.purchaseCost),
    })
    .from(fctProductsInAnalyticsMart)
    .where(and(
      sql`${fctProductsInAnalyticsMart.salesPrice} is not null`,
      notInArray(fctProductsInAnalyticsMart.itemType, ['NonInventory', 'OtherCharge'])
    ));

  // Get actual inventory value based on quantities on hand
  const inventoryValue = await db.execute(sql`
    SELECT 
      COALESCE(SUM(inventory_value_at_sales_price::numeric), 0) as total_inventory_value
    FROM analytics_mart.fct_inventory_history 
    WHERE inventory_date = (SELECT MAX(inventory_date) FROM analytics_mart.fct_inventory_history)
      AND inventory_value_at_sales_price IS NOT NULL
  `);

  const productResult = productMetrics[0];
  const inventoryResult = inventoryValue as unknown as Array<{ total_inventory_value: string }>;

  return {
    totalProducts: productResult.totalProducts,
    averageMargin: Number(productResult.averageMargin || 0).toFixed(1),
    totalInventoryValue: Number(inventoryResult[0]?.total_inventory_value || 0).toFixed(2),
    kitProducts: productResult.kitProducts,
    averageSalesPrice: Number(productResult.averageSalesPrice || 0).toFixed(2),
    averagePurchaseCost: Number(productResult.averagePurchaseCost || 0).toFixed(2),
    marginGrowth: 0, // TODO: Calculate based on historical data when available
  };
}

// Get product list with sales data for specified period
export async function getProducts(limit: number = 50, filters?: ProductFilters): Promise<Product[]> {
  const dateRange = getDateRange(filters?.period || '1y', false);
  const startDate = dateRange.start;

  const productsWithSales = await db.execute(sql`
    SELECT 
      p.quick_books_internal_id,
      p.item_name,
      p.sales_description,
      p.product_family,
      p.material_type,
      p.sales_price,
      p.purchase_cost,
      p.margin_percentage,
      p.margin_amount,
      p.is_kit,
      p.item_type,
      COALESCE(sales.total_sales, 0) as period_sales,
      COALESCE(sales.total_units, 0) as period_units,
      COALESCE(sales.order_count, 0) as period_orders
    FROM analytics_mart.fct_products p
    LEFT JOIN (
      SELECT 
        product_service,
        SUM(product_service_amount) as total_sales,
        SUM(product_service_quantity) as total_units,
        COUNT(DISTINCT order_number) as order_count
      FROM analytics_mart.fct_order_line_items 
      WHERE order_date >= ${startDate}
        AND product_service_amount IS NOT NULL
        AND product_service IS NOT NULL
        AND product_service != 'Shipping'
      GROUP BY product_service
    ) sales ON p.item_name = sales.product_service
    WHERE p.sales_price IS NOT NULL
      AND p.item_type NOT IN ('NonInventory', 'OtherCharge')
    ORDER BY period_sales DESC NULLS LAST
    LIMIT ${limit}
  `);

  // Handle different return formats from Drizzle
  const results = productsWithSales as unknown as Array<{
    quick_books_internal_id: string;
    item_name: string;
    sales_description: string;
    product_family: string;
    material_type: string;
    sales_price: string;
    purchase_cost: string;
    margin_percentage: string;
    margin_amount: string;
    is_kit: boolean;
    item_type: string;
    period_sales: string;
    period_units: string;
    period_orders: number;
  }>;

  return results.map(product => ({
    quickBooksInternalId: product.quick_books_internal_id || 'N/A',
    itemName: product.item_name || 'Unknown',
    salesDescription: product.sales_description || '',
    productFamily: product.product_family || 'Other',
    materialType: product.material_type || 'Unknown',
    salesPrice: Number(product.sales_price || 0).toFixed(2),
    purchaseCost: Number(product.purchase_cost || 0).toFixed(2),
    marginPercentage: Number(product.margin_percentage || 0).toFixed(1),
    marginAmount: Number(product.margin_amount || 0).toFixed(2),
    isKit: product.is_kit || false,
    itemType: product.item_type || 'Unknown',
    periodSales: Number(product.period_sales || 0).toFixed(2),
    periodUnits: Math.floor(Number(product.period_units || 0)),
    periodOrders: Number(product.period_orders || 0),
  }));
}

// Get single product by name with trailing year sales data
export async function getProductByName(itemName: string): Promise<Product | null> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const startDate = format(oneYearAgo, 'yyyy-MM-dd');

  const productWithSales = await db.execute(sql`
    SELECT 
      p.quick_books_internal_id,
      p.item_name,
      p.sales_description,
      p.product_family,
      p.material_type,
      p.sales_price,
      p.purchase_cost,
      p.margin_percentage,
      p.margin_amount,
      p.is_kit,
      p.item_type,
      COALESCE(sales.total_sales, 0) as period_sales,
      COALESCE(sales.total_units, 0) as period_units,
      COALESCE(sales.order_count, 0) as period_orders
    FROM analytics_mart.fct_products p
    LEFT JOIN (
      SELECT 
        product_service,
        SUM(product_service_amount) as total_sales,
        SUM(product_service_quantity) as total_units,
        COUNT(DISTINCT order_number) as order_count
      FROM analytics_mart.fct_order_line_items 
      WHERE order_date >= ${startDate}
        AND product_service_amount IS NOT NULL
        AND product_service IS NOT NULL
        AND product_service != 'Shipping'
      GROUP BY product_service
    ) sales ON p.item_name = sales.product_service
    WHERE p.item_name = ${itemName}
    LIMIT 1
  `);

  // Handle different return formats from Drizzle
  const results = productWithSales as unknown as Array<{
    quick_books_internal_id: string;
    item_name: string;
    sales_description: string;
    product_family: string;
    material_type: string;
    sales_price: string;
    purchase_cost: string;
    margin_percentage: string;
    margin_amount: string;
    is_kit: boolean;
    item_type: string;
    period_sales: string;
    period_units: string;
    period_orders: number;
  }>;

  if (results.length === 0) {
    return null;
  }

  const product = results[0];
  return {
    quickBooksInternalId: product.quick_books_internal_id || 'N/A',
    itemName: product.item_name || 'Unknown',
    salesDescription: product.sales_description || '',
    productFamily: product.product_family || 'Other',
    materialType: product.material_type || 'Unknown',
    salesPrice: Number(product.sales_price || 0).toFixed(2),
    purchaseCost: Number(product.purchase_cost || 0).toFixed(2),
    marginPercentage: Number(product.margin_percentage || 0).toFixed(1),
    marginAmount: Number(product.margin_amount || 0).toFixed(2),
    isKit: product.is_kit || false,
    itemType: product.item_type || 'Unknown',
    periodSales: Number(product.period_sales || 0).toFixed(2),
    periodUnits: Math.floor(Number(product.period_units || 0)),
    periodOrders: Number(product.period_orders || 0),
  };
}


// Inventory interfaces and queries
export interface InventorySnapshot {
  itemName: string;
  inventoryDate: string;
  quantityOnHand: string;
  quantityOnOrder: string;
  quantityOnSalesOrder: string;
  availableQuantity: string;
  totalInventoryVisibility: string;
  quantityChange: string;
  previousQuantityOnHand: string;
  inventoryValueAtCost: string;
  inventoryValueAtSalesPrice: string;
  itemStatus: string;
  isBackup: boolean;
}

export interface InventoryTrend {
  date: string;
  quantityOnHand: string;
  quantityChange: string;
  inventoryValueAtCost: string;
}

// Get current inventory status for a product
export async function getProductInventoryStatus(itemName: string): Promise<InventorySnapshot | null> {
  const inventory = await db
    .select({
      itemName: fctInventoryHistoryInAnalyticsMart.itemName,
      inventoryDate: fctInventoryHistoryInAnalyticsMart.inventoryDate,
      quantityOnHand: fctInventoryHistoryInAnalyticsMart.quantityOnHand,
      quantityOnOrder: fctInventoryHistoryInAnalyticsMart.quantityOnOrder,
      quantityOnSalesOrder: fctInventoryHistoryInAnalyticsMart.quantityOnSalesOrder,
      availableQuantity: fctInventoryHistoryInAnalyticsMart.availableQuantity,
      totalInventoryVisibility: fctInventoryHistoryInAnalyticsMart.totalInventoryVisibility,
      quantityChange: fctInventoryHistoryInAnalyticsMart.quantityChange,
      previousQuantityOnHand: fctInventoryHistoryInAnalyticsMart.previousQuantityOnHand,
      inventoryValueAtCost: fctInventoryHistoryInAnalyticsMart.inventoryValueAtCost,
      inventoryValueAtSalesPrice: fctInventoryHistoryInAnalyticsMart.inventoryValueAtSalesPrice,
      itemStatus: fctInventoryHistoryInAnalyticsMart.itemStatus,
      isBackup: fctInventoryHistoryInAnalyticsMart.isBackup,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(sql`${fctInventoryHistoryInAnalyticsMart.itemName} = ${itemName}`)
    .orderBy(desc(fctInventoryHistoryInAnalyticsMart.inventoryDate))
    .limit(1);

  if (inventory.length === 0) {
    return null;
  }

  const item = inventory[0];
  return {
    itemName: item.itemName || 'Unknown',
    inventoryDate: item.inventoryDate as string,
    quantityOnHand: Number(item.quantityOnHand || 0).toFixed(0),
    quantityOnOrder: Number(item.quantityOnOrder || 0).toFixed(0),
    quantityOnSalesOrder: Number(item.quantityOnSalesOrder || 0).toFixed(0),
    availableQuantity: Number(item.availableQuantity || 0).toFixed(0),
    totalInventoryVisibility: Number(item.totalInventoryVisibility || 0).toFixed(0),
    quantityChange: Number(item.quantityChange || 0).toFixed(0),
    previousQuantityOnHand: Number(item.previousQuantityOnHand || 0).toFixed(0),
    inventoryValueAtCost: Number(item.inventoryValueAtCost || 0).toFixed(2),
    inventoryValueAtSalesPrice: Number(item.inventoryValueAtSalesPrice || 0).toFixed(2),
    itemStatus: item.itemStatus || 'Unknown',
    isBackup: item.isBackup || false,
  };
}

// Get inventory trend for a product (all time)
export async function getProductInventoryTrend(itemName: string): Promise<InventoryTrend[]> {
  const trend = await db
    .select({
      inventoryDate: fctInventoryHistoryInAnalyticsMart.inventoryDate,
      quantityOnHand: fctInventoryHistoryInAnalyticsMart.quantityOnHand,
      quantityChange: fctInventoryHistoryInAnalyticsMart.quantityChange,
      inventoryValueAtCost: fctInventoryHistoryInAnalyticsMart.inventoryValueAtCost,
    })
    .from(fctInventoryHistoryInAnalyticsMart)
    .where(sql`${fctInventoryHistoryInAnalyticsMart.itemName} = ${itemName}`)
    .orderBy(fctInventoryHistoryInAnalyticsMart.inventoryDate);

  return trend.map(item => ({
    date: item.inventoryDate as string,
    quantityOnHand: Number(item.quantityOnHand || 0).toFixed(0),
    quantityChange: Number(item.quantityChange || 0).toFixed(0),
    inventoryValueAtCost: Number(item.inventoryValueAtCost || 0).toFixed(2),
  }));
}

// Company interfaces and queries
export interface TopCompany {
  companyDomainKey: string;
  companyName: string;
  domainType: string;
  businessSizeCategory: string;
  revenueCategory: string;
  totalRevenue: string;
  totalOrders: string;
  customerCount: number;
  firstOrderDate: string;
  latestOrderDate: string;
}

export interface CompanyWithHealth {
  companyDomainKey: string;
  companyName: string;
  domainType: string;
  businessSizeCategory: string;
  revenueCategory: string;
  totalRevenue: string;
  totalOrders: string;
  customerCount: number;
  firstOrderDate: string;
  latestOrderDate: string;
  healthScore: string;
  activityStatus: string;
  healthCategory: string;
  growthTrendDirection: string;
  daysSinceLastOrder: number;
  atRiskFlag: boolean;
  growthOpportunityFlag: boolean;
}

export async function getAllCompanies(
  page: number = 1,
  pageSize: number = 50,
  searchTerm: string = '',
  sortBy: string = 'totalRevenue',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ companies: TopCompany[], totalCount: number }> {
  
  // Build WHERE clause for search
  let whereClause = sql`${fctCompaniesInAnalyticsMart.domainType} = 'corporate'`;
  
  if (searchTerm) {
    whereClause = sql`${whereClause} AND (
      LOWER(${fctCompaniesInAnalyticsMart.companyName}) LIKE LOWER(${'%' + searchTerm + '%'}) OR
      LOWER(${fctCompaniesInAnalyticsMart.companyDomainKey}) LIKE LOWER(${'%' + searchTerm + '%'})
    )`;
  }

  // Build ORDER BY clause
  const sortColumn = {
    'companyName': fctCompaniesInAnalyticsMart.companyName,
    'totalRevenue': fctCompaniesInAnalyticsMart.totalRevenue,
    'totalOrders': fctCompaniesInAnalyticsMart.totalOrders,
    'customerCount': fctCompaniesInAnalyticsMart.customerCount,
    'latestOrderDate': fctCompaniesInAnalyticsMart.latestOrderDate,
  }[sortBy] || fctCompaniesInAnalyticsMart.totalRevenue;

  const orderByClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  // Get total count
  const totalCountResult = await db
    .select({ count: count() })
    .from(fctCompaniesInAnalyticsMart)
    .where(whereClause);
  
  const totalCount = totalCountResult[0]?.count || 0;

  // Get paginated results
  const companies = await db
    .select({
      companyDomainKey: fctCompaniesInAnalyticsMart.companyDomainKey,
      companyName: fctCompaniesInAnalyticsMart.companyName,
      domainType: fctCompaniesInAnalyticsMart.domainType,
      businessSizeCategory: fctCompaniesInAnalyticsMart.businessSizeCategory,
      revenueCategory: fctCompaniesInAnalyticsMart.revenueCategory,
      totalRevenue: fctCompaniesInAnalyticsMart.totalRevenue,
      totalOrders: fctCompaniesInAnalyticsMart.totalOrders,
      customerCount: fctCompaniesInAnalyticsMart.customerCount,
      firstOrderDate: fctCompaniesInAnalyticsMart.firstOrderDate,
      latestOrderDate: fctCompaniesInAnalyticsMart.latestOrderDate,
    })
    .from(fctCompaniesInAnalyticsMart)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    companies: companies.map(company => ({
      companyDomainKey: company.companyDomainKey || '',
      companyName: company.companyName || 'Unknown Company',
      domainType: company.domainType || 'unknown',
      businessSizeCategory: company.businessSizeCategory || 'Unknown',
      revenueCategory: company.revenueCategory || 'Unknown',
      totalRevenue: Number(company.totalRevenue || 0).toFixed(2),
      totalOrders: Number(company.totalOrders || 0).toFixed(0),
      customerCount: Number(company.customerCount || 0),
      firstOrderDate: company.firstOrderDate as string || '',
      latestOrderDate: company.latestOrderDate as string || '',
    })),
    totalCount: Number(totalCount)
  };
}

export async function getCompaniesWithHealth(
  page: number = 1,
  pageSize: number = 50,
  searchTerm: string = '',
  sortBy: string = 'totalRevenue',
  sortOrder: 'asc' | 'desc' = 'desc',
  filters: {
    activityStatus?: string
    businessSize?: string
    revenueCategory?: string
    healthCategory?: string
  } = {}
): Promise<{ companies: CompanyWithHealth[], totalCount: number }> {
  
  // Build WHERE clause for search
  let whereClause = sql`${fctCompaniesInAnalyticsMart.domainType} = 'corporate'`;
  
  if (searchTerm) {
    whereClause = sql`${whereClause} AND (
      LOWER(${fctCompaniesInAnalyticsMart.companyName}) LIKE LOWER(${'%' + searchTerm + '%'}) OR
      LOWER(${fctCompaniesInAnalyticsMart.companyDomainKey}) LIKE LOWER(${'%' + searchTerm + '%'})
    )`;
  }

  // Apply filters
  if (filters.activityStatus) {
    whereClause = sql`${whereClause} AND ${dimCompanyHealthInAnalyticsMart.activityStatus} = ${filters.activityStatus}`;
  }

  if (filters.businessSize) {
    whereClause = sql`${whereClause} AND ${fctCompaniesInAnalyticsMart.businessSizeCategory} = ${filters.businessSize}`;
  }

  if (filters.revenueCategory) {
    whereClause = sql`${whereClause} AND ${fctCompaniesInAnalyticsMart.revenueCategory} = ${filters.revenueCategory}`;
  }

  if (filters.healthCategory) {
    whereClause = sql`${whereClause} AND ${dimCompanyHealthInAnalyticsMart.healthCategory} = ${filters.healthCategory}`;
  }

  // Build ORDER BY clause - handle health-related sorting
  const sortColumn = {
    'companyName': fctCompaniesInAnalyticsMart.companyName,
    'totalRevenue': fctCompaniesInAnalyticsMart.totalRevenue,
    'totalOrders': fctCompaniesInAnalyticsMart.totalOrders,
    'customerCount': fctCompaniesInAnalyticsMart.customerCount,
    'latestOrderDate': fctCompaniesInAnalyticsMart.latestOrderDate,
    'healthScore': dimCompanyHealthInAnalyticsMart.healthScore,
    'activityStatus': dimCompanyHealthInAnalyticsMart.activityStatus,
    'daysSinceLastOrder': dimCompanyHealthInAnalyticsMart.daysSinceLastOrder,
  }[sortBy] || fctCompaniesInAnalyticsMart.totalRevenue;

  const orderByClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  // Get total count
  const totalCountResult = await db
    .select({ count: count() })
    .from(fctCompaniesInAnalyticsMart)
    .innerJoin(dimCompanyHealthInAnalyticsMart, sql`${fctCompaniesInAnalyticsMart.companyDomainKey} = ${dimCompanyHealthInAnalyticsMart.companyDomainKey}`)
    .where(whereClause);
  
  const totalCount = totalCountResult[0]?.count || 0;

  // Get companies with health data
  const companies = await db
    .select({
      companyDomainKey: fctCompaniesInAnalyticsMart.companyDomainKey,
      companyName: fctCompaniesInAnalyticsMart.companyName,
      domainType: fctCompaniesInAnalyticsMart.domainType,
      businessSizeCategory: fctCompaniesInAnalyticsMart.businessSizeCategory,
      revenueCategory: fctCompaniesInAnalyticsMart.revenueCategory,
      totalRevenue: fctCompaniesInAnalyticsMart.totalRevenue,
      totalOrders: fctCompaniesInAnalyticsMart.totalOrders,
      customerCount: fctCompaniesInAnalyticsMart.customerCount,
      firstOrderDate: fctCompaniesInAnalyticsMart.firstOrderDate,
      latestOrderDate: fctCompaniesInAnalyticsMart.latestOrderDate,
      healthScore: dimCompanyHealthInAnalyticsMart.healthScore,
      activityStatus: dimCompanyHealthInAnalyticsMart.activityStatus,
      healthCategory: dimCompanyHealthInAnalyticsMart.healthCategory,
      growthTrendDirection: dimCompanyHealthInAnalyticsMart.growthTrendDirection,
      daysSinceLastOrder: dimCompanyHealthInAnalyticsMart.daysSinceLastOrder,
      atRiskFlag: dimCompanyHealthInAnalyticsMart.atRiskFlag,
      growthOpportunityFlag: dimCompanyHealthInAnalyticsMart.growthOpportunityFlag,
    })
    .from(fctCompaniesInAnalyticsMart)
    .innerJoin(dimCompanyHealthInAnalyticsMart, sql`${fctCompaniesInAnalyticsMart.companyDomainKey} = ${dimCompanyHealthInAnalyticsMart.companyDomainKey}`)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    companies: companies.map(company => ({
      companyDomainKey: company.companyDomainKey || '',
      companyName: company.companyName || 'Unknown Company',
      domainType: company.domainType || 'unknown',
      businessSizeCategory: company.businessSizeCategory || 'Unknown',
      revenueCategory: company.revenueCategory || 'Unknown',
      totalRevenue: Number(company.totalRevenue || 0).toFixed(2),
      totalOrders: Number(company.totalOrders || 0).toFixed(0),
      customerCount: Number(company.customerCount || 0),
      firstOrderDate: company.firstOrderDate as string || '',
      latestOrderDate: company.latestOrderDate as string || '',
      healthScore: Number(company.healthScore || 0).toFixed(0),
      activityStatus: company.activityStatus || 'Unknown',
      healthCategory: company.healthCategory || 'Unknown',
      growthTrendDirection: company.growthTrendDirection || 'Unknown',
      daysSinceLastOrder: Number(company.daysSinceLastOrder || 0),
      atRiskFlag: Boolean(company.atRiskFlag),
      growthOpportunityFlag: Boolean(company.growthOpportunityFlag),
    })),
    totalCount: Number(totalCount)
  };
}

export interface CompanyDetail {
  companyDomainKey: string;
  companyName: string;
  domainType: string;
  businessSizeCategory: string;
  revenueCategory: string;
  totalRevenue: string;
  totalOrders: string;
  customerCount: number;
  firstOrderDate: string;
  latestOrderDate: string;
  primaryEmail: string;
  primaryPhone: string;
  primaryBillingAddressLine1: string;
  primaryBillingCity: string;
  primaryBillingState: string;
  primaryBillingPostalCode: string;
}

export interface CompanyCustomer {
  customerId: string;
  customerName: string;
  customerTotalRevenue: string;
  customerTotalOrders: string;
  customerValueTier: string;
  customerActivityStatus: string;
  billingAddressCity: string;
  billingAddressState: string;
  salesRep: string;
  isIndividualCustomer: boolean;
}

export async function getCompanyByDomain(domainKey: string): Promise<CompanyDetail | null> {
  const companies = await db
    .select({
      companyDomainKey: fctCompaniesInAnalyticsMart.companyDomainKey,
      companyName: fctCompaniesInAnalyticsMart.companyName,
      domainType: fctCompaniesInAnalyticsMart.domainType,
      businessSizeCategory: fctCompaniesInAnalyticsMart.businessSizeCategory,
      revenueCategory: fctCompaniesInAnalyticsMart.revenueCategory,
      totalRevenue: fctCompaniesInAnalyticsMart.totalRevenue,
      totalOrders: fctCompaniesInAnalyticsMart.totalOrders,
      customerCount: fctCompaniesInAnalyticsMart.customerCount,
      firstOrderDate: fctCompaniesInAnalyticsMart.firstOrderDate,
      latestOrderDate: fctCompaniesInAnalyticsMart.latestOrderDate,
      primaryEmail: fctCompaniesInAnalyticsMart.primaryEmail,
      primaryPhone: fctCompaniesInAnalyticsMart.primaryPhone,
      primaryBillingAddressLine1: fctCompaniesInAnalyticsMart.primaryBillingAddressLine1,
      primaryBillingCity: fctCompaniesInAnalyticsMart.primaryBillingCity,
      primaryBillingState: fctCompaniesInAnalyticsMart.primaryBillingState,
      primaryBillingPostalCode: fctCompaniesInAnalyticsMart.primaryBillingPostalCode,
    })
    .from(fctCompaniesInAnalyticsMart)
    .where(sql`${fctCompaniesInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .limit(1);

  if (companies.length === 0) {
    return null;
  }

  const company = companies[0];
  return {
    companyDomainKey: company.companyDomainKey || '',
    companyName: company.companyName || 'Unknown Company',
    domainType: company.domainType || 'unknown',
    businessSizeCategory: company.businessSizeCategory || 'Unknown',
    revenueCategory: company.revenueCategory || 'Unknown',
    totalRevenue: Number(company.totalRevenue || 0).toFixed(2),
    totalOrders: Number(company.totalOrders || 0).toFixed(0),
    customerCount: Number(company.customerCount || 0),
    firstOrderDate: company.firstOrderDate as string || '',
    latestOrderDate: company.latestOrderDate as string || '',
    primaryEmail: company.primaryEmail || '',
    primaryPhone: company.primaryPhone || '',
    primaryBillingAddressLine1: company.primaryBillingAddressLine1 || '',
    primaryBillingCity: company.primaryBillingCity || '',
    primaryBillingState: company.primaryBillingState || '',
    primaryBillingPostalCode: company.primaryBillingPostalCode || '',
  };
}

export async function getCompanyCustomers(domainKey: string): Promise<CompanyCustomer[]> {
  const customers = await db
    .select({
      customerId: bridgeCustomerCompanyInAnalyticsMart.customerId,
      customerName: bridgeCustomerCompanyInAnalyticsMart.customerName,
      customerTotalRevenue: bridgeCustomerCompanyInAnalyticsMart.customerTotalRevenue,
      customerTotalOrders: bridgeCustomerCompanyInAnalyticsMart.customerTotalOrders,
      customerValueTier: bridgeCustomerCompanyInAnalyticsMart.customerValueTier,
      customerActivityStatus: bridgeCustomerCompanyInAnalyticsMart.customerActivityStatus,
      billingAddressCity: bridgeCustomerCompanyInAnalyticsMart.billingAddressCity,
      billingAddressState: bridgeCustomerCompanyInAnalyticsMart.billingAddressState,
      salesRep: bridgeCustomerCompanyInAnalyticsMart.salesRep,
      isIndividualCustomer: bridgeCustomerCompanyInAnalyticsMart.isIndividualCustomer,
    })
    .from(bridgeCustomerCompanyInAnalyticsMart)
    .where(sql`${bridgeCustomerCompanyInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .orderBy(desc(bridgeCustomerCompanyInAnalyticsMart.customerTotalRevenue));

  return customers.map(customer => ({
    customerId: customer.customerId || '',
    customerName: customer.customerName || 'Unknown Customer',
    customerTotalRevenue: Number(customer.customerTotalRevenue || 0).toFixed(2),
    customerTotalOrders: Number(customer.customerTotalOrders || 0).toFixed(0),
    customerValueTier: customer.customerValueTier || 'Unknown',
    customerActivityStatus: customer.customerActivityStatus || 'Unknown',
    billingAddressCity: customer.billingAddressCity || '',
    billingAddressState: customer.billingAddressState || '',
    salesRep: customer.salesRep || '',
    isIndividualCustomer: customer.isIndividualCustomer || false,
  }));
}

// Phase 1 Company Analytics - Using existing schema
export interface CompanyOrder {
  orderNumber: string;
  orderDate: string;
  calculatedOrderTotal: string;
  lineItemCount: number;
  uniqueProducts: number;
  orderType: string;
  recencyCategory: string;
  orderSizeCategory: string;
  daysSinceOrder: number;
}

export interface CompanyProduct {
  productService: string;
  productServiceDescription: string;
  productFamily: string;
  materialType: string;
  totalTransactions: number;
  totalQuantityPurchased: string;
  totalAmountSpent: string;
  avgUnitPrice: string;
  buyerStatus: string;
  purchaseVolumeCategory: string;
  daysSinceLastPurchase: number;
}

export interface CompanyHealthBasic {
  daysSinceLastOrder: number;
  activityStatus: string;
  totalOrders: number;
  orderFrequency: string;
  avgOrderValue: string;
}

export async function getCompanyOrderTimeline(domainKey: string): Promise<CompanyOrder[]> {
  const orders = await db
    .select({
      orderNumber: fctCompanyOrdersInAnalyticsMart.orderNumber,
      orderDate: fctCompanyOrdersInAnalyticsMart.orderDate,
      calculatedOrderTotal: fctCompanyOrdersInAnalyticsMart.calculatedOrderTotal,
      lineItemCount: fctCompanyOrdersInAnalyticsMart.lineItemCount,
      uniqueProducts: fctCompanyOrdersInAnalyticsMart.uniqueProducts,
      orderType: fctCompanyOrdersInAnalyticsMart.orderType,
      recencyCategory: fctCompanyOrdersInAnalyticsMart.recencyCategory,
      orderSizeCategory: fctCompanyOrdersInAnalyticsMart.orderSizeCategory,
      daysSinceOrder: fctCompanyOrdersInAnalyticsMart.daysSinceOrder,
    })
    .from(fctCompanyOrdersInAnalyticsMart)
    .where(sql`${fctCompanyOrdersInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .orderBy(desc(fctCompanyOrdersInAnalyticsMart.orderDate))
    .limit(50);

  return orders.map(order => ({
    orderNumber: order.orderNumber || '',
    orderDate: order.orderDate as string || '',
    calculatedOrderTotal: Number(order.calculatedOrderTotal || 0).toFixed(2),
    lineItemCount: Number(order.lineItemCount || 0),
    uniqueProducts: Number(order.uniqueProducts || 0),
    orderType: order.orderType || 'Unknown',
    recencyCategory: order.recencyCategory || 'Unknown',
    orderSizeCategory: order.orderSizeCategory || 'Unknown',
    daysSinceOrder: Number(order.daysSinceOrder || 0),
  }));
}

export async function getCompanyProductAnalysis(domainKey: string): Promise<CompanyProduct[]> {
  const products = await db
    .select({
      productService: fctCompanyProductsInAnalyticsMart.productService,
      productServiceDescription: fctCompanyProductsInAnalyticsMart.productServiceDescription,
      productFamily: fctCompanyProductsInAnalyticsMart.productFamily,
      materialType: fctCompanyProductsInAnalyticsMart.materialType,
      totalTransactions: fctCompanyProductsInAnalyticsMart.totalTransactions,
      totalQuantityPurchased: fctCompanyProductsInAnalyticsMart.totalQuantityPurchased,
      totalAmountSpent: fctCompanyProductsInAnalyticsMart.totalAmountSpent,
      avgUnitPrice: fctCompanyProductsInAnalyticsMart.avgUnitPrice,
      buyerStatus: fctCompanyProductsInAnalyticsMart.buyerStatus,
      purchaseVolumeCategory: fctCompanyProductsInAnalyticsMart.purchaseVolumeCategory,
      daysSinceLastPurchase: fctCompanyProductsInAnalyticsMart.daysSinceLastPurchase,
    })
    .from(fctCompanyProductsInAnalyticsMart)
    .where(sql`${fctCompanyProductsInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .orderBy(desc(fctCompanyProductsInAnalyticsMart.totalAmountSpent))
    .limit(20);

  return products.map(product => ({
    productService: product.productService || '',
    productServiceDescription: product.productServiceDescription || '',
    productFamily: product.productFamily || 'Unknown',
    materialType: product.materialType || 'Unknown',
    totalTransactions: Number(product.totalTransactions || 0),
    totalQuantityPurchased: Number(product.totalQuantityPurchased || 0).toFixed(2),
    totalAmountSpent: Number(product.totalAmountSpent || 0).toFixed(2),
    avgUnitPrice: Number(product.avgUnitPrice || 0).toFixed(2),
    buyerStatus: product.buyerStatus || 'Unknown',
    purchaseVolumeCategory: product.purchaseVolumeCategory || 'Unknown',
    daysSinceLastPurchase: Number(product.daysSinceLastPurchase || 0),
  }));
}

export async function getCompanyHealthBasic(domainKey: string): Promise<CompanyHealthBasic | null> {
  const orders = await db
    .select({
      orderDate: fctCompanyOrdersInAnalyticsMart.orderDate,
      calculatedOrderTotal: fctCompanyOrdersInAnalyticsMart.calculatedOrderTotal,
    })
    .from(fctCompanyOrdersInAnalyticsMart)
    .where(sql`${fctCompanyOrdersInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .orderBy(desc(fctCompanyOrdersInAnalyticsMart.orderDate));

  if (orders.length === 0) {
    return null;
  }

  const latestOrder = orders[0];
  const daysSinceLastOrder = Math.floor(
    (new Date().getTime() - new Date(latestOrder.orderDate as string).getTime()) / (1000 * 60 * 60 * 24)
  );

  let activityStatus = 'Inactive';
  if (daysSinceLastOrder <= 30) activityStatus = 'Active (30 days)';
  else if (daysSinceLastOrder <= 90) activityStatus = 'Recent (90 days)';
  else if (daysSinceLastOrder <= 365) activityStatus = 'Dormant (1 year)';

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.calculatedOrderTotal || 0), 0);
  const avgOrderValue = totalRevenue / orders.length;

  // Calculate simple order frequency (orders per month over active period)
  const oldestOrder = orders[orders.length - 1];
  const daysBetween = Math.floor(
    (new Date(latestOrder.orderDate as string).getTime() - new Date(oldestOrder.orderDate as string).getTime()) / (1000 * 60 * 60 * 24)
  );
  const monthsBetween = Math.max(daysBetween / 30, 1);
  const ordersPerMonth = orders.length / monthsBetween;

  let orderFrequency = 'Low';
  if (ordersPerMonth >= 4) orderFrequency = 'High (4+/month)';
  else if (ordersPerMonth >= 1) orderFrequency = 'Medium (1-4/month)';
  else if (ordersPerMonth >= 0.25) orderFrequency = 'Low (1/quarter)';
  else orderFrequency = 'Very Low (<1/quarter)';

  return {
    daysSinceLastOrder,
    activityStatus,
    totalOrders: orders.length,
    orderFrequency,
    avgOrderValue: avgOrderValue.toFixed(2),
  };
}

// Family Sales interfaces and queries
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