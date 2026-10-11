import { Accessibility, Armchair, CarFront, ParkingSquare, PawPrint } from 'lucide-react';

/**
 * Practical facts about a place. A place lists only what is KNOWN to be there: a missing entry means
 * "not stated", never "no". Must match the allowed keys in sanitize_place_changes() and the places_amenities_valid constraint (migration 023).
 */
export const AMENITIES = [
  { key: 'wheelchair', group: 'נגישות וחניה', label: 'נגיש לנכים', filterLabel: 'נגיש לנכים', icon: Accessibility },
  { key: 'car_access', group: 'נגישות וחניה', label: 'נגיש לרכב', filterLabel: 'נגיש לרכב', icon: CarFront },
  { key: 'parking', group: 'נגישות וחניה', label: 'חניה מסודרת', filterLabel: 'חניה מסודרת', icon: ParkingSquare },
  { key: 'outdoor_seating', group: 'במקום', label: 'ישיבה בחוץ', filterLabel: 'ישיבה בחוץ', icon: Armchair },
  { key: 'dog_friendly', group: 'במקום', label: 'ידידותי לכלבים', filterLabel: 'ידידותי לכלבים', icon: PawPrint },
];

export const AMENITY_KEYS = AMENITIES.map((a) => a.key);

/** Known keys only, de-duplicated, in the canonical display order. */
export const cleanAmenities = (list) => {
  const set = new Set(Array.isArray(list) ? list : []);
  return AMENITY_KEYS.filter((key) => set.has(key));
};

/** The amenities a place has, as full definitions, in display order. */
export const getPlaceAmenities = (place) => {
  const have = new Set(cleanAmenities(place?.amenities));
  return AMENITIES.filter((a) => have.has(a.key));
};

/** True when the place has every one of the given amenities (an empty selection matches everything). */
export const hasAllAmenities = (place, keys) => {
  if (!keys || keys.length === 0) return true;
  const have = new Set(cleanAmenities(place?.amenities));
  return keys.every((key) => have.has(key));
};

/** Parses the `features` URL param ("wheelchair,parking") into known keys. */
export const parseFeatureParam = (value) => cleanAmenities(String(value || '').split(','));
