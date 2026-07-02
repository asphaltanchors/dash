import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { AttributionMetrics } from '@/lib/queries/marketing';

interface AttributionMetricCardsProps {
  metrics: AttributionMetrics;
}

export function AttributionMetricCards({ metrics }: AttributionMetricCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Attributed Revenue"
        value={metrics.totalAttributedRevenue}
        subtitle={`${metrics.attributedCustomerPercentage}% of customers`}
        icon={DollarSign}
        formatValue={(value) => formatCurrency(value)}
      />
      <MetricCard
        title="Attributed Orders"
        value={metrics.totalAttributedOrders.toString()}
        subtitle={`${metrics.totalAttributedCustomers} customers`}
        icon={ShoppingCart}
        formatValue={(value) => formatNumber(value, 0)}
      />
      <MetricCard
        title={`Top Channel: ${metrics.topChannel}`}
        value={metrics.topChannelRevenue}
        subtitle="Leading acquisition source"
        icon={TrendingUp}
        formatValue={(value) => formatCurrency(value)}
      />
      <MetricCard
        title="Avg Revenue Per Channel"
        value={metrics.avgRevenuePerChannel}
        subtitle="Channel performance average"
        icon={Users}
        formatValue={(value) => formatCurrency(value)}
      />
    </div>
  );
}
