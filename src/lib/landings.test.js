import { describe, it, expect } from 'vitest';
import { LANDINGS, getLanding, landingFilter, landingMatches, landingPath } from './landings';

describe('LANDINGS', () => {
  it('has unique paths, H1s and titles', () => {
    for (const key of ['h1', 'title', 'description', 'intro']) {
      expect(new Set(LANDINGS.map((l) => l[key])).size).toBe(LANDINGS.length);
    }
    expect(new Set(LANDINGS.map(landingPath)).size).toBe(LANDINGS.length);
  });

  it('finds pages by kind and slug', () => {
    expect(getLanding('city', 'haifa')?.name).toBe('חיפה');
    expect(getLanding('category', 'haifa')).toBeNull();
    expect(landingPath(getLanding('category', 'coffee-carts'))).toBe('/category/coffee-carts');
  });
});

describe('landingFilter', () => {
  it('quotes values and ORs the rules', () => {
    expect(landingFilter({ match: { cities: ['תל אביב - יפו', 'חיפה'] } })).toBe('city.in.("תל אביב - יפו","חיפה")');
    expect(landingFilter({ match: { labels: ['עגלת קפה'] } })).toBe(
      'tags.ov.{"עגלת קפה"},short_description.eq."עגלת קפה",short_description.like."עגלת קפה ·*"'
    );
  });
});

describe('landingMatches', () => {
  const springs = getLanding('category', 'springs');
  it('matches by tag or by the short_description label, not by a longer word', () => {
    expect(landingMatches(springs, { tags: ['מעיין'] })).toBe(true);
    expect(landingMatches(springs, { short_description: 'מעיין · הגולן' })).toBe(true);
    expect(landingMatches(springs, { short_description: 'מעיינות הגליל · מסעדה' })).toBe(false);
    expect(landingMatches(getLanding('city', 'tel-aviv'), { city: 'תל־אביב–יפו' })).toBe(true);
  });
});
