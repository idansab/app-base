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
  description: 'תיאור',
  phone: '04-1234567',
  tags: ['מים'],
};

describe('getIssues', () => {
  it('returns nothing for a complete place', () => {
    expect(getIssues(good)).toEqual([]);
  });

  it('flags missing image, description and phone', () => {
    expect(getIssues({ ...good, image_url: null, description: '  ', phone: '' })).toEqual([
      'no_image',
      'no_description',
      'no_phone',
    ]);
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
