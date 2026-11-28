import { describe, expect, it } from 'vitest';
import { addDays, formatMoney, hhmm, minutesOf } from '../src/lib/format';

describe('formatMoney', () => {
  it('formats whole EGP from piastres without decimals', () => {
    expect(formatMoney(35000, 'EGP')).toBe('EGP 350');
  });
  it('keeps decimals when there are piastres', () => {
    expect(formatMoney(35050, 'EGP')).toBe('EGP 350.50');
  });
});

describe('dates and times', () => {
  it('adds days across a month end without timezone drift', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });
  it('round-trips HH:mm', () => {
    expect(minutesOf('19:30')).toBe(1170);
    expect(hhmm(1170)).toBe('19:30');
  });
});
