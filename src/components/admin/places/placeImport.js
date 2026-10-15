// Pure helpers for importing places from a CSV file in the admin (no React, no network) so they can be unit-tested.
// The file format is the one placesToCsv() exports, so an exported file can be edited in Excel and imported back.
import { haversineKm } from '@/lib/geo';
import { coreName, normalizeName } from '@/lib/importPlaces';
import { CATEGORIES, normalizeCategory } from '@/lib/categories';
import { AMENITIES, cleanAmenities } from '@/lib/amenities';
import { MAX_PLACE_IMAGES, getPlaceImages } from '@/lib/placeImages';
import { hasUsableSchedule, parseHoursText, requiresHours, summarizeSchedule } from '@/lib/openingHours';
import { parseOsmHours } from '@/lib/osmHours';
import { CSV_COLUMNS, IL_BOUNDS, PRICE_LEVELS } from './placeUtils';

// ---- reading the file --------------------------------------------------------

/** Excel saves "CSV" (not "CSV UTF-8") in the Windows Hebrew code page; fall back to it when UTF-8 fails. */
export function decodeCsvBytes(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1255').decode(buffer);
  }
}

/** RFC 4180 CSV: quoted cells, "" escapes, line breaks inside quotes. Detects , ; or tab from the header line. */
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0];
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch] += 1;
  }
  const delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// ---- mapping columns ------------------------------------------------------------

const normalizeHeader = (h) => String(h ?? '').replace(/^﻿/, '').trim().toLowerCase();

const HEADER_ALIASES = {
  ...Object.fromEntries(CSV_COLUMNS.flatMap(([key, label]) => [[normalizeHeader(key), key], [normalizeHeader(label), key]])),
  'שם המקום': 'name',
  latitude: 'lat',
  longitude: 'lng',
  lon: 'lng',
  'קו רוחב (lat)': 'lat',
  'קו אורך (lng)': 'lng',
};

/** Index of each known column in the header row; unknown columns are ignored. */
export function mapHeader(headerRow) {
  const map = {};
  headerRow.forEach((h, i) => {
    const key = HEADER_ALIASES[normalizeHeader(h)];
    if (key && map[key] === undefined) map[key] = i;
  });
  return map;
}

// ---- cleaning a row ----------------------------------------------------------------

// placesToCsv() prefixes formula-like cells with ' so Excel does not run them; undo that on the way back in.
const cell = (value) => {
  const s = String(value ?? '').trim();
  return /^'[=+\-@]/.test(s) ? s.slice(1) : s;
};

const splitList = (value) =>
  cell(value)
    .split(/[;,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

const byLabel = (list, value) => {
  const v = cell(value).toLowerCase();
  return list.find((item) => item.key?.toLowerCase() === v || item.value?.toLowerCase() === v || item.label === cell(value));
};

const KOSHER = { kosher: 'kosher', not_kosher: 'not_kosher', 'כשר': 'kosher', 'לא כשר': 'not_kosher' };

const toLink = (value) => {
  let v = cell(value);
  if (!v) return null;
  if (/^www\./i.test(v)) v = `https://${v}`;
  return /^https?:\/\/[^\s<>"']+$/.test(v) && v.length <= 300 ? v : undefined;
};

/**
 * Hours text -> { opening_schedule, opening_hours }. Hebrew text first ("א'-ה' 08:00-17:00, ו' 08:00-13:00"),
 * then the OpenStreetMap form ("Mo-Fr 08:00-17:00"). Like the admin form, the text is rewritten from the
 * schedule so both always agree; text that cannot be read is kept as-is with no schedule.
 */
export function parseImportHours(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return { opening_schedule: null, opening_hours: null, recognized: false };
  const schedule = parseHoursText(raw) ?? parseOsmHours(raw);
  if (!schedule) return { opening_schedule: null, opening_hours: raw, recognized: false };
  return {
    opening_schedule: schedule,
    opening_hours: schedule.type === 'weekly' ? summarizeSchedule(schedule) : raw,
    recognized: true,
  };
}

const inIsrael = (lat, lng) =>
  lat >= IL_BOUNDS.latMin && lat <= IL_BOUNDS.latMax && lng >= IL_BOUNDS.lngMin && lng <= IL_BOUNDS.lngMax;

const readCoords = (get) => {
  const lat = Number(get('lat'));
  const lng = Number(get('lng'));
  return get('lat') && get('lng') && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

/**
 * Rows without a position and the searches that can locate them, most exact first:
 * the street address in its city, then the place name in its city (for sites without a street address).
 */
export function locateQueries(rows) {
  if (rows.length === 0) return [];
  const header = mapHeader(rows[0]);
  return rows.slice(1).flatMap((row, i) => {
    const get = (key) => (header[key] === undefined ? '' : cell(row[header[key]]));
    if (readCoords(get)) return [];
    const [name, address, city] = [get('name'), get('address'), get('city')];
    const queries = [];
    if (address) queries.push({ query: [address, city].filter(Boolean).join(', '), by: 'address' });
    const byName = name && [name, city || address].filter(Boolean).join(', ');
    if (byName && byName !== queries[0]?.query) queries.push({ query: byName, by: 'name' });
    return queries.length > 0 ? [{ line: i + 2, queries }] : [];
  });
}

/**
 * One CSV row -> a place ready to insert, plus the reasons it cannot be imported (errors) and the optional
 * values that were dropped because they are not valid (warnings). Status always becomes 'pending'.
 * `located` is the geocoding result for a row without coordinates ({ lat, lng, city, address, by }),
 * null when it was searched and not found, undefined when it was not searched.
 */
export function rowToPlace(row, header, located) {
  const get = (key) => (header[key] === undefined ? '' : cell(row[header[key]]));
  const errors = [];
  const warnings = [];

  const fileCoords = readCoords(get);
  const position = fileCoords || located || null;
  const name = get('name');
  // a place found by name (e.g. a spring) gets the street the map knows, if any
  const address = get('address') || (fileCoords ? '' : located?.address || '');
  if (!name) errors.push('חסר שם');
  if (!address) errors.push('חסרה כתובת');

  const lat = position ? Number(position.lat) : NaN;
  const lng = position ? Number(position.lng) : NaN;
  if (!position) {
    errors.push(located === null ? 'לא נמצא מיקום מדויק לפי הכתובת או השם' : 'חסר מיקום (קו רוחב/אורך או כתובת)');
  } else if (!inIsrael(lat, lng)) errors.push('המיקום מחוץ לישראל');

  const rawCategory = get('category');
  const category = CATEGORIES.find(
    (c) => c.key === normalizeCategory(rawCategory.toLowerCase()) || c.label === rawCategory
  )?.key;
  if (!rawCategory) errors.push('חסרה קטגוריה');
  else if (!category) errors.push(`קטגוריה לא מוכרת: ${rawCategory}`);

  let rating = null;
  if (get('rating')) {
    rating = Number(get('rating'));
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      warnings.push('דירוג לא תקין');
      rating = null;
    }
  }

  let price_level = null;
  if (get('price_level')) {
    price_level = byLabel(PRICE_LEVELS, get('price_level'))?.value ?? null;
    if (!price_level) warnings.push('רמת מחיר לא מוכרת');
  }

  let kosher = null;
  if (get('kosher')) {
    kosher = KOSHER[get('kosher').toLowerCase()] ?? null;
    if (!kosher) warnings.push('ערך כשרות לא מוכר');
  }

  const links = {};
  for (const key of ['website', 'instagram', 'facebook']) {
    const link = toLink(get(key));
    if (link === undefined) warnings.push(`קישור לא תקין (${key})`);
    links[key] = link || null;
  }

  const images = splitList(get('images').replace(/\s+/g, ';')).filter((u) => /^https:\/\/\S+$/.test(u));
  if (images.length > MAX_PLACE_IMAGES) warnings.push(`יותר מ-${MAX_PLACE_IMAGES} תמונות, נשמרו הראשונות`);

  const amenities = cleanAmenities(
    splitList(get('amenities')).map((v) => AMENITIES.find((a) => a.key === v || a.label === v)?.key)
  );

  const hours = parseImportHours(get('opening_hours'));
  if (hours.opening_hours && !hours.recognized) warnings.push('שעות הפתיחה לא זוהו, נשמרו כטקסט בלבד');
  if (requiresHours({ name }) && !hasUsableSchedule(hours.opening_schedule)) warnings.push('עגלת קפה בלי שעות פתיחה');

  const orNull = (v) => (v ? v : null);
  const place = {
    name,
    category: category ?? null,
    city: orNull(get('city') || (fileCoords ? '' : located?.city)),
    address,
    lat,
    lng,
    short_description: orNull(get('short_description')),
    description: orNull(get('description')),
    images: images.slice(0, MAX_PLACE_IMAGES),
    rating,
    price_level,
    opening_hours: hours.opening_hours,
    opening_schedule: hours.opening_schedule,
    kosher,
    amenities,
    phone: orNull(get('phone')),
    ...links,
    tags: splitList(get('tags')),
  };
  return { place, errors, warnings, locatedBy: fileCoords ? null : located?.by ?? null };
}

// ---- duplicates and merging ------------------------------------------------------------

const phoneDigits = (phone) => {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.startsWith('972') ? `0${d.slice(3)}` : d;
};

/**
 * Same place? Stricter than isDuplicate() in lib/importPlaces (which is tuned for springs and reserves):
 * businesses in a city sit a few dozen meters apart, so position alone never counts.
 *  - same normalized name within 1 km, or
 *  - same distinctive name (without words like "מעיין", "חוף") within 300 m, or
 *  - same phone number.
 */
export function isSamePlace(a, b) {
  const km = haversineKm(Number(a.lat), Number(a.lng), Number(b.lat), Number(b.lng));
  const within = (limit) => Number.isFinite(km) && km <= limit;
  const nameA = normalizeName(a.name);
  if (nameA && nameA === normalizeName(b.name) && within(1)) return true;
  const coreA = coreName(a.name);
  if (coreA.length >= 3 && coreA === coreName(b.name) && within(0.3)) return true;
  const phoneA = phoneDigits(a.phone);
  return phoneA.length >= 9 && phoneA === phoneDigits(b.phone);
}

const FILL_FIELDS = [
  'city',
  'short_description',
  'description',
  'phone',
  'website',
  'instagram',
  'facebook',
  'opening_hours',
  'rating',
  'kosher',
];

const isEmpty = (v) => v === null || v === undefined || String(v).trim() === '';

/**
 * Only what `existing` is missing: empty fields are filled, tags and amenities are added to. Never overwrites a
 * value that is already there, and never touches name, category, position or status.
 */
export function missingFields(existing, incoming) {
  const patch = {};
  for (const key of FILL_FIELDS) {
    // hours text must describe the place's own schedule, so it is only filled when there is none
    if (key === 'opening_hours' && existing.opening_schedule) continue;
    if (isEmpty(existing[key]) && !isEmpty(incoming[key])) patch[key] = incoming[key];
  }
  if (getPlaceImages(existing).length === 0 && incoming.images?.length > 0) patch.images = incoming.images;
  // structured hours fill a place that has none; its text follows unless the place already has its own text
  if (!existing.opening_schedule && incoming.opening_schedule) {
    patch.opening_schedule = incoming.opening_schedule;
    if (isEmpty(existing.opening_hours)) patch.opening_hours = incoming.opening_hours;
  }

  const tags = [...new Set([...(existing.tags || []), ...(incoming.tags || [])])];
  if (tags.length > (existing.tags || []).length) patch.tags = tags;

  const amenities = cleanAmenities([...(existing.amenities || []), ...(incoming.amenities || [])]);
  if (amenities.length > cleanAmenities(existing.amenities).length) patch.amenities = amenities;
  return patch;
}

export const FIELD_LABELS = {
  ...Object.fromEntries(CSV_COLUMNS),
  images: 'תמונות',
  opening_schedule: 'שעות פתיחה מובנות',
};

/**
 * Decides what happens to every row of the file:
 *  - insert:  a new place, added as 'pending' so it shows up in "אישור מקומות"
 *  - fill:    an existing place that gets only its missing details
 *  - skip:    an existing place (or a row repeated in the file) with nothing new
 *  - invalid: rows that cannot be imported, with the reasons
 * `located` maps a line number to its geocoding result (see rowToPlace).
 */
export function planImport(rows, existingPlaces, located = {}) {
  const plan = { insert: [], fill: [], skip: [], invalid: [], missingNameColumn: false };
  if (rows.length === 0) return plan;
  const header = mapHeader(rows[0]);
  if (header.name === undefined) {
    plan.missingNameColumn = true;
    return plan;
  }

  const fills = new Map(); // existing id -> { target, patch, rows }
  rows.slice(1).forEach((row, i) => {
    const line = i + 2; // as shown in Excel: row 1 is the header
    const { place, errors, warnings, locatedBy } = rowToPlace(row, header, located[line]);
    if (errors.length > 0) {
      plan.invalid.push({ line, name: place.name, errors });
      return;
    }

    const target = existingPlaces.find((p) => isSamePlace(place, p));
    if (target) {
      const current = fills.get(target.id);
      const patch = missingFields({ ...target, ...current?.patch }, place);
      if (Object.keys(patch).length === 0) {
        plan.skip.push({ line, name: place.name, target, reason: `קיים כבר: ${target.name}` });
        return;
      }
      fills.set(target.id, { target, patch: { ...current?.patch, ...patch }, lines: [...(current?.lines || []), line] });
      return;
    }

    // repeated inside the same file: the first row wins, later rows can only add missing details
    const earlier = plan.insert.find((item) => isSamePlace(place, item.place));
    if (earlier) {
      Object.assign(earlier.place, missingFields(earlier.place, place));
      plan.skip.push({ line, name: place.name, reason: `כפול לשורה ${earlier.line} בקובץ` });
      return;
    }

    plan.insert.push({ line, place, warnings, locatedBy });
  });

  plan.fill = [...fills.values()];
  return plan;
}

/** Row to insert: new places always wait for approval. Empty hours stay empty (the column default claims 24/7). */
export const toInsertPayload = (place, userId) => ({
  ...place,
  price_level: place.price_level ?? 'moderate',
  status: 'pending',
  created_by_id: userId ?? null,
});
