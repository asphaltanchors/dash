// ABOUTME: Order-related queries including detailed order information and line items
// ABOUTME: Handles order searches, pagination, filtering, and order line item management
import { db, fctOrdersInAnalyticsMart, fctOrderLineItemsInAnalyticsMart } from '@/lib/db';
import { desc, asc, sql, count, and } from 'drizzle-orm';

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