// What a visitor may suggest about a place. Must match sanitize_suggestion_changes() in migration 021.

export const SUGGEST_REASONS = [
  { key: 'gone', label: 'המקום סגור או לא קיים', needsText: false },
  { key: 'duplicate', label: 'המקום מופיע פעמיים', needsText: false },
  { key: 'location', label: 'המיקום במפה שגוי', needsText: false },
  { key: 'details', label: 'פרטים שגויים', needsText: true },
  { key: 'other', label: 'אחר', needsText: true },
];

export const MAX_SUGGESTED_IMAGES = 3;

const text = (value) => String(value ?? '').trim();

// [form key, label, min length, max length]
const FIELDS = [
  ['name', 'שם', 2, 80],
  ['address', 'כתובת', 3, 200],
  ['phone', 'טלפון', 0, 30],
  ['short_description', 'תיאור קצר', 0, 200],
  ['description', 'תיאור', 0, 2000],
  ['opening_hours', 'שעות פתיחה', 0, 200],
];
const PRICE_LEVELS = ['free', 'budget', 'moderate', 'expensive'];

/** The editable starting values of the suggestion form. */
export const placeToSuggestionForm = (place) => ({
  name: text(place?.name),
  address: text(place?.address),
  phone: text(place?.phone),
  short_description: text(place?.short_description),
  description: text(place?.description),
  opening_hours: text(place?.opening_hours),
  price_level: place?.price_level || '',
});

/**
 * Compares the form with the place and returns only what the visitor changed.
 * An empty box means "no opinion", never "delete this".
 * @returns {{ changes: object, errors: object }}
 */
export function buildSuggestionChanges(place, form) {
  const baseline = placeToSuggestionForm(place);
  const changes = {};
  const errors = {};

  for (const [key, label, min, max] of FIELDS) {
    const value = text(form[key]);
    if (value === '' || value === baseline[key]) continue;
    if (value.length < min) errors[key] = `${label}: לפחות ${min} תווים`;
    else if (value.length > max) errors[key] = `${label}: עד ${max} תווים`;
    else changes[key] = value;
  }

  if (form.price_level && form.price_level !== baseline.price_level) {
    if (PRICE_LEVELS.includes(form.price_level)) changes.price_level = form.price_level;
  }
  return { changes, errors };
}

/** The note sent with a report. Returns { note, error }. */
export function buildReportNote(reasonKey, details) {
  const reason = SUGGEST_REASONS.find((r) => r.key === reasonKey);
  if (!reason) return { note: '', error: 'בחר סיבה' };
  const extra = text(details);
  if (reason.needsText && extra.length < 5) return { note: '', error: 'ספר לנו בקצרה מה לא נכון (לפחות 5 תווים)' };
  const note = extra ? `${reason.label}: ${extra}` : reason.label;
  return { note: note.slice(0, 500), error: '' };
}
