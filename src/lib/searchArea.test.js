import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSearchArea, loadSearchArea, placesInArea } from './searchArea';

beforeEach(() => {
  const data = new Map();
  vi.stubGlobal('sessionStorage', {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  });
});

describe('search area', () => {
  it('remembers and returns the chosen area', () => {
    saveSearchArea({ lat: 32, lng: 34.8 }, 30);
    expect(loadSearchArea()).toEqual({ lat: 32, lng: 34.8, km: 30 });
  });

  it('ignores bad input and unreadable storage', () => {
    saveSearchArea({ lat: NaN, lng: 34 }, 30);
    saveSearchArea({ lat: 32, lng: 34 }, 0);
    expect(loadSearchArea()).toBeNull();
    sessionStorage.setItem('mayhishpo:search-area', '{oops');
    expect(loadSearchArea()).toBeNull();
  });

  it('keeps only places inside the radius', () => {
    const near = { id: 1, lat: 32.01, lng: 34.8 };
    const far = { id: 2, lat: 31.25, lng: 34.79 };
    const broken = { id: 3, lat: null, lng: null };
    expect(placesInArea([near, far, broken], { lat: 32, lng: 34.8, km: 20 })).toEqual([near]);
    expect(placesInArea([near, far], null)).toHaveLength(2);
  });
});
