// ABOUTME: Product catalog queries including metrics, pricing, and sales performance data
// ABOUTME: Handles product listings, individual product details, and period-based sales analysis
import { db, fctProductsInAnalyticsMart } from '@/lib/db';
import { sql, count, avg, and, notInArray } from 'drizzle-orm';
import { format } from 'date-fns';
import { getDateRange, type ProductFilters, type ProductDetailFilters } from '@/lib/filter-utils';

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
  actualMarginPercentage?: string;
  actualMarginAmount?: string;
  discountPercentage?: string;
  isKit: boolean;
  itemType: string;
  periodSales: string;
  periodUnits: number;
  periodOrders: number;
}

export interface WeeklyRevenue {
  date: string;
  revenue: string;
  orderCount: number;
}

export interface ProductPriceDistribution {
  minPrice: string;
  maxPrice: string;
  avgPrice: string;
  medianPrice: string;
  totalSales: number;
  priceRanges: Array<{
    rangeLabel: string;
    minValue: number;
    maxValue: number;
    count: number;
    percentage: number;
  }>;
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
    averageMargin: Number(productResult.averageMargin).toFixed(1),
    totalInventoryValue: Number(inventoryResult[0]?.total_inventory_value || 0).toFixed(2),
    kitProducts: productResult.kitProducts,
    averageSalesPrice: Number(productResult.averageSalesPrice).toFixed(2),
    averagePurchaseCost: Number(productResult.averagePurchaseCost).toFixed(2),
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
      COALESCE(sales.order_count, 0) as period_orders,
      COALESCE(margins.avg_margin_percentage, 0) as actual_margin_percentage,
      COALESCE(margins.avg_unit_margin_amount, 0) as actual_margin_amount,
      COALESCE(margins.volume_weighted_discount_percentage, 0) as discount_percentage
    FROM analytics_mart.fct_products p
    LEFT JOIN (
      SELECT
        product_name,
        SUM(total_revenue) as total_sales,
        SUM(total_units_sold) as total_units,
        SUM(line_item_count) as order_count
      FROM analytics_mart.mart_product_unit_sales
      WHERE sale_date >= ${startDate}
        AND product_name IS NOT NULL
      GROUP BY product_name
    ) sales ON p.item_name = sales.product_name
    LEFT JOIN (
      SELECT
        sku,
        AVG(avg_margin_percentage) as avg_margin_percentage,
        AVG(avg_unit_margin_amount) as avg_unit_margin_amount,
        AVG(volume_weighted_discount_percentage) as volume_weighted_discount_percentage
      FROM analytics_mart.mart_product_margin_analytics
      WHERE order_date >= ${startDate}
        AND sku IS NOT NULL
      GROUP BY sku
    ) margins ON p.item_name = margins.sku
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
    actual_margin_percentage: string;
    actual_margin_amount: string;
    discount_percentage: string;
  }>;

  return results.map(product => ({
    quickBooksInternalId: product.quick_books_internal_id || 'N/A',
    itemName: product.item_name || 'Unknown',
    salesDescription: product.sales_description || '',
    productFamily: product.product_family || 'Other',
    materialType: product.material_type || 'Unknown',
    salesPrice: Number(product.sales_price).toFixed(2),
    purchaseCost: Number(product.purchase_cost).toFixed(2),
    marginPercentage: Number(product.margin_percentage).toFixed(1),
    marginAmount: Number(product.margin_amount).toFixed(2),
    actualMarginPercentage: Number(product.actual_margin_percentage || 0) > 0 ? Number(product.actual_margin_percentage).toFixed(1) : undefined,
    actualMarginAmount: Number(product.actual_margin_amount || 0) > 0 ? Number(product.actual_margin_amount).toFixed(2) : undefined,
    discountPercentage: Number(product.discount_percentage || 0) > 0 ? Number(product.discount_percentage).toFixed(1) : undefined,
    isKit: product.is_kit || false,
    itemType: product.item_type || 'Unknown',
    periodSales: Number(product.period_sales || 0).toFixed(2),
    periodUnits: Math.floor(Number(product.period_units || 0)),
    periodOrders: Number(product.period_orders || 0),
  }));
}

// Get single product by name with sales data (period-agnostic for product details)
export async function getProductByName(itemName: string): Promise<Product | null> {
  // Use 1-year lookback for basic product info - this is static product data
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
      COALESCE(sales.order_count, 0) as period_orders,
      COALESCE(margins.avg_margin_percentage, 0) as actual_margin_percentage,
      COALESCE(margins.avg_unit_margin_amount, 0) as actual_margin_amount,
      COALESCE(margins.volume_weighted_discount_percentage, 0) as discount_percentage
    FROM analytics_mart.fct_products p
    LEFT JOIN (
      SELECT
        product_name,
        SUM(total_revenue) as total_sales,
        SUM(total_units_sold) as total_units,
        SUM(line_item_count) as order_count
      FROM analytics_mart.mart_product_unit_sales
      WHERE sale_date >= ${startDate}
        AND product_name IS NOT NULL
      GROUP BY product_name
    ) sales ON p.item_name = sales.product_name
    LEFT JOIN (
      SELECT
        sku,
        AVG(avg_margin_percentage) as avg_margin_percentage,
        AVG(avg_unit_margin_amount) as avg_unit_margin_amount,
        AVG(volume_weighted_discount_percentage) as volume_weighted_discount_percentage
      FROM analytics_mart.mart_product_margin_analytics
      WHERE order_date >= ${startDate}
        AND sku IS NOT NULL
      GROUP BY sku
    ) margins ON p.item_name = margins.sku
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
    actual_margin_percentage: string;
    actual_margin_amount: string;
    discount_percentage: string;
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
    salesPrice: Number(product.sales_price).toFixed(2),
    purchaseCost: Number(product.purchase_cost).toFixed(2),
    marginPercentage: Number(product.margin_percentage).toFixed(1),
    marginAmount: Number(product.margin_amount).toFixed(2),
    actualMarginPercentage: Number(product.actual_margin_percentage || 0) > 0 ? Number(product.actual_margin_percentage).toFixed(1) : undefined,
    actualMarginAmount: Number(product.actual_margin_amount || 0) > 0 ? Number(product.actual_margin_amount).toFixed(2) : undefined,
    discountPercentage: Number(product.discount_percentage || 0) > 0 ? Number(product.discount_percentage).toFixed(1) : undefined,
    isKit: product.is_kit || false,
    itemType: product.item_type || 'Unknown',
    periodSales: Number(product.period_sales || 0).toFixed(2),
    periodUnits: Math.floor(Number(product.period_units || 0)),
    periodOrders: Number(product.period_orders || 0),
  };
}

// Get monthly revenue for a specific product with period filtering
export async function getProductMonthlyRevenue(itemName: string, filters?: ProductDetailFilters): Promise<WeeklyRevenue[]> {
  const dateRange = getDateRange(filters?.period || '1y', false);
  const startDate = dateRange.start;

  const monthlyData = await db.execute(sql`
    SELECT 
      DATE_TRUNC('month', order_date) as month_start,
      SUM(product_service_amount) as revenue,
      COUNT(DISTINCT order_number) as order_count
    FROM analytics_mart.fct_order_line_items
    WHERE product_service_amount IS NOT NULL
      AND product_service = ${itemName}
      AND order_date >= ${startDate}
    GROUP BY DATE_TRUNC('month', order_date)
    ORDER BY month_start
  `);

  // Handle different return formats from Drizzle
  const results = monthlyData as unknown as Array<{ month_start: string; revenue: string; order_count: number }>;
  
  return results.map(month => ({
    date: month.month_start,
    revenue: Number(month.revenue).toFixed(2),
    orderCount: Number(month.order_count || 0),
  }));
}

// Get product price distribution for the specified period
export async function getProductPriceDistribution(itemName: string, filters?: ProductDetailFilters): Promise<ProductPriceDistribution> {
  const dateRange = getDateRange(filters?.period || '1y', false);
  const startDate = dateRange.start;

  // Get all actual selling prices for this product in the period
  const priceData = await db.execute(sql`
    SELECT
      product_service_rate::numeric as price,
      product_service_quantity::numeric as quantity
    FROM analytics_mart.fct_order_line_items
    WHERE product_service_rate IS NOT NULL
      AND product_service_rate::numeric > 0
      AND product_service = ${itemName}
      AND order_date >= ${startDate}
    ORDER BY product_service_rate::numeric
  `);

  const results = priceData as unknown as Array<{ price: string; quantity: string }>;

  if (results.length === 0) {
    return {
      minPrice: '0.00',
      maxPrice: '0.00',
      avgPrice: '0.00',
      medianPrice: '0.00',
      totalSales: 0,
      priceRanges: []
    };
  }

  const prices = results.map(r => Number(r.price));
  const quantities = results.map(r => Number(r.quantity));

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const totalSales = quantities.reduce((sum, qty) => sum + qty, 0);
  const avgPrice = prices.reduce((sum, price, index) => sum + (price * quantities[index]), 0) / totalSales;

  // Calculate median price (weighted by quantity)
  const sortedPricesWithQty = results.map(r => ({
    price: Number(r.price),
    quantity: Number(r.quantity)
  })).sort((a, b) => a.price - b.price);

  let cumulativeQty = 0;
  const halfTotal = totalSales / 2;
  let medianPrice = avgPrice;

  for (const item of sortedPricesWithQty) {
    cumulativeQty += item.quantity;
    if (cumulativeQty >= halfTotal) {
      medianPrice = item.price;
      break;
    }
  }

  // Create price ranges for histogram
  const numBuckets = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(results.length))));
  const bucketSize = (maxPrice - minPrice) / numBuckets;

  const priceRanges = [];
  for (let i = 0; i < numBuckets; i++) {
    const rangeMin = minPrice + (i * bucketSize);
    const rangeMax = i === numBuckets - 1 ? maxPrice : minPrice + ((i + 1) * bucketSize);

    let count = 0;
    for (const result of results) {
      const price = Number(result.price);
      const quantity = Number(result.quantity);
      if (price >= rangeMin && (i === numBuckets - 1 ? price <= rangeMax : price < rangeMax)) {
        count += quantity;
      }
    }

    const rangeLabel = i === numBuckets - 1
      ? `$${rangeMin.toFixed(0)} - $${rangeMax.toFixed(0)}`
      : `$${rangeMin.toFixed(0)} - $${(rangeMax - 0.01).toFixed(0)}`;

    priceRanges.push({
      rangeLabel,
      minValue: rangeMin,
      maxValue: rangeMax,
      count,
      percentage: totalSales > 0 ? (count / totalSales) * 100 : 0
    });
  }

  return {
    minPrice: minPrice.toFixed(2),
    maxPrice: maxPrice.toFixed(2),
    avgPrice: avgPrice.toFixed(2),
    medianPrice: medianPrice.toFixed(2),
    totalSales,
    priceRanges
  };
}