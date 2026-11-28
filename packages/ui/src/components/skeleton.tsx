import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** A placeholder block with a slow sheen. Size it with width/height classes. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'rounded-sm bg-sunken bg-[linear-gradient(90deg,transparent_0%,rgb(255_255_255/0.35)_50%,transparent_100%)] bg-size-[200%_100%] animate-shimmer dark:bg-[linear-gradient(90deg,transparent_0%,rgb(255_255_255/0.05)_50%,transparent_100%)]',
        className,
      )}
      {...props}
    />
  );
}

/** Wraps skeletons so screen readers hear one "Loading…" instead of nothing. */
export function LoadingRegion({
  label = 'Loading',
  className,
  children,
}: HTMLAttributes<HTMLDivElement> & { label?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}
