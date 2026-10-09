// Pure helpers for importing places from OpenStreetMap (no network, no database).
// Used by scripts/import-osm-places.mjs and unit-tested in importPlaces.test.js.
import { haversineKm } from './geo.js';

// ---- names -----------------------------------------------------------------

const HEBREW = /[֐-׿]/;
export const hasHebrew = (text) => HEBREW.test(text || '');

/** Hebrew display name of an OSM element, or null when there is none. */
export function hebrewName(tags = {}) {
  const candidates = [tags['name:he'], tags.name];
  const name = candidates.find((n) => n && hasHebrew(n));
  const clean = name?.replace(/\s+/g, ' ').trim();
  if (!clean || clean.length < 3 || /^[\d\s\-.,]+$/.test(clean)) return null;
  if (/ללא שם|לא ידוע/.test(clean)) return null;
  return clean;
}

/** Removes niqqud, punctuation, quotes and spacing differences so spellings compare equal. */
export function normalizeName(text) {
  return String(text ?? '')
    .replace(/[֑-ׇ]/g, '') // niqqud and cantillation
    .replace(/["'`´׳״“”‘’()\-–—.,:;!?/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Words that describe the kind of place; two names that differ only by these are the same site
// ("מעיין דוד" / "עין דוד" / "נחל דוד" are all David's spring/stream).
const TYPE_WORDS = new Set([
  'מעיין', 'מעינות', 'עין', 'עינות', 'נחל', 'נחלי', 'שמורת', 'שמורה', 'גן', 'לאומי', 'פארק', 'חוף',
  'תצפית', 'מצפור', 'מוזיאון', 'שוק', 'מערת', 'מפל', 'אתר', 'תל', 'חורבת', 'חרבת', 'הר', 'בריכת', 'ה',
]);

/** The distinctive part of a name, without type words. Falls back to the whole name. */
export function coreName(text) {
  // the definite article is dropped for comparison only ("השבעה" == "שבעה")
  const words = normalizeName(text)
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.startsWith('ה') ? w.slice(1) : w));
  const core = words.filter((w) => !TYPE_WORDS.has(w));
  return (core.length > 0 ? core : words).join(' ');
}

// Names that say nothing on their own ("גשר", "בית הכנסת"): useless as a listing title.
const GENERIC_NAMES = new Set([
  'גשר', 'גדר', 'בית', 'בית כנסת', 'בית הכנסת', 'מגדל', 'בור', 'מערה', 'מעיין', 'עין', 'נחל', 'תצפית',
  'מצפה', 'מצפור', 'חוף', 'שוק', 'פארק', 'גן', 'אנדרטה', 'חורבה', 'תל', 'מוזיאון', 'אתר', 'כנסיה', 'כנסייה', 'מסגד',
  'בית קברות', 'קבר', 'מצבה', 'בריכה', 'חניון',
]);

export const isGenericName = (name) => GENERIC_NAMES.has(normalizeName(name).replace(/^ה/, '')) || GENERIC_NAMES.has(normalizeName(name));

// ---- classification ---------------------------------------------------------

/**
 * Maps OSM tags to a category of the app plus a Hebrew label for the kind of place.
 * Returns null for anything the app does not list.
 */
export function classify(tags = {}) {
  if (tags.natural === 'spring') return { category: 'nature', kind: 'spring', label: 'מעיין' };
  if (tags.waterway === 'waterfall') return { category: 'nature', kind: 'waterfall', label: 'מפל' };
  if (tags.leisure === 'nature_reserve' || tags.boundary === 'national_park' || tags.boundary === 'protected_area') {
    return { category: 'nature', kind: 'reserve', label: 'שמורת טבע או גן לאומי' };
  }
  if (tags.tourism === 'viewpoint') return { category: 'view', kind: 'viewpoint', label: 'נקודת תצפית' };
  if (tags.natural === 'beach') return { category: 'beach', kind: 'beach', label: 'חוף' };
  if (tags.tourism === 'museum') return { category: 'culture', kind: 'museum', label: 'מוזיאון' };
  if (/^(archaeological_site|ruins|castle|fort|monument|memorial)$/.test(tags.historic || '')) {
    return { category: 'culture', kind: 'historic', label: 'אתר היסטורי' };
  }
  if (tags.tourism === 'attraction') return { category: 'culture', kind: 'attraction', label: 'אתר מבקרים' };
  if (tags.amenity === 'marketplace') return { category: 'shopping', kind: 'market', label: 'שוק' };
  return null;
}

/** Notable places (linked to Wikipedia/Wikidata or with a website) are the ones worth importing first. */
export function score(tags = {}) {
  let s = 0;
  if (tags.wikidata) s += 3;
  if (tags.wikipedia) s += 2;
  if (tags.website || tags['contact:website']) s += 1;
  if (tags['name:he']) s += 1;
  if (tags['name:en']) s += 0.5;
  return s;
}

// ---- duplicates -------------------------------------------------------------

/**
 * Is `candidate` the same place as `other`?
 *  - identical normalized name, or
 *  - same distinctive name within `nameRadiusKm`, or
 *  - practically the same spot (`spotRadiusKm`).
 * Existing places often have rounded coordinates, so callers use wider radii for them.
 */
export function isDuplicate(candidate, other, { nameRadiusKm = 3, spotRadiusKm = 0.1 } = {}) {
  const a = normalizeName(candidate.name);
  const b = normalizeName(other.name);
  if (a && a === b) return true;
  const km = haversineKm(candidate.lat, candidate.lng, other.lat, other.lng);
  if (km <= spotRadiusKm) return true;
  const coreA = coreName(candidate.name);
  const coreB = coreName(other.name);
  return coreA.length >= 3 && coreA === coreB && km <= nameRadiusKm;
}

/** Candidates that are not already present in `existing` and not repeated within the list itself. */
export function removeDuplicates(candidates, existing, options = {}) {
  const existingOptions = { nameRadiusKm: 5, spotRadiusKm: 0.3, ...options.existing };
  const batchOptions = { nameRadiusKm: 3, spotRadiusKm: 0.1, ...options.batch };
  const kept = [];
  const dropped = [];
  for (const candidate of candidates) {
    const clash =
      existing.find((e) => isDuplicate(candidate, e, existingOptions)) ||
      kept.find((k) => isDuplicate(candidate, k, batchOptions));
    if (clash) dropped.push({ candidate, clash });
    else kept.push(candidate);
  }
  return { kept, dropped };
}

// ---- selection --------------------------------------------------------------

/**
 * Takes the best `n` candidates while keeping the mix varied: at most `maxPerCategory` of one
 * category first, then the rest by score if the quota cannot be reached.
 */
export function pickBalanced(candidates, n, maxPerCategory = Math.ceil(n * 0.4)) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'he'));
  const picked = [];
  const counts = {};
  for (const c of sorted) {
    if (picked.length >= n) break;
    if ((counts[c.category] || 0) >= maxPerCategory) continue;
    picked.push(c);
    counts[c.category] = (counts[c.category] || 0) + 1;
  }
  for (const c of sorted) {
    if (picked.length >= n) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked;
}

export const withinKm = (point, center, km) => haversineKm(point.lat, point.lng, center.lat, center.lng) <= km;
