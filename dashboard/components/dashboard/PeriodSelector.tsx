// ABOUTME: Simple period selector component with preset time period buttons
// ABOUTME: Updates URL parameters to enable shareable filtered views and saved view functionality
'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { getPeriodOptions, buildFilterUrl } from '@/lib/filter-utils';
import { useRouter, usePathname } from 'next/navigation';

interface PeriodSelectorProps {
  currentPeriod: string;
  filters?: Record<string, string | number | boolean | undefined>;
}

export function PeriodSelector({ currentPeriod = '30d', filters = {} }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const periods = getPeriodOptions();

  const handlePeriodChange = (newPeriod: string) => {
    const updatedFilters = { ...filters, period: newPeriod };
    const newUrl = buildFilterUrl(pathname, updatedFilters);
    router.push(newUrl);
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Period:</span>
      <div className="flex items-center gap-1">
        {periods.map((period) => (
          <Button
            key={period.value}
            variant={currentPeriod === period.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePeriodChange(period.value)}
          >
            {period.label}
          </Button>
        ))}
      </div>
    </div>
  );
}