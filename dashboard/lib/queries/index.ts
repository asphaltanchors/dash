// ABOUTME: Central export file for all database query functions and interfaces
// ABOUTME: Maintains backward compatibility while organizing queries by domain

// Dashboard queries and interfaces
export {
  getDashboardMetrics,
  getRecentOrders,
  getChannelMetrics,
  getSegmentMetrics,
  getWeeklyRevenue,
  getOrderStatusBreakdown,
  getDSOMetrics,
  getCurrentDSO,
  getARAgingDetails,
  getProblemAccounts,
  type DashboardMetrics,
  type RecentOrder,
  type WeeklyRevenue,
  type SalesPeriodMetric,
  type SalesChannelMetric,
  type DSOMetric,
  type ARAgingDetail,
} from './dashboard';

// Order queries and interfaces
export {
  getOrderByNumber,
  getOrderLineItems,
  getAllOrders,
  type OrderDetail,
  type OrderLineItem,
  type OrderTableItem,
  type OrdersResponse,
} from './orders';

// Product queries and interfaces
export {
  getProductMetrics,
  getProducts,
  getProductByName,
  getProductMonthlyRevenue,
  getProductPriceDistribution,
  type ProductMetrics,
  type Product,
  type ProductPriceDistribution,
} from './products';

// Inventory queries and interfaces
export {
  getProductInventoryStatus,
  getProductInventoryTrend,
  type InventorySnapshot,
  type InventoryTrend,
} from './inventory';

// Company queries and interfaces
export {
  getAllCompanies,
  getCompaniesWithHealth,
  getCompanyByDomain,
  getCompanyCustomers,
  getCompanyOrderTimeline,
  getCompanyProductAnalysis,
  getCompanyHealthBasic,
  getCompanyTimeSeriesData,
  type TopCompany,
  type CompanyWithHealth,
  type CompanyDetail,
  type CompanyCustomer,
  type CompanyOrder,
  type CompanyProduct,
  type CompanyHealthBasic,
  type CompanyTimeSeriesQuarter,
} from './companies';

// Family sales queries and interfaces
export {
  getFamilySales,
  getFamilyDetail,
  getFamilyProducts,
  getFamilyTopCustomers,
  type FamilySales,
  type FamilyDetail,
  type FamilyProduct,
  type FamilyCustomer,
} from './families';

// Contact queries and interfaces
export {
  getContacts,
  getCompanyContacts,
  type Contact,
  type ContactFilters,
} from './contacts';

// Reorder planning queries and interfaces
export {
  getReorderMetrics,
  getPriorityBreakdown,
  getStockoutTimeline,
  getReorderPlanningData,
  getProductFamiliesForReorder,
  type ReorderMetrics,
  type PriorityBreakdown,
  type StockoutTimelineItem,
  type ReorderItem,
} from './reorder-planning';