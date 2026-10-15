import { describe, it, expect } from 'vitest';
import { placesToCsv } from './placeUtils';
import {
  decodeCsvBytes,
  isSamePlace,
  locateQueries,
  mapHeader,
  missingFields,
  parseCsv,
  planImport,
  rowToPlace,
  toInsertPayload,
} from './placeImport';

const existing = {
  id: 'p1',
  name: 'קפה נחת',
  category: 'food',
  city: 'תל אביב',
  address: 'דיזנגוף 1',
  lat: 32.08,
  lng: 34.78,
  phone: null,
  description: 'תיאור קיים',
  images: [],
  tags: ['קפה'],
  amenities: ['wheelchair'],
  status: 'approved',
};

const HEADER = 'שם,קטגוריה,עיר,כתובת,קו רוחב,קו אורך,טלפון,תיאור,תגיות,מאפיינים';

describe('parseCsv', () => {
  it('handles BOM, quotes, escaped quotes, CRLF and line breaks inside cells', () => {
    const text = '﻿שם,תיאור\r\n"מקום ""מיוחד""","שורה 1\nשורה 2"\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ['שם', 'תיאור'],
      ['מקום "מיוחד"', 'שורה 1\nשורה 2'],
    ]);
  });

  it('detects a semicolon delimiter (Excel in some locales)', () => {
    expect(parseCsv('שם;עיר\nא;ב')).toEqual([
      ['שם', 'עיר'],
      ['א', 'ב'],
    ]);
  });
});

describe('decodeCsvBytes', () => {
  it('reads UTF-8', () => {
    expect(decodeCsvBytes(new TextEncoder().encode('שלום'))).toBe('שלום');
  });

  it('falls back to Windows-1255 (Excel "CSV" save)', () => {
    // "שלום" in windows-1255
    expect(decodeCsvBytes(new Uint8Array([0xf9, 0xec, 0xe5, 0xed]))).toBe('שלום');
  });
});

describe('rowToPlace', () => {
  const header = mapHeader(HEADER.split(','));

  it('builds a place from Hebrew headers and labels', () => {
    const { place, errors } = rowToPlace(
      ['בר חדש', 'חיי לילה', 'חיפה', 'הנמל 5', '32.82', '34.99', "'+972-4-1234567", '', 'בירה; מוזיקה', 'ישיבה בחוץ'],
      header
    );
    expect(errors).toEqual([]);
    expect(place).toMatchObject({
      name: 'בר חדש',
      category: 'nightlife',
      lat: 32.82,
      lng: 34.99,
      phone: '+972-4-1234567',
      tags: ['בירה', 'מוזיקה'],
      amenities: ['outdoor_seating'],
      description: null,
    });
  });

  it('reports missing required fields, unknown category and positions outside Israel', () => {
    const { errors } = rowToPlace(['', 'מסעדות', '', '', '40.7', '-74'], header);
    expect(errors).toEqual(['חסר שם', 'חסרה כתובת', 'המיקום מחוץ לישראל', 'קטגוריה לא מוכרת: מסעדות']);
  });

  it('drops invalid optional values with a warning instead of failing the row', () => {
    const h = mapHeader(['name', 'category', 'address', 'lat', 'lng', 'website', 'rating']);
    const { place, errors, warnings } = rowToPlace(['א', 'food', 'ב', '32', '35', 'not a link', '9'], h);
    expect(errors).toEqual([]);
    expect(place.website).toBeNull();
    expect(place.rating).toBeNull();
    expect(warnings).toHaveLength(2);
  });
});

describe('isSamePlace', () => {
  it('matches the same name nearby, ignoring punctuation', () => {
    expect(isSamePlace({ name: 'קפה "נחת"', lat: 32.081, lng: 34.781 }, existing)).toBe(true);
  });

  it('does not match two branches with the same name in different cities', () => {
    expect(isSamePlace({ name: 'קפה נחת', lat: 32.8, lng: 35.0 }, existing)).toBe(false);
  });

  it('does not match a different business a few meters away', () => {
    expect(isSamePlace({ name: 'פיצה רומא', lat: 32.0801, lng: 34.7801 }, existing)).toBe(false);
  });

  it('matches by phone number in any format', () => {
    expect(isSamePlace({ name: 'x', lat: 31, lng: 35, phone: '+972-3-5551234' }, { name: 'y', lat: 33, lng: 35, phone: '03 555 1234' })).toBe(true);
  });
});

describe('missingFields', () => {
  it('fills only empty fields and adds tags and amenities, never overwriting', () => {
    const patch = missingFields(existing, {
      name: 'אחר',
      phone: '03-1234567',
      description: 'תיאור חדש',
      images: ['https://img/1.jpg'],
      tags: ['קפה', 'עוגות'],
      amenities: ['dog_friendly', 'wheelchair'],
    });
    expect(patch).toEqual({
      phone: '03-1234567',
      images: ['https://img/1.jpg'],
      tags: ['קפה', 'עוגות'],
      amenities: ['wheelchair', 'dog_friendly'],
    });
  });

  it('returns nothing when the file has no new details', () => {
    expect(missingFields(existing, { description: 'אחר', tags: ['קפה'] })).toEqual({});
  });
});

describe('planImport', () => {
  const rows = parseCsv(
    [
      HEADER,
      'מקום חדש,טבע וטיולים,ירושלים,רחוב 1,31.77,35.21,,,,', // new
      'קפה נחת,food,תל אביב,דיזנגוף 1,32.08,34.78,03-1234567,,,', // existing, adds phone
      'קפה נחת,food,תל אביב,דיזנגוף 1,32.08,34.78,,,,', // existing, nothing new
      'מקום חדש,nature,ירושלים,רחוב 1,31.7701,35.2101,02-6666666,,,', // repeated in file, adds phone
      ',food,,,,,,,,', // invalid
    ].join('\n')
  );
  const plan = planImport(rows, [existing]);

  it('sorts every row into insert / fill / skip / invalid', () => {
    expect(plan.insert.map((i) => i.line)).toEqual([2]);
    expect(plan.fill).toHaveLength(1);
    expect(plan.fill[0].patch).toEqual({ phone: '03-1234567' });
    expect(plan.skip.map((s) => s.line)).toEqual([4, 5]);
    expect(plan.invalid.map((s) => s.line)).toEqual([6]);
  });

  it('merges details from a repeated row into the first one', () => {
    expect(plan.insert[0].place.phone).toBe('02-6666666');
  });

  it('flags a file without a name column', () => {
    expect(planImport([['foo', 'bar'], ['1', '2']], []).missingNameColumn).toBe(true);
  });

  it('round-trips an exported file: everything is recognised as existing', () => {
    const roundTrip = planImport(parseCsv(placesToCsv([{ ...existing, phone: '03-1' }])), [{ ...existing, phone: '03-1' }]);
    expect(roundTrip.insert).toEqual([]);
    expect(roundTrip.skip).toHaveLength(1);
  });
});

describe('locating rows without coordinates', () => {
  const rows = parseCsv(
    [
      'שם,קטגוריה,עיר,כתובת,קו רוחב,קו אורך',
      'קפה חדש,food,חיפה,הרצל 10,,', // address + name
      'עין חמד,nature,,,,', // name only
      'יש מיקום,food,חיפה,הרצל 1,32.8,35.0', // has coordinates: not searched
    ].join('\n')
  );

  it('searches the exact address first, then the place name', () => {
    expect(locateQueries(rows)).toEqual([
      {
        line: 2,
        queries: [
          { query: 'הרצל 10, חיפה', by: 'address' },
          { query: 'קפה חדש, חיפה', by: 'name' },
        ],
      },
      { line: 3, queries: [{ query: 'עין חמד', by: 'name' }] },
    ]);
  });

  it('uses the found position, and the street and city from the map when the file has none', () => {
    const plan = planImport(rows, [], {
      2: { lat: 32.81, lng: 34.99, city: 'חיפה', address: 'הרצל 10', by: 'address' },
      3: { lat: 31.79, lng: 35.13, city: '', address: 'כביש 1', by: 'name' },
    });
    expect(plan.invalid).toEqual([]);
    expect(plan.insert.map((i) => i.locatedBy)).toEqual(['address', 'name', null]);
    expect(plan.insert[0].place).toMatchObject({ lat: 32.81, lng: 34.99, address: 'הרצל 10', city: 'חיפה' });
    expect(plan.insert[1].place.address).toBe('כביש 1');
  });

  it('explains rows that were searched and not found', () => {
    const plan = planImport(rows, [], { 2: null, 3: null });
    expect(plan.invalid.map((r) => r.errors)).toEqual([
      ['לא נמצא מיקום מדויק לפי הכתובת או השם'],
      ['חסרה כתובת', 'לא נמצא מיקום מדויק לפי הכתובת או השם'],
    ]);
  });

  it('never replaces coordinates that are in the file', () => {
    const { place, locatedBy } = rowToPlace(rows[3], mapHeader(rows[0]), { lat: 31, lng: 35, by: 'address' });
    expect(place).toMatchObject({ lat: 32.8, lng: 35.0 });
    expect(locatedBy).toBeNull();
  });
});

describe('toInsertPayload', () => {
  it('always waits for approval and keeps empty hours empty', () => {
    const payload = toInsertPayload({ name: 'א', opening_hours: null, price_level: null }, 'u1');
    expect(payload).toMatchObject({ status: 'pending', created_by_id: 'u1', opening_hours: null, price_level: 'moderate' });
  });
});
