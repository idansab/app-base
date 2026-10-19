// The public name a user picks at signup. It is shown on everything they write or upload, instead of the email.
// Mirrors public.clean_display_name() in supabase/migrations/031_display_names.sql (the server has the last word).

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 30;

const RESERVED = /(admin|moderator|support|מנהל|מודרטור|מערכת|צוות|בעל העסק|בעלת העסק)/i;

/** Trimmed, with runs of whitespace collapsed to one space. */
export const normalizeDisplayName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim();

/** A Hebrew error for an unacceptable name, or null when it can be saved. */
export function displayNameProblem(name) {
  const n = normalizeDisplayName(name);
  if (!n) return 'יש לבחור שם שיוצג באתר';
  if (n.length < DISPLAY_NAME_MIN) return `השם צריך לכלול לפחות ${DISPLAY_NAME_MIN} תווים`;
  if (n.length > DISPLAY_NAME_MAX) return `השם יכול לכלול עד ${DISPLAY_NAME_MAX} תווים`;
  if (n.includes('@')) return 'אין להשתמש בכתובת אימייל בתור שם';
  if (/[\u0000-\u001f\u007f]/.test(n)) return 'השם מכיל תווים לא חוקיים';
  if (!/\p{L}/u.test(n)) return 'השם צריך לכלול לפחות אות אחת';
  if (RESERVED.test(n)) return 'השם הזה שמור. יש לבחור שם אחר';
  return null;
}

/** True when the server refused an action because the user has not chosen a display name yet. */
export const isDisplayNameRequired = (error) =>
  error?.hint === 'display_name_required' || /display name required/i.test(String(error?.message ?? ''));
