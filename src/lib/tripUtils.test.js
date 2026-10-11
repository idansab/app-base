import { describe, it, expect } from 'vitest';
import {
  MAX_TRIP_STOPS,
  estimateHours,
  moveItem,
  nearbyPlaces,
  parseOrder,
  routeKm,
  searchPlaces,
  shareText,
  stopsOf,
  tripUrl,
  whatsappUrl,
} from './tripUtils';

const place = (id, name, lat, lng, extra = {}) => ({ id, name, lat, lng, ...extra });
const tlv = place('a', 'קפה הים', 32.08, 34.77, { city: 'תל אביב', tags: ['בית קפה'] });
const haifa = place('b', 'גן הבהאים', 32.81, 34.99, { city: 'חיפה' });
const eilat = place('c', 'שונית אילת', 29.55, 34.95, { city: 'אילת' });

describe('parseOrder', () => {
  it('reads the JSON text the database keeps, and plain arrays', () => {
    expect(parseOrder('["a","b"]')).toEqual(['a', 'b']);
    expect(parseOrder(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('survives bad input, repeats and non-text ids', () => {
    expect(parseOrder('not json')).toEqual([]);
    expect(parseOrder('{"a":1}')).toEqual([]);
    expect(parseOrder(null)).toEqual([]);
    expect(parseOrder(['a', 'a', 5, '', 'b'])).toEqual(['a', 'b']);
  });

  it('keeps at most the allowed number of stops', () => {
    const many = Array.from({ length: 30 }, (_, i) => `p${i}`);
    expect(parseOrder(many)).toHaveLength(MAX_TRIP_STOPS);
  });
});

describe('moveItem', () => {
  it('moves one item and leaves the original alone', () => {
    const list = ['a', 'b', 'c'];
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(list, 2, 1)).toEqual(['a', 'c', 'b']);
    expect(list).toEqual(['a', 'b', 'c']);
  });

  it('ignores moves that do not make sense', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem(list, -1, 0)).toBe(list);
    expect(moveItem(list, 0, 5)).toBe(list);
  });
});

describe('stopsOf, routeKm, estimateHours', () => {
  const byId = new Map([tlv, haifa, eilat].map((p) => [p.id, p]));

  it('keeps the trip order and skips places that no longer exist', () => {
    expect(stopsOf('["b","gone","a"]', byId).map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('adds up the legs', () => {
    expect(routeKm([tlv])).toBe(0);
    const km = routeKm([tlv, haifa]);
    expect(km).toBeGreaterThan(80);
    expect(km).toBeLessThan(100);
    expect(routeKm([tlv, haifa, tlv])).toBeCloseTo(km * 2, 5);
  });

  it('estimates in half hours, never below one', () => {
    expect(estimateHours(1, 0)).toBe(1);
    expect(estimateHours(4, 40)).toBe(4);
    expect(estimateHours(3, 20) % 0.5).toBe(0);
  });
});

describe('nearbyPlaces', () => {
  it('sorts by distance from a point and skips what is already in the trip', () => {
    const result = nearbyPlaces([eilat, haifa, tlv], { lat: 32.0, lng: 34.8 }, { exclude: ['a'] });
    expect(result.map((r) => r.place.id)).toEqual(['b', 'c']);
    expect(result[0].km).toBeLessThan(result[1].km);
  });

  it('returns nothing without a point and honours the limit', () => {
    expect(nearbyPlaces([tlv], null)).toEqual([]);
    expect(nearbyPlaces([tlv, haifa, eilat], { lat: 32, lng: 34.8 }, { limit: 2 })).toHaveLength(2);
  });
});

describe('searchPlaces', () => {
  const all = [tlv, haifa, eilat];

  it('matches words in the name, city or tags', () => {
    expect(searchPlaces(all, 'קפה').map((p) => p.id)).toEqual(['a']);
    expect(searchPlaces(all, 'חיפה').map((p) => p.id)).toEqual(['b']);
    expect(searchPlaces(all, 'בית קפה')).toHaveLength(1);
  });

  it('needs every word, ignores punctuation and an empty query', () => {
    expect(searchPlaces(all, 'קפה אילת')).toEqual([]);
    expect(searchPlaces(all, 'גן-הבהאים').map((p) => p.id)).toEqual(['b']);
    expect(searchPlaces(all, '   ')).toEqual([]);
  });
});

describe('sharing', () => {
  it('builds the link and the message', () => {
    expect(tripUrl('https://example.com/', 'abc 1')).toBe('https://example.com/trips/abc%201');
    const text = shareText({ title: 'יום בצפון', stopNames: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז'], km: 42.4, url: 'https://x.y/trips/1' });
    expect(text).toContain('יום בצפון');
    expect(text).toContain('7 תחנות');
    expect(text).toContain('כ-42 ק״מ');
    expect(text).toContain('1. א');
    expect(text).toContain('ועוד 2 תחנות');
    expect(text).not.toContain('6. ו');
    expect(text.endsWith('https://x.y/trips/1')).toBe(true);
  });

  it('opens WhatsApp with the text encoded', () => {
    expect(whatsappUrl('שלום עולם')).toBe(`https://wa.me/?text=${encodeURIComponent('שלום עולם')}`);
  });
});
