import { describe, it, expect } from 'vitest';
import { daysLeft, endOfDayIsrael, formatBetaDate, toDateInputValue } from './beta';

describe('daysLeft', () => {
  const end = '2026-12-31T23:59:59+02:00';

  it('counts whole days, rounding up', () => {
    expect(daysLeft(end, new Date('2026-12-30T23:59:59+02:00'))).toBe(1);
    expect(daysLeft(end, new Date('2026-12-30T12:00:00+02:00'))).toBe(2);
    expect(daysLeft(end, new Date('2026-12-31T23:00:00+02:00'))).toBe(1);
  });

  it('is 0 once the beta is over and null without a date', () => {
    expect(daysLeft(end, new Date('2027-01-01T00:00:01+02:00'))).toBe(0);
    expect(daysLeft(null)).toBeNull();
    expect(daysLeft('garbage')).toBeNull();
  });
});

describe('formatBetaDate / toDateInputValue', () => {
  it('shows the Israeli calendar date, not the UTC one', () => {
    // 23:59:59 on Dec 31 in Israel is still Dec 31 (21:59:59 UTC)
    expect(formatBetaDate('2026-12-31T23:59:59+02:00')).toBe('31.12.2026');
    expect(toDateInputValue('2026-12-31T23:59:59+02:00')).toBe('2026-12-31');
    // 00:30 on Jan 1 in Israel is Dec 31 in UTC but must show Jan 1
    expect(toDateInputValue('2026-12-31T22:30:00Z')).toBe('2027-01-01');
  });

  it('is empty for missing or invalid input', () => {
    expect(formatBetaDate(null)).toBe('');
    expect(formatBetaDate('nope')).toBe('');
    expect(toDateInputValue('nope')).toBe('');
  });
});

describe('endOfDayIsrael', () => {
  it('ends the day at 23:59:59 Israel time in winter (UTC+2)', () => {
    expect(endOfDayIsrael('2026-12-31')).toBe('2026-12-31T21:59:59.000Z');
  });

  it('uses the summer offset (UTC+3) when daylight saving applies', () => {
    expect(endOfDayIsrael('2026-07-15')).toBe('2026-07-15T20:59:59.000Z');
  });

  it('round-trips with toDateInputValue', () => {
    for (const day of ['2026-12-31', '2027-03-26', '2027-03-27', '2027-10-30', '2026-06-01']) {
      expect(toDateInputValue(endOfDayIsrael(day))).toBe(day);
    }
  });

  it('rejects bad input', () => {
    expect(endOfDayIsrael('31.12.2026')).toBeNull();
    expect(endOfDayIsrael('')).toBeNull();
  });
});
