'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import { cn } from '@/app/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  iconColor?: string;
}

export function StatCard({ title, value, icon: Icon, change, changeType = 'neutral', iconColor }: StatCardProps) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: iconColor ? `${iconColor}15` : 'hsl(var(--primary) / 0.1)' }}>
            <Icon className="h-5 w-5" style={{ color: iconColor || 'hsl(var(--primary))' }} />
          </div>
          {change && (
            <span
              className={cn(
                'text-xs font-medium',
                changeType === 'positive' && 'text-success',
                changeType === 'negative' && 'text-destructive',
                changeType === 'neutral' && 'text-muted-foreground'
              )}
            >
              {change}
            </span>
          )}
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}
