import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: string;
  color?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = 'from-indigo-500 to-purple-500',
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-extrabold tracking-tight">{value}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-md shadow-indigo-500/10`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {(description || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2.5">
          {description && <span>{description}</span>}
          {trend && (
            <span className="font-semibold text-emerald-500">{trend}</span>
          )}
        </div>
      )}
    </div>
  );
}
