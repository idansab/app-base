import { describe, it, expect } from 'vitest';
import { contributionProblem, hoursFields, insideIsrael } from './contributeForm';

const weekly = {
  type: 'weekly',
  days: { 0: [['09:00', '17:00']], 1: [['09:00', '17:00']], 2: [], 3: [], 4: [], 5: [], 6: [] },
};

describe('insideIsrael', () => {
  it('accepts Israel and rejects the rest of the world', () => {
    expect(insideIsrael(32.08, 34.78)).toBe(true);
    expect(insideIsrael(29.55, 34.95)).toBe(true);
    expect(insideIsrael(0, 0)).toBe(false);
    expect(insideIsrael(48.85, 2.35)).toBe(false);
    expect(insideIsrael(NaN, 34.8)).toBe(false);
  });
});

describe('hoursFields', () => {
  it('is empty when the hours are unknown', () => {
    expect(hoursFields(null)).toEqual({ opening_schedule: null, opening_hours: null });
  });

  it('writes both columns for a weekly schedule', () => {
    const result = hoursFields(weekly);
    expect(result.opening_schedule.type).toBe('weekly');
    expect(typeof result.opening_hours).toBe('string');
    expect(result.opening_hours.length).toBeGreaterThan(0);
  });

  it('says "always open" and keeps the note', () => {
    expect(hoursFields({ type: 'always', note: '  בכל עונות השנה ' })).toEqual({
      opening_schedule: { type: 'always', note: 'בכל עונות השנה' },
      opening_hours: 'פתוח תמיד',
    });
  });
});

describe('contributionProblem', () => {
  const ok = { name: 'מעיין', category: 'nature', address: 'דרך הנחל 1', hasPosition: false, schedule: null };

  it('passes a complete form', () => {
    expect(contributionProblem(ok)).toBe('');
  });

  it('needs a name and a category', () => {
    expect(contributionProblem({ ...ok, name: '  ' })).toMatch(/שם/);
    expect(contributionProblem({ ...ok, category: '' })).toMatch(/קטגוריה/);
  });

  it('needs an address or a position from the phone', () => {
    expect(contributionProblem({ ...ok, address: '' })).toMatch(/כתובת/);
    expect(contributionProblem({ ...ok, address: '', hasPosition: true })).toBe('');
  });

  it('reports an invalid schedule', () => {
    const broken = { type: 'weekly', days: { 0: [['09:00', '09:00']], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } };
    expect(contributionProblem({ ...ok, schedule: broken })).toMatch(/ריק/);
  });

  it('accepts hours that run past midnight', () => {
    const night = { type: 'weekly', days: { 0: [['20:00', '02:00']], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } };
    expect(contributionProblem({ ...ok, schedule: night })).toBe('');
  });
});
