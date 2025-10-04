'use client';

import { Loader2 } from 'lucide-react';
import { LoadingSpinnerProps } from '@/interfaces/ui-components';
import { SPINNER_SIZE_CLASSES } from '@/config/loading';

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  className = '' 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={`animate-spin text-primary ${SPINNER_SIZE_CLASSES[size]}`} />
        {text && (
          <p className="text-sm text-muted-foreground">{text}</p>
        )}
      </div>
    </div>
  );
}

// Preset loading components for common use cases
export function PageLoadingSpinner({ text = 'Loading page...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function CardLoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg flex items-center justify-center">
      <LoadingSpinner size="md" text={text} />
    </div>
  );
}

export function ComponentLoadingSpinner({ text = 'Loading component...' }: { text?: string }) {
  return (
    <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded flex items-center justify-center">
      <LoadingSpinner size="md" text={text} />
    </div>
  );
}
