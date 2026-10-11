import { describe, it, expect, vi, afterEach } from 'vitest';
import { haversineKm, formatDistance, wazeUrl, formatPlaceName, reverseGeocode } from './geo';

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

describe('formatPlaceName', () => {
  it('gives neighbourhood and city, nothing more precise', () => {
    expect(formatPlaceName({ suburb: 'נווה צדק', city: 'תל אביב - יפו', road: 'שבזי', house_number: '5' })).toBe('נווה צדק, תל אביב - יפו');
  });

  it('falls back to town or village and never repeats a name', () => {
    expect(formatPlaceName({ village: 'אבן יהודה' })).toBe('אבן יהודה');
    expect(formatPlaceName({ neighbourhood: 'חיפה', city: 'חיפה' })).toBe('חיפה');
  });

  it('is empty when there is nothing to show', () => {
    expect(formatPlaceName({})).toBe('');
    expect(formatPlaceName(undefined)).toBe('');
  });
});

describe('reverseGeocode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks OpenStreetMap at neighbourhood level and returns the name', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ address: { suburb: 'הדר', city: 'חיפה' } }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await reverseGeocode(32.8001, 34.9901)).toBe('הדר, חיפה');
    expect(fetchMock.mock.calls[0][0]).toContain('zoom=14');
    expect(fetchMock.mock.calls[0][0]).toContain('accept-language=he');
  });

  it('answers from memory for the same spot', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ address: { city: 'אילת' } }) });
    vi.stubGlobal('fetch', fetchMock);
    await reverseGeocode(29.5571, 34.9511);
    await reverseGeocode(29.5572, 34.9512);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null instead of throwing when the service fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await reverseGeocode(31.0, 35.0)).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await reverseGeocode(31.1, 35.1)).toBeNull();
  });
});
