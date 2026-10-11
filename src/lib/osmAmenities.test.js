import { describe, it, expect } from 'vitest';
import { amenitiesFromOsm, parkingNear, wheelchairFrom } from './osmAmenities';

const place = { name: 'קפה הפינה', lat: 32.0, lng: 34.8, amenities: [] };
// ~11 m north of the place
const near = { lat: 32.0001, lon: 34.8 };
// ~1.1 km away
const far = { lat: 32.01, lon: 34.8 };

describe('wheelchairFrom', () => {
  it('reads the tag of the same venue', () => {
    expect(wheelchairFrom(place, [{ ...near, tags: { name: 'קפה הפינה', wheelchair: 'yes' } }])).toBe('yes');
    expect(wheelchairFrom(place, [{ ...near, tags: { name: 'קפה הפינה', wheelchair: 'limited' } }])).toBe('limited');
  });

  it('ignores another venue, a distant one, and elements without the tag', () => {
    expect(wheelchairFrom(place, [{ ...near, tags: { name: 'מספרה', wheelchair: 'yes' } }])).toBeNull();
    expect(wheelchairFrom(place, [{ ...far, tags: { name: 'קפה הפינה', wheelchair: 'yes' } }])).toBeNull();
    expect(wheelchairFrom(place, [{ ...near, tags: { name: 'קפה הפינה' } }])).toBeNull();
  });

  it('prefers yes over limited and no, and matches a name written in English too', () => {
    const els = [
      { ...near, tags: { name: 'קפה הפינה', wheelchair: 'no' } },
      { ...near, tags: { name: 'קפה הפינה', wheelchair: 'yes' } },
    ];
    expect(wheelchairFrom(place, els)).toBe('yes');
    expect(wheelchairFrom({ ...place, name: 'Cafe Corner' }, [{ ...near, tags: { 'name:en': 'Cafe Corner', wheelchair: 'yes' } }])).toBe('yes');
  });
});

describe('parkingNear', () => {
  it('finds the nearest public lot', () => {
    const lots = [
      { lat: 32.001, lon: 34.8, tags: { amenity: 'parking' } },
      { lat: 32.0005, lon: 34.8, tags: { amenity: 'parking', name: 'חניון העיר' } },
    ];
    expect(parkingNear(place, lots)).toMatchObject({ name: 'חניון העיר' });
  });

  it('skips private lots, lots that are too far, and other amenities', () => {
    expect(parkingNear(place, [{ ...near, tags: { amenity: 'parking', access: 'private' } }])).toBeNull();
    expect(parkingNear(place, [{ ...far, tags: { amenity: 'parking' } }])).toBeNull();
    expect(parkingNear(place, [{ ...near, tags: { amenity: 'cafe' } }])).toBeNull();
  });
});

describe('amenitiesFromOsm', () => {
  const wheelchairElements = [{ ...near, tags: { name: 'קפה הפינה', wheelchair: 'yes' } }];
  const parkingElements = [{ ...near, tags: { amenity: 'parking' } }];

  it('adds wheelchair access, and parking only when asked', () => {
    expect(amenitiesFromOsm(place, { wheelchairElements, parkingElements }).add).toEqual(['wheelchair']);
    expect(amenitiesFromOsm(place, { wheelchairElements, parkingElements }, { withParking: true }).add).toEqual(['wheelchair', 'parking']);
  });

  it('never marks a place as not accessible and never repeats what it already has', () => {
    const no = [{ ...near, tags: { name: 'קפה הפינה', wheelchair: 'no' } }];
    expect(amenitiesFromOsm(place, { wheelchairElements: no }).add).toEqual([]);
    expect(amenitiesFromOsm({ ...place, amenities: ['wheelchair'] }, { wheelchairElements }).add).toEqual([]);
  });
});
