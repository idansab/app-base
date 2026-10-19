import { describe, it, expect } from 'vitest';
import { DISPLAY_NAME_MAX, displayNameProblem, isDisplayNameRequired, normalizeDisplayName } from './displayName';

describe('normalizeDisplayName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeDisplayName('  דנה   כהן  ')).toBe('דנה כהן');
    expect(normalizeDisplayName('a\tb')).toBe('a b');
    expect(normalizeDisplayName(null)).toBe('');
  });
});

describe('displayNameProblem', () => {
  it('accepts Hebrew, English, and names with digits or punctuation', () => {
    expect(displayNameProblem('דנה כהן')).toBeNull();
    expect(displayNameProblem('  דני  ')).toBeNull();
    expect(displayNameProblem('Dana K.')).toBeNull();
    expect(displayNameProblem('מטייל 2')).toBeNull();
    expect(displayNameProblem('א'.repeat(DISPLAY_NAME_MAX))).toBeNull();
  });
  it('rejects empty, too short and too long names', () => {
    expect(displayNameProblem('')).toBeTruthy();
    expect(displayNameProblem('   ')).toBeTruthy();
    expect(displayNameProblem('א')).toBeTruthy();
    expect(displayNameProblem('א'.repeat(DISPLAY_NAME_MAX + 1))).toContain(String(DISPLAY_NAME_MAX));
  });
  it('rejects emails, names without letters and reserved names', () => {
    expect(displayNameProblem('dana@gmail.com')).toContain('אימייל');
    expect(displayNameProblem('12345')).toBeTruthy();
    expect(displayNameProblem('!!!')).toBeTruthy();
    expect(displayNameProblem('Admin')).toBeTruthy();
    expect(displayNameProblem('מנהלת האתר')).toBeTruthy();
    expect(displayNameProblem('בעל העסק')).toBeTruthy();
  });
});

describe('isDisplayNameRequired', () => {
  it('recognizes the server hint and message', () => {
    expect(isDisplayNameRequired({ hint: 'display_name_required' })).toBe(true);
    expect(isDisplayNameRequired({ message: 'display name required' })).toBe(true);
    expect(isDisplayNameRequired({ message: 'rate limit exceeded' })).toBe(false);
    expect(isDisplayNameRequired(null)).toBe(false);
  });
});
