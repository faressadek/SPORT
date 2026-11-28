'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../lib/cn';
import { addDays, formatDay, parseISODate, toISODate, type Locale } from '../lib/format';
import { Dialog, DialogContent, DialogTrigger } from './dialog';

export interface DatePickerProps {
  /** Selected day, "YYYY-MM-DD". */
  value: string | null;
  onChange: (iso: string) => void;
  /** First bookable day (normally today in Cairo time). */
  from: string;
  /** How many days the strip shows. */
  days?: number;
  /** Last day that can be picked in the month view. */
  until?: string;
  isDisabled?: (iso: string) => boolean;
  label?: string;
  locale?: Locale;
  className?: string;
}

/**
 * Day strip for the next two weeks (most bookings are this week), with a
 * month view for anything further out.
 */
export function DatePicker({
  value,
  onChange,
  from,
  days = 14,
  until,
  isDisabled,
  label = 'Date',
  locale = 'en',
  className,
}: DatePickerProps) {
  const strip = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(from, i)),
    [from, days],
  );
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = value ? strip.indexOf(value) : -1;
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const [monthOpen, setMonthOpen] = useState(false);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const rtl = (e.currentTarget as HTMLElement).closest('[dir="rtl"]') !== null;
    const step =
      e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
    let next = i;
    if (step) next = Math.max(0, Math.min(strip.length - 1, i + step));
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = strip.length - 1;
    else return;
    e.preventDefault();
    refs.current[next]?.focus();
    const iso = strip[next];
    if (iso && !isDisabled?.(iso)) onChange(iso);
  };

  const outsideStrip = value && selectedIndex < 0;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span id="date-picker-label" className="text-sm font-semibold text-ink">
          {label}
        </span>
        <Dialog open={monthOpen} onOpenChange={setMonthOpen}>
          <DialogTrigger className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-semibold text-link hover:bg-sunken">
            <CalendarDays className="size-4" aria-hidden />
            {outsideStrip ? formatDay(value, locale) : 'Later date'}
          </DialogTrigger>
          <DialogContent title="Pick a date">
            <MonthGrid
              value={value}
              min={from}
              max={until}
              isDisabled={isDisabled}
              locale={locale}
              onPick={(iso) => {
                onChange(iso);
                setMonthOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="date-picker-label"
        className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      >
        {strip.map((iso, i) => {
          const disabled = isDisabled?.(iso) ?? false;
          const selected = iso === value;
          const d = parseISODate(iso);
          return (
            <button
              key={iso}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={
                formatDay(iso, locale, { weekday: 'long', month: 'long' }) +
                (disabled ? ', unavailable' : '')
              }
              aria-disabled={disabled || undefined}
              tabIndex={i === focusIndex ? 0 : -1}
              onClick={() => !disabled && onChange(iso)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'flex min-h-16 w-14 shrink-0 snap-start flex-col items-center justify-center rounded-md border text-ink',
                'transition-colors duration-(--duration-press)',
                selected
                  ? 'border-pitch bg-action text-on-action dark:border-action'
                  : 'border-line bg-surface hover:border-line-strong',
                disabled &&
                  'cursor-not-allowed border-dashed bg-sunken text-ink-muted line-through',
              )}
            >
              <span className="text-xs font-semibold" aria-hidden>
                {i === 0 && iso === from
                  ? 'Today'
                  : formatDay(iso, locale, { weekday: 'short', day: undefined, month: undefined })}
              </span>
              <span className="scoreboard text-2xl font-extrabold leading-none" aria-hidden>
                {d.getUTCDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MonthGridProps {
  value: string | null;
  min: string;
  max?: string;
  isDisabled?: (iso: string) => boolean;
  onPick: (iso: string) => void;
  locale?: Locale;
}

/** A plain month grid. Weeks start on Saturday, as in Egypt. */
export function MonthGrid({ value, min, max, isDisabled, onPick, locale = 'en' }: MonthGridProps) {
  const start = parseISODate(value ?? min);
  const [cursor, setCursor] = useState({ y: start.getUTCFullYear(), m: start.getUTCMonth() });
  const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
  const lead = (first.getUTCDay() + 1) % 7; // Saturday = 0
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toISODate(new Date(Date.UTC(cursor.y, cursor.m, i + 1))),
    ),
  ];
  const fmt = locale === 'ar' ? 'ar-EG' : 'en-GB';
  const monthLabel = new Intl.DateTimeFormat(fmt, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(first);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(fmt, { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2026, 0, 3 + i)),
    ),
  );
  const shift = (delta: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  const prevDisabled = toISODate(new Date(Date.UTC(cursor.y, cursor.m, 0))) < min;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={prevDisabled}
          aria-label="Previous month"
          className="flex size-11 items-center justify-center rounded-md hover:bg-sunken disabled:opacity-40"
        >
          <ChevronLeft className="rtl-flip size-5" aria-hidden />
        </button>
        <span className="font-display text-xl font-extrabold" aria-live="polite">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="flex size-11 items-center justify-center rounded-md hover:bg-sunken"
        >
          <ChevronRight className="rtl-flip size-5" aria-hidden />
        </button>
      </div>
      <div role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-1 text-center">
        <div role="row" className="contents">
          {weekdays.map((w) => (
            <span role="columnheader" key={w} className="py-1 text-xs font-semibold text-ink-muted">
              {w}
            </span>
          ))}
        </div>
        <div role="row" className="contents">
          {cells.map((iso, i) => {
            if (!iso) return <span key={`blank-${i}`} role="gridcell" />;
            const disabled = iso < min || (max ? iso > max : false) || (isDisabled?.(iso) ?? false);
            const selected = iso === value;
            return (
              <span role="gridcell" key={iso}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={formatDay(iso, locale, { weekday: 'long', month: 'long' })}
                  onClick={() => onPick(iso)}
                  className={cn(
                    'scoreboard size-11 rounded-md text-lg font-bold',
                    selected ? 'bg-action text-on-action' : 'hover:bg-sunken',
                    disabled && 'text-ink-muted/50 line-through hover:bg-transparent',
                  )}
                >
                  {Number(iso.slice(8))}
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
