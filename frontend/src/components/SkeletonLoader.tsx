import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card rounded-2xl border-border/50 p-5", className)}>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

export function SkeletonMetric({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card rounded-2xl border-border/50 p-4 sm:p-5", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}
