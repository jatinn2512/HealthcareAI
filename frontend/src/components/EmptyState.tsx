import React from 'react';
import { cn } from '@/lib/utils';
import { FolderOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/45 p-8 text-center animate-fade-in",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground ring-8 ring-background/50">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
