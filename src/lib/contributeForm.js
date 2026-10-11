// Pure helpers of the "share a place" form (the green plus). No React, no network.
import { summarizeSchedule, validateSchedule } from '@/lib/openingHours';
import { IL_BOUNDS } from '@/components/admin/places/placeUtils';

export const insideIsrael = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= IL_BOUNDS.latMin &&
  lat <= IL_BOUNDS.latMax &&
  lng >= IL_BOUNDS.lngMin &&
  lng <= IL_BOUNDS.lngMax;

/**
 * The two hours columns for a structured schedule, the same way the admin form writes them:
 * the weekly summary as text, "פתוח תמיד" for always open, nothing when unknown.
 */
export function hoursFields(schedule) {
  if (!schedule) return { opening_schedule: null, opening_hours: null };
  const note = schedule.note?.trim();
  const clean = { ...schedule, note: note || undefined };
  if (schedule.type === 'weekly') return { opening_schedule: clean, opening_hours: summarizeSchedule(schedule) };
  if (schedule.type === 'always') return { opening_schedule: clean, opening_hours: 'פתוח תמיד' };
  return { opening_schedule: null, opening_hours: null };
}

/**
 * What stops the form from being sent. A place needs a name and a position: either a typed address
 * (looked up on the map when sending) or a position taken from the phone.
 * @returns {string} a Hebrew message, or '' when the form is fine
 */
export function contributionProblem({ name, category, address, hasPosition, schedule }) {
  if (!String(name || '').trim()) return 'איך קוראים למקום? נא למלא שם.';
  if (!category) return 'נא לבחור קטגוריה.';
  if (!String(address || '').trim() && !hasPosition) return 'נא לכתוב כתובת, או ללחוץ על "המקום נמצא איפה שאני עכשיו".';
  const hoursError = validateSchedule(schedule);
  if (hoursError) return hoursError;
  return '';
}
