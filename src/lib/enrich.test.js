import { describe, it, expect } from 'vitest';
import { buildDescription, formatPhone, isGeneratedDescription, leadSentences, pickLinks, wikiDescription } from './enrich';

describe('formatPhone', () => {
  it('formats mobile and landline numbers', () => {
    expect(formatPhone('+972506374636')).toBe('050-6374636');
    expect(formatPhone('+97248322066')).toBe('04-8322066');
    expect(formatPhone('972-3-555-1234')).toBe('03-5551234');
  });
  it('rejects anything else', () => {
    expect(formatPhone('+12025550123')).toBeNull();
    expect(formatPhone('12345')).toBeNull();
    expect(formatPhone(null)).toBeNull();
  });
});

describe('pickLinks', () => {
  it('sorts links by kind', () => {
    expect(pickLinks(['https://bar.co.il/'], ['https://www.facebook.com/123', 'https://instagram.com/bar'])).toEqual({
      website: 'https://bar.co.il/', instagram: 'https://instagram.com/bar', facebook: 'https://www.facebook.com/123',
    });
  });
  it('skips booking and shortener links', () => {
    expect(pickLinks(['https://tabitisrael.co.il/x', 'https://did.li/abc', 'https://ontopo.com/y'], []).website).toBeNull();
    expect(pickLinks(['http://www.223.co.il/'], []).website).toBe('http://www.223.co.il/');
  });
  it('drops tracking parameters from social links and skips auto-generated sites', () => {
    const l = pickLinks(['https://x.business.site/?copy'], ['https://www.instagram.com/a?igsh=1&utm_source=qr']);
    expect(l.instagram).toBe('https://www.instagram.com/a');
    expect(l.website).toBeNull();
  });
  it('ignores junk and other networks', () => {
    expect(pickLinks(['javascript:alert(1)', 'ftp://x'], ['https://x.com/a'])).toEqual({ website: null, instagram: null, facebook: null });
  });
});

describe('buildDescription', () => {
  it('uses facts only', () => {
    expect(buildDescription({ label: 'בר', city: 'חיפה', address: 'הנשיא 124, חיפה' })).toBe('בר בחיפה.');
    expect(buildDescription({ label: 'מעיין', city: 'x', wikidata: 'מעיין בגליל.' })).toBe('מעיין בגליל.');
    expect(buildDescription({ label: 'בר' })).toBe('בר.');
    expect(buildDescription({})).toBeNull();
  });
});

describe('wikiDescription', () => {
  const existing = 'מעיין במועצה אזורית מטה יהודה. מומלץ לבדוק את תנאי השטח לפני היציאה.';
  it('only treats importer text as replaceable', () => {
    expect(isGeneratedDescription(existing)).toBe(true);
    expect(isGeneratedDescription('עין פשחס הוא מעיין יפהפה.')).toBe(false);
  });
  it('uses the Wikipedia lead without parentheses, credited, keeping the practical note', () => {
    const extract = 'עין חניה (בערבית: עין אל-חניה) הוא מעיין בעמק רפאים. המעיין שוחזר בשנת 2018. משפט שלישי ארוך מאוד '.concat('x'.repeat(300), '.');
    expect(wikiDescription({ name: 'עין חניה', existing, extract })).toBe(
      'עין חניה הוא מעיין בעמק רפאים. המעיין שוחזר בשנת 2018. (מתוך ויקיפדיה) מומלץ לבדוק את תנאי השטח לפני היציאה.'
    );
  });
  it('falls back to a specific Wikidata description, and to nothing', () => {
    expect(wikiDescription({ name: 'עין X', existing, wikidata: 'מעיין בגליל העליון' })).toBe('עין X – מעיין בגליל העליון. מומלץ לבדוק את תנאי השטח לפני היציאה.');
    expect(wikiDescription({ name: 'עין X', existing, wikidata: 'מעיין' })).toBeNull();
  });
});

describe('leadSentences', () => {
  it('drops niqqud but keeps the maqaf', () => {
    expect(leadSentences('נַחַל אַבּוּב הוא נחל ממזרח לערד־אבוב.')).toBe('נחל אבוב הוא נחל ממזרח לערד־אבוב.');
  });
});
