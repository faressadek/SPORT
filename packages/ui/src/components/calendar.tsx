'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { hhmm, minutesOf } from '../lib/format';
import { Skeleton } from './skeleton';

export type CalendarEventKind = 'booking' | 'walk_in' | 'closed' | 'hold';

export interface CalendarEvent {
  id: string;
  /** Which column the event sits in: a court id (day view) or a date (week view). */
  columnId: string;
  start: string; // "HH:mm"
  end: string; // "HH:mm" ("24:00" allowed)
  title: string;
  subtitle?: string;
  kind: CalendarEventKind;
}

export interface CalendarColumn {
  id: string;
  label: string;
  sublabel?: string;
}

export interface CalendarProps {
  /**
   * Day view: one column per court. Week view: one column per day for one court.
   * Either way the grid is the same; the caller decides what a column is.
   */
  columns: CalendarColumn[];
  events: CalendarEvent[];
  /** Opening hours shown, in whole hours. */
  fromHour?: number;
  toHour?: number;
  /** Minutes after midnight for the "now" line, when today is on screen. */
  nowMinutes?: number;
  /** Tap an empty hour: add a walk-in or block it. */
  onSlotClick?: (columnId: string, start: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  slotActionLabel?: string;
  loading?: boolean;
  label: string;
  className?: string;
}

const HOUR_PX = 56;

const KIND_STYLE: Record<CalendarEventKind, string> = {
  booking:
    'bg-pitch text-on-pitch border-pitch-raised dark:bg-pitch-raised dark:border-line-strong',
  walk_in: 'bg-info-soft text-info border-info/50',
  hold: 'bg-warning-soft text-warning border-warning/60 border-dashed',
  closed:
    'bg-sunken text-ink-muted border-line-strong bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--c-line)_6px_8px)]',
};

export const CALENDAR_KIND_LABEL: Record<CalendarEventKind, string> = {
  booking: 'Booking',
  walk_in: 'Walk-in',
  hold: 'Held at checkout',
  closed: 'Closed',
};

/** Day/week grid for court owners and coaches (SPEC R16). */
export function Calendar({
  columns,
  events,
  fromHour = 7,
  toHour = 24,
  nowMinutes,
  onSlotClick,
  onEventClick,
  slotActionLabel = 'Add walk-in',
  loading,
  label,
  className,
}: CalendarProps) {
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const height = hours.length * HOUR_PX;
  const top = (t: string) => ((minutesOf(t) - fromHour * 60) / 60) * HOUR_PX;

  if (loading) {
    return (
      <div role="status" className={cn('rounded-lg border border-line bg-surface p-4', className)}>
        <span className="sr-only">Loading calendar…</span>
        <Skeleton className="mb-3 h-8 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn('overflow-hidden rounded-lg border border-line bg-surface', className)}
      role="region"
      aria-label={label}
    >
      <div className="max-h-[70dvh] overflow-auto">
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(9rem, 1fr))` }}
        >
          {/* header */}
          <div className="sticky top-0 start-0 z-30 border-b border-line bg-surface" />
          {columns.map((c) => (
            <div
              key={c.id}
              className="sticky top-0 z-20 border-b border-s border-line bg-surface px-3 py-2"
            >
              <p className="font-display text-lg font-extrabold leading-tight text-ink">
                {c.label}
              </p>
              {c.sublabel ? <p className="text-xs text-ink-muted">{c.sublabel}</p> : null}
            </div>
          ))}

          {/* time gutter */}
          <div className="sticky start-0 z-10 bg-surface" style={{ height }}>
            {hours.map((h) => (
              <div key={h} className="relative border-line" style={{ height: HOUR_PX }}>
                <span className="scoreboard absolute top-1 end-2 text-sm font-bold text-ink-muted">
                  {hhmm(h * 60)}
                </span>
              </div>
            ))}
          </div>

          {columns.map((c) => {
            const colEvents = events.filter((e) => e.columnId === c.id);
            return (
              <div key={c.id} className="relative border-s border-line" style={{ height }}>
                {hours.map((h) => {
                  const start = hhmm(h * 60);
                  const busy = colEvents.some(
                    (e) => minutesOf(e.start) < (h + 1) * 60 && minutesOf(e.end) > h * 60,
                  );
                  return (
                    <div
                      key={h}
                      className="border-t border-line first:border-t-0"
                      style={{ height: HOUR_PX }}
                    >
                      {onSlotClick && !busy ? (
                        <button
                          type="button"
                          onClick={() => onSlotClick(c.id, start)}
                          aria-label={`${slotActionLabel}, ${c.label}, ${start}`}
                          className="group flex size-full items-center justify-center text-ink-muted hover:bg-sunken focus-visible:bg-sunken"
                        >
                          <Plus
                            className="size-4 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                            aria-hidden
                          />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                {colEvents.map((e) => {
                  const y = top(e.start);
                  const h = Math.max(24, top(e.end) - y - 2);
                  const body = (
                    <>
                      <span className="block truncate text-sm font-semibold">{e.title}</span>
                      {h > 36 ? (
                        <span className="scoreboard block text-sm opacity-90">
                          {e.start}–{e.end}
                        </span>
                      ) : null}
                      {e.subtitle && h > 60 ? (
                        <span className="block truncate text-xs opacity-90">{e.subtitle}</span>
                      ) : null}
                    </>
                  );
                  const cls = cn(
                    'absolute inset-x-1 overflow-hidden rounded-sm border px-2 py-1 text-start',
                    KIND_STYLE[e.kind],
                  );
                  const style = { top: y + 1, height: h };
                  const aria = `${CALENDAR_KIND_LABEL[e.kind]}: ${e.title}, ${c.label}, ${e.start} to ${e.end}`;
                  return onEventClick ? (
                    <button
                      key={e.id}
                      type="button"
                      className={cls}
                      style={style}
                      aria-label={aria}
                      onClick={() => onEventClick(e)}
                    >
                      {body}
                    </button>
                  ) : (
                    <div key={e.id} className={cls} style={style} role="note" aria-label={aria}>
                      {body}
                    </div>
                  );
                })}
                {nowMinutes != null && nowMinutes >= fromHour * 60 && nowMinutes <= toHour * 60 ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-[5] h-0.5 bg-danger"
                    style={{ top: ((nowMinutes - fromHour * 60) / 60) * HOUR_PX }}
                    aria-hidden
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export interface CalendarToolbarProps {
  title: ReactNode;
  view: 'day' | 'week';
  onViewChange: (v: 'day' | 'week') => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  extra?: ReactNode;
}

export function CalendarToolbar({
  title,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  extra,
}: CalendarToolbarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onPrev}
          aria-label={view === 'day' ? 'Previous day' : 'Previous week'}
          className="flex size-11 items-center justify-center rounded-md hover:bg-sunken"
        >
          <ChevronLeft className="rtl-flip size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label={view === 'day' ? 'Next day' : 'Next week'}
          className="flex size-11 items-center justify-center rounded-md hover:bg-sunken"
        >
          <ChevronRight className="rtl-flip size-5" aria-hidden />
        </button>
      </div>
      <h2 className="me-auto font-display text-2xl font-extrabold text-ink" aria-live="polite">
        {title}
      </h2>
      <button
        type="button"
        onClick={onToday}
        className="min-h-11 rounded-md border border-line-strong px-3 text-sm font-semibold hover:bg-sunken"
      >
        Today
      </button>
      <div
        role="group"
        aria-label="Calendar view"
        className="flex rounded-md border border-line-strong"
      >
        {(['day', 'week'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => onViewChange(v)}
            className={cn(
              'min-h-11 rounded-sm px-3 text-sm font-semibold capitalize',
              view === v ? 'bg-pitch text-on-pitch' : 'text-ink-muted hover:text-ink',
            )}
          >
            {v}
          </button>
        ))}
      </div>
      {extra}
    </div>
  );
}

export function CalendarLegend({
  kinds = ['booking', 'walk_in', 'hold', 'closed'],
}: {
  kinds?: CalendarEventKind[];
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label="Legend">
      {kinds.map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className={cn('size-3 rounded-[3px] border', KIND_STYLE[k])} aria-hidden />
          {CALENDAR_KIND_LABEL[k]}
        </li>
      ))}
    </ul>
  );
}
