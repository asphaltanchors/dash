import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { CampaignPerformance } from '@/lib/queries/marketing';

interface CampaignPerformanceTableProps {
  campaigns: CampaignPerformance[];
}

export function CampaignPerformanceTable({ campaigns }: CampaignPerformanceTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No campaign data available for the selected period</p>
        <p className="text-sm mt-1">UTM parameters must be present for attribution</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Medium</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Customers</TableHead>
            <TableHead className="text-right">AOV</TableHead>
            <TableHead className="text-right">Opt-Ins</TableHead>
            <TableHead className="text-right">Opt-In Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign, index) => {
            const campaignKey = `${campaign.utmSource || 'none'}-${campaign.utmMedium || 'none'}-${campaign.utmCampaign || 'none'}-${index}`;
            const optInRateValue = parseFloat(campaign.optInRate);

            return (
              <TableRow key={campaignKey}>
                <TableCell className="font-medium">
                  {campaign.utmCampaign || <span className="text-muted-foreground italic">(not set)</span>}
                </TableCell>
                <TableCell>
                  {campaign.utmSource ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {campaign.utmSource}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground italic text-sm">(not set)</span>
                  )}
                </TableCell>
                <TableCell>
                  {campaign.utmMedium ? (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {campaign.utmMedium}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground italic text-sm">(not set)</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(parseFloat(campaign.totalRevenue))}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(campaign.orderCount, 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(campaign.customerCount, 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(parseFloat(campaign.avgOrderValue))}
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-muted-foreground">
                    {formatNumber(campaign.marketingOptIns, 0)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      optInRateValue >= 50 ? 'default' :
                      optInRateValue >= 25 ? 'secondary' : 'outline'
                    }
                    className="text-xs"
                  >
                    {campaign.optInRate}%
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
