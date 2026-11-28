import { Star } from 'lucide-react';
import { cn } from '../lib/cn';

export interface RatingProps {
  /** Average from 0 to 5. */
  value: number;
  count?: number;
  /** `compact` = one star + number (cards); `stars` = five stars (profiles, reviews). */
  variant?: 'compact' | 'stars';
  className?: string;
}

export function Rating({ value, count, variant = 'compact', className }: RatingProps) {
  const clamped = Math.max(0, Math.min(5, value));
  const shown = clamped.toFixed(1);
  const label =
    count === 0
      ? 'No reviews yet'
      : `Rated ${shown} out of 5${count !== undefined ? ` from ${count} review${count === 1 ? '' : 's'}` : ''}`;

  if (count === 0) {
    return <span className={cn('text-sm text-ink-muted', className)}>New</span>;
  }

  if (variant === 'compact') {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-sm', className)}
        role="img"
        aria-label={label}
      >
        <Star className="size-4 fill-current text-warning" aria-hidden />
        <span className="font-semibold text-ink">{shown}</span>
        {count !== undefined ? <span className="text-ink-muted">({count})</span> : null}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)} role="img" aria-label={label}>
      <span className="inline-flex" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, clamped - i));
          return (
            <span key={i} className="relative size-5">
              <Star className="absolute inset-0 size-5 text-line-strong" />
              <span
                className="absolute inset-y-0 start-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className="size-5 fill-current text-warning" />
              </span>
            </span>
          );
        })}
      </span>
      <span className="scoreboard text-lg font-bold text-ink" aria-hidden>
        {shown}
      </span>
      {count !== undefined ? (
        <span className="text-sm text-ink-muted" aria-hidden>
          {count} review{count === 1 ? '' : 's'}
        </span>
      ) : null}
    </span>
  );
}
