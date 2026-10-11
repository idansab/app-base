// Practical facts about a place taken from OpenStreetMap. Pure helpers (no network): used by scripts/enrich-amenities.mjs.
// Only POSITIVE facts are used. "Not stated" stays "not stated"; a place is never marked as not accessible.
import { haversineKm } from './geo.js';
import { normalizeName } from './importPlaces.js';

export const WHEELCHAIR_RADIUS_M = 80;
export const PARKING_RADIUS_M = 120;

const sameName = (a, b) => {
  const x = normalizeName(a);
  const y = normalizeName(b);
  return Boolean(x && y && (x.includes(y) || y.includes(x)));
};

const position = (el) => ({ lat: el.lat ?? el.center?.lat, lng: el.lon ?? el.center?.lon });

const distanceM = (place, el) => {
  const { lat, lng } = position(el);
  if (lat == null || lng == null) return Infinity;
  return haversineKm(place.lat, place.lng, lat, lng) * 1000;
};

const namesOf = (tags = {}) => [tags.name, tags['name:he'], tags['name:en']].filter(Boolean);

/** The OSM `wheelchair` value of the same venue: 'yes' | 'limited' | 'no' | null (no matching element). */
export function wheelchairFrom(place, elements, radiusM = WHEELCHAIR_RADIUS_M) {
  const values = [];
  for (const el of elements || []) {
    const tags = el.tags || {};
    if (!tags.wheelchair || distanceM(place, el) > radiusM) continue;
    if (!namesOf(tags).some((name) => sameName(place.name, name))) continue;
    values.push(String(tags.wheelchair).toLowerCase());
  }
  for (const wanted of ['yes', 'limited', 'no']) if (values.includes(wanted)) return wanted;
  return null;
}

/**
 * The nearest public parking lot: { distanceM, name } or null.
 * Private or customers-of-someone-else lots do not count.
 */
export function parkingNear(place, elements, radiusM = PARKING_RADIUS_M) {
  let best = null;
  for (const el of elements || []) {
    const tags = el.tags || {};
    if (tags.amenity !== 'parking') continue;
    if (['private', 'no', 'delivery', 'permit'].includes(String(tags.access || '').toLowerCase())) continue;
    const d = distanceM(place, el);
    if (d > radiusM) continue;
    if (!best || d < best.distanceM) best = { distanceM: Math.round(d), name: tags.name || null };
  }
  return best;
}

/**
 * What to ADD to a place. `current` amenities are never removed.
 * @returns {{ add: string[], evidence: object }}
 */
export function amenitiesFromOsm(place, { wheelchairElements = [], parkingElements = [] }, { withParking = false } = {}) {
  const current = new Set(Array.isArray(place.amenities) ? place.amenities : []);
  const add = [];
  const evidence = {};

  const wheelchair = wheelchairFrom(place, wheelchairElements);
  evidence.wheelchair = wheelchair;
  if (wheelchair === 'yes' && !current.has('wheelchair')) add.push('wheelchair');

  const parking = parkingNear(place, parkingElements);
  evidence.parking = parking;
  if (withParking && parking && !current.has('parking')) add.push('parking');

  return { add, evidence };
}
