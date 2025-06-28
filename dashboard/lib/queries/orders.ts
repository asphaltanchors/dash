// ABOUTME: Order-related queries including detailed order information and line items
// ABOUTME: Handles order searches, pagination, filtering, and order line item management
import { db, baseFctOrdersCurrentInAnalyticsMart, fctOrderLineItemsInAnalyticsMart, bridgeCustomerCompanyInAnalyticsMart } from '@/lib/db';
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
  companyDomain: string | null;
  isIndividualCustomer: boolean;
}

export interface OrdersResponse {
  orders: OrderTableItem[];
  totalCount: number;
}

// Get single order by order number
export async function getOrderByNumber(orderNumber: string): Promise<OrderDetail | null> {
  const orders = await db
    .select({
      orderNumber: baseFctOrdersCurrentInAnalyticsMart.orderNumber,
      customer: baseFctOrdersCurrentInAnalyticsMart.customer,
      orderDate: baseFctOrdersCurrentInAnalyticsMart.orderDate,
      dueDate: baseFctOrdersCurrentInAnalyticsMart.dueDate,
      shipDate: baseFctOrdersCurrentInAnalyticsMart.shipDate,
      totalAmount: baseFctOrdersCurrentInAnalyticsMart.totalAmount,
      totalLineItemsAmount: baseFctOrdersCurrentInAnalyticsMart.totalLineItemsAmount,
      totalTax: baseFctOrdersCurrentInAnalyticsMart.totalTax,
      effectiveTaxRate: baseFctOrdersCurrentInAnalyticsMart.effectiveTaxRate,
      status: baseFctOrdersCurrentInAnalyticsMart.status,
      isPaid: baseFctOrdersCurrentInAnalyticsMart.isPaid,
      paymentMethod: baseFctOrdersCurrentInAnalyticsMart.paymentMethod,
      shippingMethod: baseFctOrdersCurrentInAnalyticsMart.shippingMethod,
      salesRep: baseFctOrdersCurrentInAnalyticsMart.salesRep,
      currency: baseFctOrdersCurrentInAnalyticsMart.currency,
      billingAddress: baseFctOrdersCurrentInAnalyticsMart.billingAddress,
      billingAddressCity: baseFctOrdersCurrentInAnalyticsMart.billingAddressCity,
      billingAddressState: baseFctOrdersCurrentInAnalyticsMart.billingAddressState,
      billingAddressPostalCode: baseFctOrdersCurrentInAnalyticsMart.billingAddressPostalCode,
      billingAddressCountry: baseFctOrdersCurrentInAnalyticsMart.billingAddressCountry,
      shippingAddress: baseFctOrdersCurrentInAnalyticsMart.shippingAddress,
      shippingAddressCity: baseFctOrdersCurrentInAnalyticsMart.shippingAddressCity,
      shippingAddressState: baseFctOrdersCurrentInAnalyticsMart.shippingAddressState,
      shippingAddressPostalCode: baseFctOrdersCurrentInAnalyticsMart.shippingAddressPostalCode,
      shippingAddressCountry: baseFctOrdersCurrentInAnalyticsMart.shippingAddressCountry,
      companyDomain: bridgeCustomerCompanyInAnalyticsMart.companyDomainKey,
      isIndividualCustomer: bridgeCustomerCompanyInAnalyticsMart.isIndividualCustomer,
    })
    .from(baseFctOrdersCurrentInAnalyticsMart)
    .leftJoin(
      bridgeCustomerCompanyInAnalyticsMart,
      eq(baseFctOrdersCurrentInAnalyticsMart.customer, bridgeCustomerCompanyInAnalyticsMart.customerName)
    )
    .where(sql`${baseFctOrdersCurrentInAnalyticsMart.orderNumber} = ${orderNumber}`)
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
  let whereClause = sql`${baseFctOrdersCurrentInAnalyticsMart.totalAmount} is not null`;
  
  if (searchTerm) {
    whereClause = and(
      whereClause,
      sql`(${baseFctOrdersCurrentInAnalyticsMart.orderNumber} ILIKE ${`%${searchTerm}%`} OR ${baseFctOrdersCurrentInAnalyticsMart.customer} ILIKE ${`%${searchTerm}%`})`
    )!;
  }

  // Build the order clause
  let orderClause;
  if (sortBy === 'orderDate') {
    orderClause = sortOrder === 'desc' ? desc(baseFctOrdersCurrentInAnalyticsMart.orderDate) : asc(baseFctOrdersCurrentInAnalyticsMart.orderDate);
  } else if (sortBy === 'totalAmount') {
    orderClause = sortOrder === 'desc' ? desc(baseFctOrdersCurrentInAnalyticsMart.totalAmount) : asc(baseFctOrdersCurrentInAnalyticsMart.totalAmount);
  } else if (sortBy === 'customer') {
    orderClause = sortOrder === 'desc' ? desc(baseFctOrdersCurrentInAnalyticsMart.customer) : asc(baseFctOrdersCurrentInAnalyticsMart.customer);
  } else if (sortBy === 'orderNumber') {
    orderClause = sortOrder === 'desc' ? desc(baseFctOrdersCurrentInAnalyticsMart.orderNumber) : asc(baseFctOrdersCurrentInAnalyticsMart.orderNumber);
  } else {
    orderClause = desc(baseFctOrdersCurrentInAnalyticsMart.orderDate); // default
  }

  // Get the orders
  const orders = await db
    .select({
      orderNumber: baseFctOrdersCurrentInAnalyticsMart.orderNumber,
      customer: baseFctOrdersCurrentInAnalyticsMart.customer,
      orderDate: baseFctOrdersCurrentInAnalyticsMart.orderDate,
      totalAmount: baseFctOrdersCurrentInAnalyticsMart.totalAmount,
      status: baseFctOrdersCurrentInAnalyticsMart.status,
      isPaid: baseFctOrdersCurrentInAnalyticsMart.isPaid,
      dueDate: baseFctOrdersCurrentInAnalyticsMart.dueDate,
      shipDate: baseFctOrdersCurrentInAnalyticsMart.shipDate,
      companyDomain: bridgeCustomerCompanyInAnalyticsMart.companyDomainKey,
      isIndividualCustomer: bridgeCustomerCompanyInAnalyticsMart.isIndividualCustomer,
    })
    .from(baseFctOrdersCurrentInAnalyticsMart)
    .leftJoin(
      bridgeCustomerCompanyInAnalyticsMart,
      eq(baseFctOrdersCurrentInAnalyticsMart.customer, bridgeCustomerCompanyInAnalyticsMart.customerName)
    )
    .where(whereClause)
    .orderBy(orderClause)
    .limit(limit)
    .offset(offset);

  // Get the total count for pagination
  const countResult = await db
    .select({ count: count() })
    .from(baseFctOrdersCurrentInAnalyticsMart)
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
      dueDate: order.dueDate as string | null,
      shipDate: order.shipDate as string | null,
      companyDomain: order.companyDomain,
      isIndividualCustomer: order.isIndividualCustomer || false,
    })),
    totalCount,
  };
}