import { describe, it, expect } from 'vitest';
import {
  classify,
  coreName,
  hasHebrew,
  hebrewName,
  isDuplicate,
  isGenericName,
  normalizeName,
  pickBalanced,
  removeDuplicates,
  score,
  withinKm,
} from './importPlaces';

describe('hebrewName', () => {
  it('prefers name:he and requires Hebrew letters', () => {
    expect(hebrewName({ 'name:he': 'עין מלקוח', name: 'Ein Malqoah' })).toBe('עין מלקוח');
    expect(hebrewName({ name: 'עין גדי' })).toBe('עין גדי');
    expect(hebrewName({ name: 'Ein Gedi' })).toBeNull();
  });

  it('rejects empty, numeric and placeholder names', () => {
    expect(hebrewName({})).toBeNull();
    expect(hebrewName({ name: '12' })).toBeNull();
    expect(hebrewName({ name: 'מעיין ללא שם' })).toBeNull();
    expect(hebrewName({ name: 'אב' })).toBeNull();
  });

  it('collapses whitespace', () => {
    expect(hebrewName({ name: '  עין   אבדת ' })).toBe('עין אבדת');
  });
});

describe('normalizeName / coreName', () => {
  it('ignores niqqud, quotes and spacing', () => {
    expect(normalizeName('עֵין  גֶּדִי')).toBe('עין גדי');
    expect(normalizeName('"עין-גדי"')).toBe('עין גדי');
  });

  it('strips type words to the distinctive part', () => {
    expect(coreName('מעיין דוד')).toBe('דוד');
    expect(coreName('עין דוד')).toBe('דוד');
    expect(coreName('נחל דוד')).toBe('דוד');
    expect(coreName('שמורת נחל השבעה')).toBe('שבעה');
  });

  it('keeps the whole name when it only consists of type words', () => {
    expect(coreName('הר')).toBe('הר');
  });
});

describe('classify', () => {
  it('maps OSM tags to the app categories', () => {
    expect(classify({ natural: 'spring' })).toMatchObject({ category: 'nature', label: 'מעיין' });
    expect(classify({ waterway: 'waterfall' }).category).toBe('nature');
    expect(classify({ leisure: 'nature_reserve' }).category).toBe('nature');
    expect(classify({ tourism: 'viewpoint' }).category).toBe('view');
    expect(classify({ natural: 'beach' }).category).toBe('beach');
    expect(classify({ tourism: 'museum' }).category).toBe('culture');
    expect(classify({ historic: 'ruins' }).category).toBe('culture');
    expect(classify({ amenity: 'marketplace' }).category).toBe('shopping');
  });

  it('ignores things the app does not list', () => {
    expect(classify({ amenity: 'bank' })).toBeNull();
    expect(classify({ historic: 'wayside_cross' })).toBeNull();
    expect(classify({})).toBeNull();
  });
});

describe('score', () => {
  it('ranks notable places higher', () => {
    expect(score({ wikidata: 'Q1', wikipedia: 'he:x', website: 'x' })).toBeGreaterThan(score({ website: 'x' }));
    expect(score({})).toBe(0);
  });
});

describe('isDuplicate', () => {
  const base = { name: 'עין גדי', lat: 31.467, lng: 35.383 };

  it('matches identical names regardless of formatting, even far apart', () => {
    expect(isDuplicate({ name: 'עֵין גדי', lat: 32, lng: 35 }, base)).toBe(true);
  });

  it('matches the same distinctive name nearby, with a different type word', () => {
    expect(isDuplicate({ name: 'מעיין דוד', lat: 31.46, lng: 35.39 }, { name: 'נחל דוד', lat: 31.455, lng: 35.389 })).toBe(true);
  });

  it('does not match the same distinctive name in a different part of the country', () => {
    expect(isDuplicate({ name: 'עין דוד', lat: 33.0, lng: 35.5 }, { name: 'נחל דוד', lat: 31.455, lng: 35.389 })).toBe(false);
  });

  it('matches two different names at the same spot', () => {
    expect(isDuplicate({ name: 'משהו אחר', lat: 31.46702, lng: 35.38301 }, base)).toBe(true);
  });

  it('does not match unrelated places', () => {
    expect(isDuplicate({ name: 'מצדה', lat: 31.316, lng: 35.353 }, base)).toBe(false);
  });
});

describe('removeDuplicates', () => {
  const existing = [
    { name: 'עין גדי', lat: 31.467, lng: 35.383 },
    { name: 'שמורת חולה', lat: 33.04, lng: 35.62 },
  ];

  it('drops candidates already in the database', () => {
    const candidates = [
      { name: 'עין גדי', lat: 31.4671, lng: 35.3831 },
      { name: 'מצדה', lat: 31.316, lng: 35.353 },
    ];
    const { kept, dropped } = removeDuplicates(candidates, existing);
    expect(kept.map((c) => c.name)).toEqual(['מצדה']);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].clash.name).toBe('עין גדי');
  });

  it('uses the wider radius for existing places whose coordinates are rounded', () => {
    // 400 m from a place stored with two-decimal coordinates, with a related name
    const { kept } = removeDuplicates([{ name: 'חולה', lat: 33.0436, lng: 35.62 }], existing);
    expect(kept).toHaveLength(0);
  });

  it('drops repeats inside the batch itself, keeping the first', () => {
    const candidates = [
      { name: 'מצדה', lat: 31.316, lng: 35.353 },
      { name: 'מצדה', lat: 31.3161, lng: 35.3531 },
      { name: 'מצפה מצדה', lat: 31.3162, lng: 35.3532 },
      { name: 'ארבל', lat: 32.82, lng: 35.5 },
    ];
    const { kept } = removeDuplicates(candidates, []);
    expect(kept.map((c) => c.name)).toEqual(['מצדה', 'ארבל']);
  });

  it('is stable: running it twice changes nothing', () => {
    const candidates = [{ name: 'מצדה', lat: 31.316, lng: 35.353 }, { name: 'ארבל', lat: 32.82, lng: 35.5 }];
    const once = removeDuplicates(candidates, existing).kept;
    expect(removeDuplicates(once, existing).kept).toEqual(once);
  });
});

describe('pickBalanced', () => {
  const make = (category, i, s) => ({ name: `${category}${i}`, category, score: s });
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => make('nature', i, 10 - i)),
    ...Array.from({ length: 3 }, (_, i) => make('culture', i, 0.5)),
    ...Array.from({ length: 2 }, (_, i) => make('view', i, 0.2)),
  ];

  it('limits one category so the mix stays varied', () => {
    const picked = pickBalanced(pool, 8, 4);
    expect(picked.filter((c) => c.category === 'nature')).toHaveLength(4);
    expect(picked).toHaveLength(8);
  });

  it('fills up from the best remaining when quotas cannot be met', () => {
    expect(pickBalanced(pool, 15, 2)).toHaveLength(15);
  });

  it('returns what exists when there are fewer candidates than requested', () => {
    expect(pickBalanced(pool.slice(0, 3), 10)).toHaveLength(3);
  });
});

describe('withinKm / hasHebrew', () => {
  it('measures distance from a center', () => {
    const nofHaGalil = { lat: 32.7, lng: 35.32 };
    expect(withinKm({ lat: 32.79, lng: 35.5 }, nofHaGalil, 50)).toBe(true); // Tiberias area
    expect(withinKm({ lat: 29.55, lng: 34.95 }, nofHaGalil, 50)).toBe(false); // Eilat
  });

  it('detects Hebrew letters', () => {
    expect(hasHebrew('Haifa חיפה')).toBe(true);
    expect(hasHebrew('Haifa')).toBe(false);
  });
});

describe('isGenericName', () => {
  it('rejects names that are only a kind of place', () => {
    for (const name of ['גשר', 'בית הכנסת', 'גדר', 'המעיין', ' מצפה ']) expect(isGenericName(name)).toBe(true);
  });

  it('accepts real names, including ones that contain a generic word', () => {
    for (const name of ['גשר הזיו', 'עין גדי', 'מצפה רמון', 'שוק מחנה יהודה']) expect(isGenericName(name)).toBe(false);
  });
});
