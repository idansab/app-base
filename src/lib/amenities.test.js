import { describe, it, expect } from 'vitest';
import { AMENITY_KEYS, cleanAmenities, getPlaceAmenities, hasAllAmenities, parseFeatureParam } from './amenities';

describe('cleanAmenities', () => {
  it('keeps known keys once, in display order', () => {
    expect(cleanAmenities(['parking', 'wheelchair', 'parking'])).toEqual(['wheelchair', 'parking']);
  });

  it('drops unknown keys and bad input', () => {
    expect(cleanAmenities(['wifi', 'car_access'])).toEqual(['car_access']);
    expect(cleanAmenities(null)).toEqual([]);
    expect(cleanAmenities('parking')).toEqual([]);
  });
});

describe('getPlaceAmenities', () => {
  it('lists only what the place has', () => {
    expect(getPlaceAmenities({ amenities: ['parking', 'wheelchair'] }).map((a) => a.key)).toEqual(['wheelchair', 'parking']);
    expect(getPlaceAmenities({})).toEqual([]);
  });
});

describe('hasAllAmenities', () => {
  const place = { amenities: ['wheelchair', 'parking'] };
  it('needs every selected amenity', () => {
    expect(hasAllAmenities(place, ['wheelchair'])).toBe(true);
    expect(hasAllAmenities(place, ['wheelchair', 'parking'])).toBe(true);
    expect(hasAllAmenities(place, ['wheelchair', 'car_access'])).toBe(false);
  });

  it('matches everything when nothing is selected, and treats unknown as not matching', () => {
    expect(hasAllAmenities({}, [])).toBe(true);
    expect(hasAllAmenities({}, ['parking'])).toBe(false);
  });
});

describe('parseFeatureParam', () => {
  it('reads a comma separated URL value', () => {
    expect(parseFeatureParam('parking,wheelchair,nope')).toEqual(['wheelchair', 'parking']);
    expect(parseFeatureParam('')).toEqual([]);
    expect(parseFeatureParam(null)).toEqual([]);
  });

  it('knows three amenities', () => {
    expect(AMENITY_KEYS).toEqual(['wheelchair', 'car_access', 'parking']);
  });
});
