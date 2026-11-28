import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'pitch' | 'action';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-soft text-ink',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  pitch: 'bg-pitch text-on-pitch',
  action: 'bg-action text-on-action',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
}

/** A small label for facts: sport, surface, indoor, "Free trial". */
export function Badge({ tone = 'neutral', icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold leading-5',
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Every status a booking, enquiry, application or operator can be in
 * (SPEC §4 R10, §5). One map so the same word always gets the same colour.
 */
export const STATUS_META = {
  // bookings
  pending_payment: { label: 'Awaiting payment', tone: 'warning' },
  pending: { label: 'Pending', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  refunded: { label: 'Refunded', tone: 'info' },
  partially_refunded: { label: 'Partly refunded', tone: 'info' },
  // enquiries
  waiting: { label: 'Waiting for reply', tone: 'warning' },
  replied: { label: 'Replied', tone: 'info' },
  booked: { label: 'Booked', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
  // refunds
  requested: { label: 'Refund requested', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  paid: { label: 'Paid', tone: 'success' },
  // operators and applications
  draft: { label: 'Draft', tone: 'neutral' },
  changes_requested: { label: 'Changes requested', tone: 'warning' },
  live: { label: 'Live', tone: 'success' },
  paused: { label: 'Paused', tone: 'neutral' },
} as const satisfies Record<string, { label: string; tone: BadgeTone }>;

export type StatusKey = keyof typeof STATUS_META;

export interface StatusPillProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  status: StatusKey;
  /** Override the default wording (e.g. a translated label). */
  label?: string;
}

export function StatusPill({ status, label, className, ...props }: StatusPillProps) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5',
        tones[meta.tone],
        className,
      )}
      {...props}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label ?? meta.label}
    </span>
  );
}
