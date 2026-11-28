'use client';

import { cn } from '../lib/cn';
import { formatMoney, minutesOf, type Locale } from '../lib/format';
import { Skeleton } from './skeleton';

export interface TimeSlot {
  id: string;
  /** "HH:mm" in the branch's local time (Cairo). */
  start: string;
  end: string;
  status: 'available' | 'taken' | 'blocked';
  /** Price for this slot in minor units, when it varies by hour. */
  price?: number;
}

export type SlotSelectionMode = 'single' | 'range';

/**
 * Pure selection rule, exported for tests.
 * `range` keeps one unbroken run of available, back-to-back slots
 * (book 19:00–21:00 as two hours). Tapping an end of the run shrinks it;
 * tapping a slot that doesn't touch the run starts a new one.
 */
export function nextSelection(
  slots: TimeSlot[],
  value: string[],
  id: string,
  mode: SlotSelectionMode,
): string[] {
  const slot = slots.find((s) => s.id === id);
  if (!slot || slot.status !== 'available') return value;
  if (mode === 'single') return value[0] === id ? [] : [id];

  const idx = (sid: string) => slots.findIndex((s) => s.id === sid);
  const run = [...value].sort((a, b) => idx(a) - idx(b));
  if (run.length === 0) return [id];
  const firstId = run[0]!;
  const lastId = run[run.length - 1]!;
  if (id === firstId) return run.slice(1);
  if (id === lastId) return run.slice(0, -1);
  if (run.includes(id)) return [id];

  const first = slots[idx(firstId)]!;
  const last = slots[idx(lastId)]!;
  if (slot.end === first.start) return [id, ...run];
  if (slot.start === last.end) return [...run, id];
  return [id];
}

export interface TimeSlotGridProps {
  slots: TimeSlot[];
  value: string[];
  onChange: (ids: string[]) => void;
  mode?: SlotSelectionMode;
  currency?: string;
  locale?: Locale;
  loading?: boolean;
  /** Shown when there are no slots at all for the day. */
  emptyMessage?: string;
  className?: string;
}

const PERIODS = [
  { key: 'morning', label: 'Morning', from: 0, to: 12 * 60 },
  { key: 'afternoon', label: 'Afternoon', from: 12 * 60, to: 17 * 60 },
  { key: 'evening', label: 'Evening', from: 17 * 60, to: 24 * 60 + 1 },
] as const;

/** Times read like a scoreboard; the chosen ones turn lime. */
export function TimeSlotGrid({
  slots,
  value,
  onChange,
  mode = 'single',
  currency = 'EGP',
  locale = 'en',
  loading,
  emptyMessage = 'No times on this day. Try another date.',
  className,
}: TimeSlotGridProps) {
  if (loading) {
    return (
      <div
        role="status"
        className={cn('grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6', className)}
      >
        <span className="sr-only">Loading times…</span>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p
        className={cn(
          'rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-muted',
          className,
        )}
      >
        {emptyMessage}
      </p>
    );
  }

  const freeCount = slots.filter((s) => s.status === 'available').length;

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {freeCount === 0 ? (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm font-medium text-warning">
          Fully booked on this day. Try another date.
        </p>
      ) : null}
      {PERIODS.map((p) => {
        const list = slots.filter((s) => {
          const m = minutesOf(s.start);
          return m >= p.from && m < p.to;
        });
        if (!list.length) return null;
        return (
          <fieldset key={p.key}>
            <legend className="mb-2 text-sm font-semibold text-ink-muted">{p.label}</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {list.map((s) => {
                const selected = value.includes(s.id);
                const free = s.status === 'available';
                const statusText = free
                  ? selected
                    ? 'selected'
                    : 'available'
                  : s.status === 'taken'
                    ? 'booked'
                    : 'unavailable';
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={selected}
                    aria-disabled={!free || undefined}
                    aria-label={`${s.start} to ${s.end}, ${statusText}${s.price != null && free ? `, ${formatMoney(s.price, currency, locale)}` : ''}`}
                    onClick={() => free && onChange(nextSelection(slots, value, s.id, mode))}
                    className={cn(
                      'flex min-h-16 flex-col items-center justify-center rounded-md border px-1 transition-colors duration-(--duration-press)',
                      free &&
                        !selected &&
                        'border-line-strong bg-surface text-ink hover:border-pitch dark:hover:border-action',
                      selected && 'border-pitch bg-action text-on-action dark:border-action',
                      !free && 'cursor-not-allowed border-transparent bg-sunken text-ink-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'scoreboard text-xl font-extrabold leading-none',
                        !free && 'line-through decoration-1',
                      )}
                      aria-hidden
                    >
                      {s.start}
                    </span>
                    <span className="mt-1 text-xs" aria-hidden>
                      {free
                        ? s.price != null
                          ? formatMoney(s.price, currency, locale)
                          : 'Open'
                        : s.status === 'taken'
                          ? 'Booked'
                          : 'Closed'}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
