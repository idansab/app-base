import { describe, it, expect } from 'vitest';
import { buildReportNote, buildSuggestionChanges, placeToSuggestionForm } from './suggestChanges';

const place = { name: 'קפה הפינה', address: 'הרצל 1, חיפה', phone: '04-1111111', description: 'תיאור ישן', price_level: 'budget' };

describe('buildSuggestionChanges', () => {
  it('returns only what changed', () => {
    const form = { ...placeToSuggestionForm(place), phone: '04-2222222', description: 'תיאור חדש' };
    expect(buildSuggestionChanges(place, form)).toEqual({
      changes: { phone: '04-2222222', description: 'תיאור חדש' },
      errors: {},
    });
  });

  it('ignores untouched, blank and whitespace-only edits', () => {
    const form = { ...placeToSuggestionForm(place), description: '   ', short_description: '' };
    expect(buildSuggestionChanges(place, form).changes).toEqual({});
  });

  it('lets the name and address be corrected', () => {
    const form = { ...placeToSuggestionForm(place), name: ' קפה הפינה החדש ', address: 'הרצל 3, חיפה' };
    expect(buildSuggestionChanges(place, form).changes).toEqual({ name: 'קפה הפינה החדש', address: 'הרצל 3, חיפה' });
  });

  it('rejects values that are too short or too long', () => {
    const tooShort = buildSuggestionChanges(place, { ...placeToSuggestionForm(place), name: 'א' });
    expect(tooShort.errors.name).toBeTruthy();
    expect(tooShort.changes).toEqual({});
    const tooLong = buildSuggestionChanges(place, { ...placeToSuggestionForm(place), description: 'א'.repeat(2001) });
    expect(tooLong.errors.description).toBeTruthy();
  });

  it('accepts a known price level only', () => {
    expect(buildSuggestionChanges(place, { ...placeToSuggestionForm(place), price_level: 'expensive' }).changes).toEqual({ price_level: 'expensive' });
    expect(buildSuggestionChanges(place, { ...placeToSuggestionForm(place), price_level: 'cheap' }).changes).toEqual({});
  });
});

describe('buildReportNote', () => {
  it('needs a reason', () => {
    expect(buildReportNote('', 'x').error).toBeTruthy();
  });

  it('accepts a reason that explains itself', () => {
    expect(buildReportNote('gone', '')).toEqual({ note: 'המקום סגור או לא קיים', error: '' });
  });

  it('asks for details when the reason needs them', () => {
    expect(buildReportNote('other', 'קצר').error).toBeTruthy();
    expect(buildReportNote('details', 'הטלפון כבר לא נכון').note).toBe('פרטים שגויים: הטלפון כבר לא נכון');
  });

  it('keeps the note within 500 characters', () => {
    expect(buildReportNote('other', 'א'.repeat(900)).note).toHaveLength(500);
  });
});
