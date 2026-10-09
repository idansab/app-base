// Pure helpers for the admin places manager (no React, no network) so they can be unit-tested.

export const STATUS_LABELS = {
  pending: 'ממתין',
  approved: 'מאושר',
  rejected: 'נדחה',
};

export const PRICE_LEVELS = [
  { value: 'free', label: 'חינם' },
  { value: 'budget', label: 'זול' },
  { value: 'moderate', label: 'בינוני' },
  { value: 'expensive', label: 'יקר' },
];

// Rough bounding box of Israel; anything outside is almost certainly a typo or a bad geocode.
export const IL_BOUNDS = { latMin: 29.4, latMax: 33.4, lngMin: 34.2, lngMax: 35.95 };

const isNum = (v) => v !== null && v !== '' && Number.isFinite(Number(v));

/** Data-quality checks: the things worth fixing when going through the list. */
export const ISSUES = {
  no_image: { label: 'בלי תמונה', test: (p) => !p.image_url },
  no_description: {
    label: 'בלי תיאור',
    test: (p) => !(p.description || '').trim() && !(p.short_description || '').trim(),
  },
  no_phone: { label: 'בלי טלפון', test: (p) => !(p.phone || '').trim() },
  no_coords: {
    label: 'בלי מיקום',
    test: (p) => !isNum(p.lat) || !isNum(p.lng) || (Number(p.lat) === 0 && Number(p.lng) === 0),
  },
  out_of_israel: {
    label: 'מיקום חשוד',
    test: (p) =>
      isNum(p.lat) &&
      isNum(p.lng) &&
      !(Number(p.lat) === 0 && Number(p.lng) === 0) &&
      (Number(p.lat) < IL_BOUNDS.latMin ||
        Number(p.lat) > IL_BOUNDS.latMax ||
        Number(p.lng) < IL_BOUNDS.lngMin ||
        Number(p.lng) > IL_BOUNDS.lngMax),
  },
};

export const getIssues = (place) =>
  Object.entries(ISSUES)
    .filter(([, issue]) => issue.test(place))
    .map(([key]) => key);

export const EMPTY_FORM = {
  name: '',
  category: 'other',
  city: '',
  address: '',
  lat: '',
  lng: '',
  short_description: '',
  description: '',
  image_url: '',
  rating: '',
  price_level: 'moderate',
  opening_hours: '',
  phone: '',
  tags: '',
  status: 'approved',
};

export const placeToForm = (place) => ({
  name: place.name ?? '',
  category: place.category ?? 'other',
  city: place.city ?? '',
  address: place.address ?? '',
  lat: place.lat == null ? '' : String(place.lat),
  lng: place.lng == null ? '' : String(place.lng),
  short_description: place.short_description ?? '',
  description: place.description ?? '',
  image_url: place.image_url ?? '',
  rating: place.rating == null ? '' : String(place.rating),
  price_level: place.price_level ?? 'moderate',
  opening_hours: place.opening_hours ?? '',
  phone: place.phone ?? '',
  tags: (place.tags || []).join(', '),
  status: place.status ?? 'approved',
});

const orNull = (v) => {
  const t = String(v ?? '').trim();
  return t === '' ? null : t;
};

/** Validates the form and builds the DB payload. Returns { payload, errors }. */
export function formToPayload(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'שם חובה';
  if (!form.address.trim()) errors.address = 'כתובת חובה';
  if (!isNum(form.lat)) errors.lat = 'קו רוחב לא תקין';
  if (!isNum(form.lng)) errors.lng = 'קו אורך לא תקין';

  let rating = null;
  if (String(form.rating).trim() !== '') {
    rating = Number(form.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) errors.rating = 'דירוג בין 0 ל-5';
  }

  if (Object.keys(errors).length > 0) return { payload: null, errors };

  return {
    errors,
    payload: {
      name: form.name.trim(),
      category: form.category,
      city: orNull(form.city),
      address: form.address.trim(),
      lat: Number(form.lat),
      lng: Number(form.lng),
      short_description: orNull(form.short_description),
      description: orNull(form.description),
      image_url: orNull(form.image_url),
      rating,
      price_level: form.price_level,
      opening_hours: orNull(form.opening_hours),
      phone: orNull(form.phone),
      tags: String(form.tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      status: form.status,
    },
  };
}

// Cells starting with these characters are executed as formulas by Excel/Sheets.
// Place data is user-submitted, so neutralise them.
const csvCell = (value) => {
  let s = value == null ? '' : Array.isArray(value) ? value.join('; ') : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const CSV_COLUMNS = [
  ['name', 'שם'],
  ['category', 'קטגוריה'],
  ['city', 'עיר'],
  ['address', 'כתובת'],
  ['lat', 'קו רוחב'],
  ['lng', 'קו אורך'],
  ['status', 'סטטוס'],
  ['rating', 'דירוג'],
  ['phone', 'טלפון'],
  ['opening_hours', 'שעות פתיחה'],
  ['price_level', 'רמת מחיר'],
  ['tags', 'תגיות'],
  ['image_url', 'תמונה'],
  ['short_description', 'תיאור קצר'],
  ['description', 'תיאור'],
];

/** CSV with a BOM so Excel opens Hebrew correctly. */
export function placesToCsv(places) {
  const header = CSV_COLUMNS.map(([, label]) => csvCell(label)).join(',');
  const rows = places.map((p) => CSV_COLUMNS.map(([key]) => csvCell(p[key])).join(','));
  return '﻿' + [header, ...rows].join('\r\n');
}

/** Case-insensitive match over the fields an admin would search by. */
export function matchesQuery(place, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [place.name, place.address, place.city, place.phone, ...(place.tags || [])]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}
