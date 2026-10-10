// Pure helpers for importing places from Overture Maps (no network, no database).
// Used by scripts/import-places.mjs and unit-tested in overtureImport.test.js.
import { isGenericName, normalizeName } from './importPlaces.js';
// Rough bounding box of Israel (same as the admin places manager uses)
const IL_BOUNDS = { latMin: 29.4, latMax: 33.4, lngMin: 34.2, lngMax: 35.95 };

export const OVERTURE_LICENSE = 'CDLA-Permissive-2.0';

/** App category -> Overture taxonomy values and the Hebrew label shown on the card. */
export const CATEGORY_SOURCES = {
  nightlife: {
    bar: 'בר', pub: 'פאב', irish_pub: 'פאב', gastropub: 'פאב', beer_bar: 'בר בירה', wine_bar: 'בר יין',
    cocktail_bar: 'בר קוקטיילים', sports_bar: 'בר ספורט', hookah_bar: 'בר נרגילה', dance_club: 'מועדון',
    night_club: 'מועדון', comedy_club: 'קומדי קלאב', karaoke: 'קריוקי', lounge: 'לאונג׳',
  },
  food: { food_truck: 'משאית אוכל', coffee_shop: 'בית קפה', cafe: 'בית קפה', street_vendor: 'דוכן אוכל' },
};

/** Areas for --area, as [south, west, north, east]. */
export const AREAS = {
  north: { label: 'הצפון', bbox: [32.55, 34.95, 33.35, 35.9] },
  haifa: { label: 'חיפה והסביבה', bbox: [32.55, 34.85, 32.95, 35.12] },
  center: { label: 'השרון, גוש דן והמרכז', bbox: [31.85, 34.7, 32.5, 35.0] },
  jerusalem: { label: 'ירושלים והסביבה', bbox: [31.7, 35.08, 31.85, 35.28] },
  south: { label: 'הדרום והנגב', bbox: [30.55, 34.6, 31.85, 35.05] },
  deadsea: { label: 'ים המלח', bbox: [31.0, 35.3, 31.6, 35.5] },
  eilat: { label: 'אילת והערבה', bbox: [29.45, 34.85, 29.75, 35.05] },
};
AREAS.all = { label: 'כל הארץ', bbox: [IL_BOUNDS.latMin, IL_BOUNDS.lngMin, IL_BOUNDS.latMax, IL_BOUNDS.lngMax] };

// Names that show a hotel or restaurant rather than a bar / club are skipped for nightlife.
const NOT_NIGHTLIFE = /מסעד|מלון|hotel|restaurant|resort|סופר/i;

const NAME_OK = /[A-Za-z֐-׿]/;

/**
 * Overture row -> database row (status "pending"), or null when it is not good enough.
 * Row shape: { id, name, taxonomy, confidence, address, city, country, lat, lng, status }.
 */
export function toPlaceRow(rec, category, { minConfidence = 0.6 } = {}) {
  const labels = CATEGORY_SOURCES[category];
  const label = labels?.[rec.taxonomy];
  const name = String(rec.name ?? '').replace(/\s+/g, ' ').trim();
  if (!label || !rec.id) return null;
  if (name.length < 2 || !NAME_OK.test(name) || /^[\d\s\-.,]+$/.test(name) || isGenericName(name)) return null;
  if (name.length > 60) return null;
  if (category === 'nightlife' && NOT_NIGHTLIFE.test(name)) return null;
  if ((rec.confidence ?? 0) < minConfidence) return null;
  if (rec.status && rec.status !== 'open') return null;
  if (rec.country && rec.country !== 'IL') return null;
  const lat = Number(rec.lat);
  const lng = Number(rec.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < IL_BOUNDS.latMin || lat > IL_BOUNDS.latMax || lng < IL_BOUNDS.lngMin || lng > IL_BOUNDS.lngMax) return null;

  const city = String(rec.city ?? '').trim() || null;
  const street = String(rec.address ?? '').trim();
  const address = [street, city].filter(Boolean).join(', ') || city || '';
  return {
    name,
    category,
    city,
    address,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    short_description: city ? `${label} · ${city}` : label,
    tags: [label],
    status: 'pending',
    source: 'overture',
    source_ref: rec.id,
    source_license: OVERTURE_LICENSE,
    _confidence: rec.confidence,
  };
}

/** At most `perCity` rows from any one city, best confidence first, up to `n` in total. */
export function spreadByCity(rows, n, perCity = 4) {
  const counts = new Map();
  const out = [];
  for (const row of [...rows].sort((a, b) => (b._confidence ?? 0) - (a._confidence ?? 0))) {
    if (out.length >= n) break;
    const key = normalizeName(row.city || '?');
    if ((counts.get(key) ?? 0) >= perCity) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    out.push(row);
  }
  return out;
}
