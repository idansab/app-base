import { describe, it, expect } from 'vitest';
import { getIssues, formToPayload, placeToForm, placesToCsv, matchesQuery, EMPTY_FORM } from './placeUtils';

const good = {
  id: '1',
  name: 'עין ארנון',
  category: 'nature',
  city: 'עפולה',
  address: 'רחוב 1',
  lat: 32.6,
  lng: 35.3,
  image_url: 'https://x/y.jpg',
  images: ['https://x/y.jpg'],
  opening_schedule: { type: 'always' },
  description: 'תיאור',
  phone: '04-1234567',
  tags: ['מים'],
};

describe('getIssues', () => {
  it('returns nothing for a complete place', () => {
    expect(getIssues(good)).toEqual([]);
  });

  it('flags missing image, description and phone', () => {
    expect(getIssues({ ...good, image_url: null, images: [], description: '  ', phone: '' })).toEqual([
      'no_image',
      'no_description',
      'no_phone',
    ]);
  });

  it('flags places without structured hours, and accepts the legacy single image', () => {
    expect(getIssues({ ...good, opening_schedule: null })).toEqual(['no_hours']);
    expect(getIssues({ ...good, images: [], image_url: 'https://x/z.jpg' })).not.toContain('no_image');
  });

  it('treats a short description as a description', () => {
    expect(getIssues({ ...good, description: null, short_description: 'קצר' })).not.toContain('no_description');
  });

  it('flags missing and zero coordinates as "no location"', () => {
    expect(getIssues({ ...good, lat: null })).toContain('no_coords');
    expect(getIssues({ ...good, lat: 0, lng: 0 })).toContain('no_coords');
    expect(getIssues({ ...good, lat: 0, lng: 0 })).not.toContain('out_of_israel');
  });

  it('flags coordinates outside Israel', () => {
    expect(getIssues({ ...good, lat: 48.85, lng: 2.35 })).toContain('out_of_israel');
    expect(getIssues({ ...good, lat: '32.6', lng: '35.3' })).not.toContain('out_of_israel');
  });
});

describe('formToPayload', () => {
  const form = { ...EMPTY_FORM, name: ' מקום ', address: ' כתובת ', lat: '32.1', lng: '34.8' };

  it('requires name, address and valid coordinates', () => {
    const { errors, payload } = formToPayload(EMPTY_FORM);
    expect(payload).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(['address', 'lat', 'lng', 'name']);
  });

  it('trims, converts numbers and turns blanks into null', () => {
    const { payload, errors } = formToPayload({ ...form, tags: ' a, ,b ', phone: ' ' });
    expect(errors).toEqual({});
    expect(payload).toMatchObject({ name: 'מקום', address: 'כתובת', lat: 32.1, lng: 34.8, phone: null, rating: null });
    expect(payload.tags).toEqual(['a', 'b']);
  });

  it('rejects ratings outside 0-5', () => {
    expect(formToPayload({ ...form, rating: '6' }).errors.rating).toBeTruthy();
    expect(formToPayload({ ...form, rating: 'abc' }).errors.rating).toBeTruthy();
    expect(formToPayload({ ...form, rating: '4.5' }).payload.rating).toBe(4.5);
  });

  it('round-trips an existing place without losing data', () => {
    const { payload } = formToPayload(placeToForm({ ...good, rating: 4, status: 'pending' }));
    expect(payload).toMatchObject({ name: good.name, lat: 32.6, rating: 4, status: 'pending', tags: ['מים'] });
    expect(payload.images).toEqual(['https://x/y.jpg']);
    expect(payload.opening_schedule).toEqual({ type: 'always' });
  });

  it('allows at most 5 images', () => {
    const six = ['1', '2', '3', '4', '5', '6'].map((n) => `https://x/${n}.jpg`);
    expect(formToPayload({ ...form, images: six }).errors.images).toBeTruthy();
    expect(formToPayload({ ...form, images: six.slice(0, 5) }).payload.images).toHaveLength(5);
  });

  it('validates the schedule and keeps opening_hours text in sync', () => {
    const bad = { type: 'weekly', days: { 0: [['9am', '5pm']] } };
    expect(formToPayload({ ...form, schedule: bad }).errors.schedule).toBeTruthy();

    const week = { type: 'weekly', days: { 0: [['07:00', '22:00']], 1: [['07:00', '22:00']], 2: [], 3: [], 4: [], 5: [], 6: [] } };
    const { payload } = formToPayload({ ...form, schedule: week, opening_hours: 'old text' });
    expect(payload.opening_hours).toBe("א'-ב' 07:00-22:00");
    expect(payload.opening_schedule.type).toBe('weekly');

    expect(formToPayload({ ...form, schedule: { type: 'always' } }).payload.opening_hours).toBe('פתוח תמיד');
    expect(formToPayload({ ...form, schedule: { type: 'always' }, opening_hours: 'שטח פתוח' }).payload.opening_hours).toBe('שטח פתוח');
    expect(formToPayload({ ...form, schedule: null }).payload.opening_schedule).toBeNull();
  });

  it('stores kosher info only when the place is kosher', () => {
    expect(formToPayload({ ...form, kosher: 'kosher', kosher_note: ' מהדרין ' }).payload).toMatchObject({ kosher: 'kosher', kosher_note: 'מהדרין' });
    expect(formToPayload({ ...form, kosher: 'not_kosher', kosher_note: 'x' }).payload).toMatchObject({ kosher: 'not_kosher', kosher_note: null });
    expect(formToPayload({ ...form, kosher: '' }).payload).toMatchObject({ kosher: null, kosher_note: null });
    expect(formToPayload({ ...form, kosher: 'kosher', kosher_note: 'x'.repeat(101) }).errors.kosher_note).toBeTruthy();
  });
});

describe('placesToCsv', () => {
  it('starts with a BOM and quotes cells', () => {
    const csv = placesToCsv([{ ...good, name: 'a "quoted", name' }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"a ""quoted"", name"');
  });

  it('neutralises spreadsheet formulas', () => {
    const csv = placesToCsv([{ ...good, name: '=HYPERLINK("http://evil")', address: '+1', phone: '-5' }]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain(`"'+1"`);
    expect(csv).toContain(`"'-5"`);
  });
});

describe('matchesQuery', () => {
  it('matches name, address, city, phone and tags case-insensitively', () => {
    expect(matchesQuery(good, 'ארנון')).toBe(true);
    expect(matchesQuery(good, 'עפולה')).toBe(true);
    expect(matchesQuery(good, '1234567')).toBe(true);
    expect(matchesQuery(good, 'מים')).toBe(true);
    expect(matchesQuery(good, 'לא קיים')).toBe(false);
  });

  it('matches everything for an empty query', () => {
    expect(matchesQuery(good, '   ')).toBe(true);
  });
});

describe('link fields', () => {
  it('accepts http(s) links and rejects anything else', async () => {
    const { formToPayload, EMPTY_FORM } = await import('./placeUtils');
    const base = { ...EMPTY_FORM, name: 'x', address: 'y', lat: '32', lng: '35' };
    expect(formToPayload({ ...base, website: 'https://a.co.il', facebook: '' }).payload.website).toBe('https://a.co.il');
    expect(formToPayload({ ...base, website: 'javascript:alert(1)' }).errors.website).toBeTruthy();
  });
});
