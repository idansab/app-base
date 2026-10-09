import { describe, it, expect } from 'vitest';
import { haversineKm, formatDistance, wazeUrl } from './geo';

describe('haversineKm', () => {
  it('is zero for identical points', () => {
    expect(haversineKm(32.08, 34.78, 32.08, 34.78)).toBe(0);
  });

  it('Tel Aviv to Jerusalem is roughly 54km', () => {
    const km = haversineKm(32.0853, 34.7818, 31.7683, 35.2137);
    expect(km).toBeGreaterThan(50);
    expect(km).toBeLessThan(60);
  });

  it('is symmetric', () => {
    const ab = haversineKm(32.0, 34.8, 31.0, 35.0);
    const ba = haversineKm(31.0, 35.0, 32.0, 34.8);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

describe('formatDistance', () => {
  it('formats meters, decimals and whole kilometers', () => {
    expect(formatDistance(0.45)).toBe('450 מ׳');
    expect(formatDistance(2.34)).toBe('2.3 ק״מ');
    expect(formatDistance(42.4)).toBe('42 ק״מ');
  });

  it('returns null for missing values', () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(NaN)).toBeNull();
  });
});

describe('wazeUrl', () => {
  it('builds a navigation link', () => {
    expect(wazeUrl(32.1, 34.8)).toBe('https://waze.com/ul?ll=32.1%2C34.8&navigate=yes');
  });
});
