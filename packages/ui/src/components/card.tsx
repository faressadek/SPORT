import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `flat` sits on the page with a hairline; `raised` lifts a little for grouped content. */
  tone?: 'flat' | 'raised' | 'sunken' | 'pitch';
  padded?: boolean;
}

export function Card({ tone = 'flat', padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg',
        tone === 'flat' && 'border border-line bg-surface',
        tone === 'raised' && 'border border-line bg-surface shadow-raised',
        tone === 'sunken' && 'bg-sunken',
        tone === 'pitch' && 'bg-pitch text-on-pitch',
        padded && 'p-4 sm:p-5',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-3 flex items-start justify-between gap-3', className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-display text-xl font-extrabold leading-tight', className)} {...props} />
  );
}
