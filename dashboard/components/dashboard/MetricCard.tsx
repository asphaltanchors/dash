import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  previousValue?: string;
  change?: number;
  icon: LucideIcon;
  formatValue?: (value: string) => string;
}

export function MetricCard({ 
  title, 
  value, 
  previousValue, 
  change, 
  icon: Icon,
  formatValue = (val) => val 
}: MetricCardProps) {
  const changeColor = change === undefined ? 'text-gray-500' : 
    change > 0 ? 'text-green-600' : 
    change < 0 ? 'text-red-600' : 'text-gray-500';
  
  const ChangeIcon = change === undefined ? null :
    change > 0 ? ArrowUpIcon : 
    change < 0 ? ArrowDownIcon : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${changeColor} mt-1`}>
            {ChangeIcon && <ChangeIcon className="h-3 w-3 mr-1" />}
            <span>
              {change > 0 ? '+' : ''}{change.toFixed(1)}% from last period
            </span>
          </div>
        )}
        {previousValue && change === undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            Previous: {formatValue(previousValue)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}