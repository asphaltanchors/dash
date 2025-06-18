import { db, fctOrdersInAnalyticsMart, fctProductsInAnalyticsMart, fctInventoryHistoryInAnalyticsMart, fctOrderLineItemsInAnalyticsMart } from '@/lib/db';
import { desc, asc, gte, lte, sql, count, sum, avg, and, notInArray } from 'drizzle-orm';
import { format } from 'date-fns';

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

// Get last 30 days metrics compared to previous 30 days
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd');
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = format(sixtyDaysAgo, 'yyyy-MM-dd');

  const threeSixtyFiveDaysAgo = new Date();
  threeSixtyFiveDaysAgo.setDate(threeSixtyFiveDaysAgo.getDate() - 365);
  const threeSixtyFiveDaysAgoStr = format(threeSixtyFiveDaysAgo, 'yyyy-MM-dd');
  
  const sevenThirtyDaysAgo = new Date();
  sevenThirtyDaysAgo.setDate(sevenThirtyDaysAgo.getDate() - 730);
  const sevenThirtyDaysAgoStr = format(sevenThirtyDaysAgo, 'yyyy-MM-dd');
  
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // 365 day sales - only paid orders between 365 days ago and today
  const sales365 = await db
    .select({
      totalSales: sum(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, threeSixtyFiveDaysAgoStr),
        lte(fctOrdersInAnalyticsMart.orderDate, todayStr),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`,
        sql`${fctOrdersInAnalyticsMart.isPaid} = true`
      )
    );

  // Previous 365 day sales - only paid orders between 730-365 days ago
  const previousSales365 = await db
    .select({
      totalSales: sum(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, sevenThirtyDaysAgoStr),
        lte(fctOrdersInAnalyticsMart.orderDate, threeSixtyFiveDaysAgoStr),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`,
        sql`${fctOrdersInAnalyticsMart.isPaid} = true`
      )
    );

  // Current period (last 30 days)
  const currentPeriod = await db
    .select({
      totalRevenue: sum(fctOrdersInAnalyticsMart.totalAmount),
      totalOrders: count(),
      averageOrderValue: avg(fctOrdersInAnalyticsMart.totalAmount),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, thirtyDaysAgoStr),
        sql`${fctOrdersInAnalyticsMart.totalAmount} is not null`
      )
    );

  // Previous period (30-60 days ago)
  const previousPeriod = await db
    .select({
      totalRevenue: sum(fctOrdersInAnalyticsMart.totalAmount),
      totalOrders: count(),
    })
    .from(fctOrdersInAnalyticsMart)
    .where(
      and(
        gte(fctOrdersInAnalyticsMart.orderDate, sixtyDaysAgoStr),
        sql`${fctOrdersInAnalyticsMart.orderDate} < ${thirtyDaysAgoStr}`,
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

// Get weekly revenue for the last year
export async function getWeeklyRevenue(): Promise<WeeklyRevenue[]> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = format(oneYearAgo, 'yyyy-MM-dd');
  
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const weeklyData = await db.execute(sql`
    SELECT 
      DATE_TRUNC('week', order_date) as week_start,
      SUM(total_amount) as revenue,
      COUNT(*) as order_count
    FROM analytics_mart.fct_orders
    WHERE order_date >= ${oneYearAgoStr}
      AND order_date <= ${todayStr}
      AND total_amount IS NOT NULL
    GROUP BY DATE_TRUNC('week', order_date)
    ORDER BY week_start
  `);

  // Handle different return formats from Drizzle
  const results = weeklyData as unknown as Array<{ week_start: string; revenue: string; order_count: number }>;
  
  return results.map(week => ({
    date: week.week_start,
    revenue: Number(week.revenue || 0).toFixed(2),
    orderCount: Number(week.order_count || 0),
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
  trailingYearSales: string;
  trailingYearUnits: number;
  trailingYearOrders: number;
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

// Get product list with trailing year sales data
export async function getProducts(limit: number = 50): Promise<Product[]> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = format(oneYearAgo, 'yyyy-MM-dd');

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
      COALESCE(sales.total_sales, 0) as trailing_year_sales,
      COALESCE(sales.total_units, 0) as trailing_year_units,
      COALESCE(sales.order_count, 0) as trailing_year_orders
    FROM analytics_mart.fct_products p
    LEFT JOIN (
      SELECT 
        product_service,
        SUM(product_service_amount) as total_sales,
        SUM(product_service_quantity) as total_units,
        COUNT(DISTINCT order_number) as order_count
      FROM analytics_mart.fct_order_line_items 
      WHERE order_date >= ${oneYearAgoStr}
        AND product_service_amount IS NOT NULL
        AND product_service IS NOT NULL
        AND product_service != 'Shipping'
      GROUP BY product_service
    ) sales ON p.item_name = sales.product_service
    WHERE p.sales_price IS NOT NULL
      AND p.item_type NOT IN ('NonInventory', 'OtherCharge')
    ORDER BY trailing_year_sales DESC NULLS LAST
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
    trailing_year_sales: string;
    trailing_year_units: string;
    trailing_year_orders: number;
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
    trailingYearSales: Number(product.trailing_year_sales || 0).toFixed(2),
    trailingYearUnits: Math.floor(Number(product.trailing_year_units || 0)),
    trailingYearOrders: Number(product.trailing_year_orders || 0),
  }));
}

// Get single product by name with trailing year sales data
export async function getProductByName(itemName: string): Promise<Product | null> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = format(oneYearAgo, 'yyyy-MM-dd');

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
      COALESCE(sales.total_sales, 0) as trailing_year_sales,
      COALESCE(sales.total_units, 0) as trailing_year_units,
      COALESCE(sales.order_count, 0) as trailing_year_orders
    FROM analytics_mart.fct_products p
    LEFT JOIN (
      SELECT 
        product_service,
        SUM(product_service_amount) as total_sales,
        SUM(product_service_quantity) as total_units,
        COUNT(DISTINCT order_number) as order_count
      FROM analytics_mart.fct_order_line_items 
      WHERE order_date >= ${oneYearAgoStr}
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
    trailing_year_sales: string;
    trailing_year_units: string;
    trailing_year_orders: number;
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
    trailingYearSales: Number(product.trailing_year_sales || 0).toFixed(2),
    trailingYearUnits: Math.floor(Number(product.trailing_year_units || 0)),
    trailingYearOrders: Number(product.trailing_year_orders || 0),
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