import { describe, it, expect } from 'vitest';
import { authErrorMessage, passwordProblem, unmetRules } from './passwordRules';

describe('unmetRules', () => {
  it('lists what a password still needs', () => {
    expect(unmetRules('abc').map((r) => r.key)).toEqual(['length', 'upper', 'digit']);
    expect(unmetRules('abcdefgh').map((r) => r.key)).toEqual(['upper', 'digit']);
    expect(unmetRules('ABCDEFGH1').map((r) => r.key)).toEqual(['lower']);
  });

  it('accepts a password with every kind of character', () => {
    expect(unmetRules('Abcdefg1')).toEqual([]);
    expect(unmetRules('Gan-Eden-2026')).toEqual([]);
  });

  it('copes with empty and missing values', () => {
    expect(unmetRules('')).toHaveLength(4);
    expect(unmetRules(undefined)).toHaveLength(4);
  });
});

describe('passwordProblem', () => {
  it('is empty for a good password', () => {
    expect(passwordProblem('Abcdefg1')).toBe('');
  });

  it('names exactly what is missing, formally', () => {
    const message = passwordProblem('abcdefgh');
    expect(message).toContain('אינה עומדת בדרישות');
    expect(message).toContain('אות גדולה');
    expect(message).toContain('ספרה');
    expect(message).not.toContain('אות קטנה');
    expect(message).not.toContain('תווים');
  });
});

describe('authErrorMessage', () => {
  it('replaces the English password rule message', () => {
    const raw = 'Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789.';
    const message = authErrorMessage({ message: raw });
    expect(message).toBe('הסיסמה אינה עומדת בדרישות. יש לכלול לפחות אות קטנה באנגלית, אות גדולה באנגלית וספרה אחת.');
    expect(message).not.toMatch(/[a-z]{4}/);
  });

  it('translates the common sign-up and sign-in errors', () => {
    expect(authErrorMessage({ message: 'User already registered' })).toContain('כבר רשומה');
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toContain('אינן נכונות');
    expect(authErrorMessage({ message: 'Email not confirmed' })).toContain('לאשר את כתובת');
    expect(authErrorMessage({ message: 'Unable to validate email address: invalid format' })).toContain('אינה תקינה');
    expect(authErrorMessage({ message: 'Email rate limit exceeded' })).toContain('יותר מדי ניסיונות');
    expect(authErrorMessage({ message: 'captcha verification process failed' })).toContain('אימות האבטחה');
    expect(authErrorMessage({ message: 'New password should be different from the old password.' })).toContain('שונה מהסיסמה הנוכחית');
    expect(authErrorMessage({ message: 'Failed to fetch' })).toContain('אין חיבור');
  });

  it('never shows an unknown English message as it is', () => {
    expect(authErrorMessage({ message: 'Something odd happened in the engine' })).toBe('אירעה שגיאה. יש לנסות שוב.');
    expect(authErrorMessage(null, 'משהו אחר')).toBe('משהו אחר');
  });

  it('keeps a message that is already in Hebrew', () => {
    expect(authErrorMessage(new Error('הסיסמה הנוכחית שגויה'))).toBe('הסיסמה הנוכחית שגויה');
  });
});
