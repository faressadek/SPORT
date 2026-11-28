import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { PitchLines } from './pitch-lines';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** The next step: a button or link that fills the emptiness. */
  action?: ReactNode;
  className?: string;
}

/** An empty screen is an invitation to act, so it always offers a next step when there is one. */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center overflow-hidden rounded-lg border border-dashed border-line-strong px-6 py-10 text-center',
        className,
      )}
    >
      <PitchLines variant="box" className="text-line opacity-80" />
      <div className="relative flex flex-col items-center gap-3">
        {icon ? (
          <span
            className="flex size-12 items-center justify-center rounded-full bg-sunken text-pitch dark:text-action"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <h3 className="font-display text-xl font-extrabold text-ink">{title}</h3>
        {description ? <p className="max-w-sm text-sm text-ink-muted">{description}</p> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

export interface ErrorStateProps {
  title?: ReactNode;
  /** Say what went wrong and what to do about it. */
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "This didn't load",
  description = 'Check your connection, then try again.',
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-danger/40 bg-danger-soft px-6 py-8 text-center',
        className,
      )}
    >
      <AlertTriangle className="size-7 text-danger" aria-hidden />
      <h3 className="font-display text-xl font-extrabold text-ink">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-ink">{description}</p> : null}
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="mt-1">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
