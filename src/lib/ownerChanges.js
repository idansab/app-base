import { formToPayload, placeToForm } from '@/components/admin/places/placeUtils';
import { summarizeSchedule } from '@/lib/openingHours';

/**
 * What an owner may change. Fields that only make sense together are one group, so the admin
 * accepts or rejects them as a unit (e.g. the structured schedule and its text).
 * Must match sanitize_place_changes() in migration 010.
 */
export const OWNER_GROUPS = [
  { key: 'short_description', label: 'תיאור קצר', fields: ['short_description'] },
  { key: 'description', label: 'תיאור', fields: ['description'] },
  { key: 'phone', label: 'טלפון', fields: ['phone'] },
  { key: 'hours', label: 'שעות פתיחה', fields: ['opening_schedule', 'opening_hours'] },
  { key: 'images', label: 'תמונות', fields: ['images'] },
  { key: 'kosher', label: 'כשרות', fields: ['kosher', 'kosher_note'] },
  { key: 'price_level', label: 'רמת מחיר', fields: ['price_level'] },
  { key: 'tags', label: 'תגיות', fields: ['tags'] },
];

const PRICE_LABELS = { free: 'חינם', budget: 'זול', moderate: 'בינוני', expensive: 'יקר' };
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Compares the edited form with the place as it is now and returns only what changed.
 * @returns {{ changes: object, errors: object }}  changes is {} when nothing changed
 */
export function buildOwnerChanges(place, form) {
  const { payload, errors } = formToPayload({ ...form, status: place.status ?? 'approved' });
  if (!payload) return { changes: {}, errors };

  // same pipeline for both sides, so formatting differences never count as edits
  const baseline = formToPayload(placeToForm(place)).payload;
  const changes = {};
  for (const group of OWNER_GROUPS) {
    if (group.fields.some((field) => !same(payload[field], baseline[field]))) {
      for (const field of group.fields) changes[field] = payload[field] ?? null;
    }
  }
  return { changes, errors };
}

/** Groups present in a change set, in display order. */
export function changedGroups(changes) {
  return OWNER_GROUPS.filter((group) => group.fields.some((field) => field in (changes || {})));
}

/** All column names of the given groups (what admin_apply_update_request expects). */
export const fieldsOfGroups = (groupKeys) =>
  OWNER_GROUPS.filter((g) => groupKeys.includes(g.key)).flatMap((g) => g.fields);

/**
 * Text for the before/after view. Images are rendered separately (see `isImageGroup`).
 * `source` is a place row or a change set.
 */
export function describeGroup(group, source) {
  if (!source) return '';
  switch (group.key) {
    case 'hours':
      return source.opening_schedule ? summarizeSchedule(source.opening_schedule) : source.opening_hours || 'לא מוגדר';
    case 'kosher':
      if (source.kosher === 'kosher') return `כשר${source.kosher_note ? ` · ${source.kosher_note}` : ''}`;
      if (source.kosher === 'not_kosher') return 'לא כשר';
      return 'לא ידוע';
    case 'price_level':
      return PRICE_LABELS[source.price_level] || '—';
    case 'tags':
      return (source.tags || []).join(', ') || '—';
    case 'images':
      return `${(source.images || []).length} תמונות`;
    default:
      return source[group.key] || '—';
  }
}

export const isImageGroup = (group) => group.key === 'images';
