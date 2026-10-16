import { describe, it, expect } from 'vitest';
import { COLLECTIONS, getCollection, orderCollectionPlaces, collectionPath } from './collections';

describe('getCollection', () => {
  it('finds a known collection and rejects unknown or inherited keys', () => {
    expect(getCollection('springs')?.title).toBe('5 מעיינות שעוד לא היית בהם');
    expect(getCollection('nope')).toBeNull();
    expect(getCollection('toString')).toBeNull();
  });
});

describe('orderCollectionPlaces', () => {
  const collection = {
    places: [
      { id: 'a', credit: 'credit a' },
      { id: 'b', credit: 'credit b' },
      { id: 'c', credit: 'credit c' },
    ],
  };

  it('keeps the collection order and attaches credits', () => {
    const fetched = [{ id: 'c', name: 'C' }, { id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    expect(orderCollectionPlaces(collection, fetched).map((p) => [p.name, p.credit])).toEqual([
      ['A', 'credit a'],
      ['B', 'credit b'],
      ['C', 'credit c'],
    ]);
  });

  it('drops places that did not come back', () => {
    expect(orderCollectionPlaces(collection, [{ id: 'b' }]).map((p) => p.id)).toEqual(['b']);
    expect(orderCollectionPlaces(collection, null)).toEqual([]);
  });
});

describe('collections data', () => {
  it('every place has an id and a photo credit', () => {
    for (const c of Object.values(COLLECTIONS)) {
      expect(c.places.length).toBeGreaterThan(0);
      for (const p of c.places) {
        expect(p.id).toMatch(/^[\w-]+$/);
        expect(p.credit).toMatch(/צילום/);
      }
    }
  });

  it('builds the page path', () => {
    expect(collectionPath('springs')).toBe('/list/springs');
  });
});
