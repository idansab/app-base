import { describe, it, expect } from 'vitest';
import { parseOsmHours } from './osmHours';

describe('parseOsmHours', () => {
  it('reads 24/7', () => expect(parseOsmHours('24/7')).toEqual({ type: 'always' }));

  it('reads day ranges and several rules', () => {
    const s = parseOsmHours('Mo-Fr 09:00-17:00; Sa 10:00-14:00');
    expect(s.days[1]).toEqual([['09:00', '17:00']]);
    expect(s.days[5]).toEqual([['09:00', '17:00']]);
    expect(s.days[6]).toEqual([['10:00', '14:00']]);
    expect(s.days[0]).toEqual([]);
  });

  it('reads split shifts, day lists, off and 24:00', () => {
    const s = parseOsmHours('Su,Tu 08:00-12:00,16:00-24:00; We off');
    expect(s.days[0]).toEqual([['08:00', '12:00'], ['16:00', '00:00']]);
    expect(s.days[3]).toEqual([]);
  });

  it('wraps a range like Fr-Mo across the week', () => {
    const s = parseOsmHours('Fr-Mo 10:00-18:00');
    expect([5, 6, 0, 1].every((d) => s.days[d].length === 1)).toBe(true);
    expect(s.days[3]).toEqual([]);
  });

  it('gives up on anything it does not fully understand', () => {
    for (const v of ['Mo-Fr 09:00-17:00; PH off', 'sunrise-sunset', 'by appointment', 'Mo-Fr 09:00-17:00 "call"', '', null, 'Mo-Fr 25:00-26:00']) {
      expect(parseOsmHours(v)).toBeNull();
    }
  });
});
