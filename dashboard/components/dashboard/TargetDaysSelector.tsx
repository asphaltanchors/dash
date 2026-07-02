// ABOUTME: Target days selector for reorder planning showing 90-day vs 180-day inventory targets
// ABOUTME: Updates URL parameters to toggle between different inventory target horizons
'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface TargetDaysSelectorProps {
  currentTarget: number;
}

export function TargetDaysSelector({ currentTarget = 90 }: TargetDaysSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTargetChange = (newTarget: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('target', newTarget.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Inventory Target:</span>
      <div className="flex items-center gap-1">
        <Button
          variant={currentTarget === 90 ? "default" : "outline"}
          size="sm"
          onClick={() => handleTargetChange(90)}
        >
          90 Days
        </Button>
        <Button
          variant={currentTarget === 180 ? "default" : "outline"}
          size="sm"
          onClick={() => handleTargetChange(180)}
        >
          180 Days
        </Button>
      </div>
    </div>
  );
}
