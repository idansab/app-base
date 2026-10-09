import { describe, it, expect } from 'vitest';
import { containsPattern, escapeLike, normalizeQuery } from './placeSearch';

describe('normalizeQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeQuery('  קפה   גרג \n')).toBe('קפה גרג');
  });

  it('caps the length and tolerates null', () => {
    expect(normalizeQuery('x'.repeat(200))).toHaveLength(50);
    expect(normalizeQuery(null)).toBe('');
  });
});

describe('escapeLike', () => {
  it('escapes the wildcard characters', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  it('leaves normal text alone', () => {
    expect(escapeLike('קפה גרג')).toBe('קפה גרג');
  });
});

describe('containsPattern', () => {
  it('builds a contains pattern', () => {
    expect(containsPattern(' גרג ')).toBe('%גרג%');
  });

  it('refuses queries that are too short to be useful', () => {
    expect(containsPattern('א')).toBeNull();
    expect(containsPattern('   ')).toBeNull();
  });

  it('does not let a user turn the search into a match-everything wildcard', () => {
    expect(containsPattern('%%')).toBe('%\\%\\%%');
  });
});
