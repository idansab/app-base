import { describe, it, expect } from 'vitest';
import { isWaterPlace } from './safetyNotes';

describe('isWaterPlace', () => {
  it('flags springs, streams, falls and beaches by name', () => {
    expect(isWaterPlace({ name: 'עין גדי' })).toBe(true);
    expect(isWaterPlace({ name: 'מעיין הבקעה' })).toBe(true);
    expect(isWaterPlace({ name: 'נחל שפירה' })).toBe(true);
    expect(isWaterPlace({ name: 'חוף הדייגים' })).toBe(true);
  });
  it('flags by the kind in the short description', () => {
    expect(isWaterPlace({ name: 'עוג', short_description: 'מעיין · מועצה אזורית גולן' })).toBe(true);
  });
  it('stays silent for other places', () => {
    expect(isWaterPlace({ name: 'קפה גרג - עפולה', short_description: 'בית קפה שקט' })).toBe(false);
    expect(isWaterPlace({ name: 'מצפה נמרוד', short_description: 'נקודת תצפית · ראש פינה' })).toBe(false);
    expect(isWaterPlace(null)).toBe(false);
  });
});
