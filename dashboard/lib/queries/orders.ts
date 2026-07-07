// ABOUTME: Order-related queries including detailed order information and line items
// ABOUTME: Handles order searches, pagination, filtering, and order line item management
import { db, baseFctOrdersCurrentInAnalyticsMart as fctOrdersInAnalyticsMart, fctOrderLineItemsInAnalyticsMart, bridgeCustomerCompanyInAnalyticsMart, fctProductPricingHistoryInAnalyticsMart } from '@/lib/db';
import { desc, asc, sql, count, and, eq } from 'drizzle-orm';

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
  salesChannel: string | null;
  customerSegment: string | null;
  currency: string | null;
  billingAddress: string | null;
  billingAddressCity: string | null;
  billingAddressState: string | null;
  billingAddressPostalCode: string | null;
  billingAddressCountry: string | null;
  shippingAddress: string | null;
  shippingAddressCity: string | null;
  shippingAddressState: string | null;
  shippingAddressPostalCode: string | null;
  shippingAddressCountry: string | null;
  companyDomain: string | null;
  isIndividualCustomer: boolean;
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
  historicalRetailPrice: string | null;
  historicalDiscountPercentage: string | null;
  retailPriceSource: string | null;
}

export interface OrderTableItem {
  orderNumber: string;
  customer: string;
  orderDate: string;
  totalAmount: string;
  status: string;
  isPaid: boolean;
  salesChannel: string | null;
  customerSegment: string | null;
  companyDomain: string | null;
  isIndividualCustomer: boolean;
}

export interface RecentProductOrder {
  orderNumber: string;
  customer: string;
  orderDate: string;
  totalAmount: string;
  status: string;
  isPaid: boolean;
  salesChannel: string | null;
  customerSegment: string | null;
  companyDomain: string | null;
  isIndividualCustomer: boolean;
  skuQuantity: string;
  skuAmount: string;
  skuLineCount: number;
}

export interface OrdersResponse {
  orders: OrderTableItem[];
  totalCount: number;
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
      salesChannel: fctOrdersInAnalyticsMart.salesChannel,
      customerSegment: fctOrdersInAnalyticsMart.customerSegment,
      currency: fctOrdersInAnalyticsMart.currency,
      billingAddress: fctOrdersInAnalyticsMart.billingAddress,
      billingAddressCity: fctOrdersInAnalyticsMart.billingAddressCity,
      billingAddressState: fctOrdersInAnalyticsMart.billingAddressState,
      billingAddressPostalCode: fctOrdersInAnalyticsMart.billingAddressPostalCode,
      billingAddressCountry: fctOrdersInAnalyticsMart.billingAddressCountry,
      shippingAddress: fctOrdersInAnalyticsMart.shippingAddress,
      shippingAddressCity: fctOrdersInAnalyticsMart.shippingAddressCity,
      shippingAddressState: fctOrdersInAnalyticsMart.shippingAddressState,
      shippingAddressPostalCode: fctOrdersInAnalyticsMart.shippingAddressPostalCode,
      shippingAddressCountry: fctOrdersInAnalyticsMart.shippingAddressCountry,
      companyDomain: bridgeCustomerCompanyInAnalyticsMart.companyDomainKey,
      isIndividualCustomer: bridgeCustomerCompanyInAnalyticsMart.isIndividualCustomer,
    })
    .from(fctOrdersInAnalyticsMart)
    .leftJoin(
      bridgeCustomerCompanyInAnalyticsMart,
      eq(fctOrdersInAnalyticsMart.customer, bridgeCustomerCompanyInAnalyticsMart.customerName)
    )
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
    totalAmount: Number(order.totalAmount).toFixed(2),
    totalLineItemsAmount: order.totalLineItemsAmount ? Number(order.totalLineItemsAmount).toFixed(2) : null,
    totalTax: order.totalTax ? Number(order.totalTax).toFixed(2) : null,
    effectiveTaxRate: order.effectiveTaxRate ? Number(order.effectiveTaxRate).toFixed(4) : null,
    status: order.status || 'Unknown',
    isPaid: order.isPaid || false,
    paymentMethod: order.paymentMethod,
    shippingMethod: order.shippingMethod,
    salesRep: order.salesRep,
    salesChannel: order.salesChannel,
    customerSegment: order.customerSegment,
    currency: order.currency,
    billingAddress: order.billingAddress,
    billingAddressCity: order.billingAddressCity,
    billingAddressState: order.billingAddressState,
    billingAddressPostalCode: order.billingAddressPostalCode,
    billingAddressCountry: order.billingAddressCountry,
    shippingAddress: order.shippingAddress,
    shippingAddressCity: order.shippingAddressCity,
    shippingAddressState: order.shippingAddressState,
    shippingAddressPostalCode: order.shippingAddressPostalCode,
    shippingAddressCountry: order.shippingAddressCountry,
    companyDomain: order.companyDomain,
    isIndividualCustomer: order.isIndividualCustomer || false,
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
      orderDate: fctOrderLineItemsInAnalyticsMart.orderDate,
      retailPriceAtDate: fctProductPricingHistoryInAnalyticsMart.retailPriceAtDate,
      discountFromRetailPct: fctProductPricingHistoryInAnalyticsMart.discountFromRetailPct,
      retailPriceSource: fctProductPricingHistoryInAnalyticsMart.retailPriceSource,
    })
    .from(fctOrderLineItemsInAnalyticsMart)
    .leftJoin(
      fctProductPricingHistoryInAnalyticsMart,
      and(
        eq(fctOrderLineItemsInAnalyticsMart.productService, fctProductPricingHistoryInAnalyticsMart.productService),
        eq(fctOrderLineItemsInAnalyticsMart.orderDate, fctProductPricingHistoryInAnalyticsMart.orderDate)
      )
    )
    .where(sql`${fctOrderLineItemsInAnalyticsMart.orderNumber} = ${orderNumber}`)
    .orderBy(fctOrderLineItemsInAnalyticsMart.lineItemId);

  return lineItems.map(item => {
    return {
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
      historicalRetailPrice: item.retailPriceAtDate ? Number(item.retailPriceAtDate).toFixed(2) : null,
      historicalDiscountPercentage: item.discountFromRetailPct ? Number(item.discountFromRetailPct).toFixed(1) : null,
      retailPriceSource: item.retailPriceSource,
    };
  });
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
      salesChannel: fctOrdersInAnalyticsMart.salesChannel,
      customerSegment: fctOrdersInAnalyticsMart.customerSegment,
      companyDomain: bridgeCustomerCompanyInAnalyticsMart.companyDomainKey,
      isIndividualCustomer: bridgeCustomerCompanyInAnalyticsMart.isIndividualCustomer,
    })
    .from(fctOrdersInAnalyticsMart)
    .leftJoin(
      bridgeCustomerCompanyInAnalyticsMart,
      eq(fctOrdersInAnalyticsMart.customer, bridgeCustomerCompanyInAnalyticsMart.customerName)
    )
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
      totalAmount: Number(order.totalAmount).toFixed(2),
      status: order.status || 'Unknown',
      isPaid: order.isPaid || false,
      salesChannel: order.salesChannel,
      customerSegment: order.customerSegment,
      companyDomain: order.companyDomain,
      isIndividualCustomer: order.isIndividualCustomer || false,
    })),
    totalCount,
  };
}

export async function getRecentOrdersForProduct(productName: string, limit = 10): Promise<RecentProductOrder[]> {
  const rows = await db.execute(sql`
    SELECT
      o.order_number,
      o.customer,
      o.order_date,
      o.total_amount,
      o.status,
      o.is_paid,
      o.sales_channel,
      o.customer_segment,
      bc.company_domain_key,
      bc.is_individual_customer,
      SUM(COALESCE(li.product_service_quantity::numeric, 0)) AS sku_quantity,
      SUM(COALESCE(li.product_service_amount::numeric, 0)) AS sku_amount,
      COUNT(*) AS sku_line_count
    FROM analytics_mart.fct_order_line_items li
    INNER JOIN analytics_mart.base_fct_orders_current o
      ON li.order_key = o.order_key
    LEFT JOIN analytics_mart.bridge_customer_company bc
      ON o.customer = bc.customer_name
    WHERE li.product_service = ${productName}
      AND li.product_service_amount IS NOT NULL
      AND li.product_service_amount::numeric > 0
    GROUP BY
      o.order_key,
      o.order_number,
      o.customer,
      o.order_date,
      o.total_amount,
      o.status,
      o.is_paid,
      o.sales_channel,
      o.customer_segment,
      bc.company_domain_key,
      bc.is_individual_customer
    ORDER BY o.order_date DESC NULLS LAST, o.order_number DESC
    LIMIT ${limit}
  `);

  const results = rows as unknown as Array<{
    order_number: string | null;
    customer: string | null;
    order_date: string | Date | null;
    total_amount: string | number | null;
    status: string | null;
    is_paid: boolean | null;
    sales_channel: string | null;
    customer_segment: string | null;
    company_domain_key: string | null;
    is_individual_customer: boolean | null;
    sku_quantity: string | number | null;
    sku_amount: string | number | null;
    sku_line_count: string | number | null;
  }>;

  return results.map((order) => ({
    orderNumber: order.order_number || 'N/A',
    customer: order.customer || 'Unknown',
    orderDate: order.order_date == null ? '' : String(order.order_date),
    totalAmount: Number(order.total_amount || 0).toFixed(2),
    status: order.status || 'Unknown',
    isPaid: Boolean(order.is_paid),
    salesChannel: order.sales_channel,
    customerSegment: order.customer_segment,
    companyDomain: order.company_domain_key,
    isIndividualCustomer: Boolean(order.is_individual_customer),
    skuQuantity: Number(order.sku_quantity || 0).toFixed(2),
    skuAmount: Number(order.sku_amount || 0).toFixed(2),
    skuLineCount: Number(order.sku_line_count || 0),
  }));
}
