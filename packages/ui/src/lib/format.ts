/**
 * Formatting helpers. Money arrives in integer minor units (SPEC §5),
 * so 35000 piastres with currency EGP renders as "EGP 350".
 */

export type Locale = 'en' | 'ar';

const MINOR_UNITS: Record<string, number> = { EGP: 2, USD: 2, EUR: 2, KWD: 3 };

export function formatMoney(amountMinor: number, currency = 'EGP', locale: Locale = 'en'): string {
  const digits = MINOR_UNITS[currency] ?? 2;
  const major = amountMinor / 10 ** digits;
  const whole = Number.isInteger(major);
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: whole ? 0 : digits,
    maximumFractionDigits: whole ? 0 : digits,
  })
    .format(major)
    .replace(/\u00a0/g, ' ');
}

/** "YYYY-MM-DD" helpers that never shift a day because of the local timezone. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function formatDay(
  iso: string,
  locale: Locale = 'en',
  opts: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...opts,
  }).format(parseISODate(iso));
}

/** "HH:mm" (24h) → minutes after midnight. */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
