import { describe, it, expect } from 'vitest';
import {
  emptyWeek,
  getOpenStatus,
  isOpenNow,
  israelNow,
  parseHoursText,
  summarizeSchedule,
  validateSchedule,
  weeklyRows,
} from './openingHours';

// Israel is UTC+3 in summer (IDT) and UTC+2 in winter (IST); pick unambiguous summer dates.
// 2026-07-05 is a Sunday.
const at = (iso) => new Date(iso);
const sundayMorning = at('2026-07-05T08:00:00+03:00'); // Sunday 08:00 Israel

const weekly = (days) => ({ type: 'weekly', days: { ...emptyWeek().days, ...days } });
const place = (schedule) => ({ opening_schedule: schedule });

describe('israelNow', () => {
  it('uses Israel time regardless of the machine timezone', () => {
    expect(israelNow(at('2026-07-05T05:00:00Z'))).toEqual({ day: 0, minutes: 8 * 60 }); // 08:00 IDT
    expect(israelNow(at('2026-01-04T05:00:00Z'))).toEqual({ day: 0, minutes: 7 * 60 }); // 07:00 IST (winter)
  });

  it('rolls the weekday over at Israeli midnight, not UTC midnight', () => {
    // 22:30 UTC Saturday = 01:30 Sunday in Israel (summer)
    expect(israelNow(at('2026-07-04T22:30:00Z'))).toEqual({ day: 0, minutes: 90 });
  });
});

describe('getOpenStatus', () => {
  it('is unknown without a schedule (so no badge is shown)', () => {
    expect(getOpenStatus({}, sundayMorning).state).toBe('unknown');
    expect(getOpenStatus(place(null), sundayMorning).short).toBeNull();
    expect(isOpenNow(place(null), sundayMorning)).toBeNull();
  });

  it('treats invalid schedules as unknown instead of guessing', () => {
    expect(getOpenStatus(place({ type: 'weekly', days: { 0: [['9am', '5pm']] } }), sundayMorning).state).toBe('unknown');
  });

  it('always-open places are open', () => {
    const s = getOpenStatus(place({ type: 'always' }), sundayMorning);
    expect(s).toMatchObject({ state: 'always', short: 'פתוח תמיד' });
    expect(isOpenNow(place({ type: 'always' }), sundayMorning)).toBe(true);
  });

  it('is open inside a range and says when it closes', () => {
    const s = getOpenStatus(place(weekly({ 0: [['07:00', '22:00']] })), sundayMorning);
    expect(s).toMatchObject({ state: 'open', short: 'פתוח עכשיו', label: 'פתוח עד 22:00' });
  });

  it('warns when closing within an hour', () => {
    const s = getOpenStatus(place(weekly({ 0: [['07:00', '08:25']] })), sundayMorning);
    expect(s).toMatchObject({ state: 'closing_soon', short: 'נסגר בעוד 25 דק׳' });
    expect(isOpenNow(place(weekly({ 0: [['07:00', '08:25']] })), sundayMorning)).toBe(true);
  });

  it('start is inclusive and end is exclusive', () => {
    const p = place(weekly({ 0: [['08:00', '12:00']] }));
    expect(getOpenStatus(p, at('2026-07-05T07:59:00+03:00')).state).toBe('closed');
    expect(getOpenStatus(p, at('2026-07-05T08:00:00+03:00')).state).toBe('open');
    expect(getOpenStatus(p, at('2026-07-05T11:59:00+03:00')).state).toBe('closing_soon');
    expect(getOpenStatus(p, at('2026-07-05T12:00:00+03:00')).state).toBe('closed');
  });

  it('is closed outside the range and names the next opening today', () => {
    const p = place(weekly({ 0: [['10:00', '18:00']] }));
    const s = getOpenStatus(p, sundayMorning);
    expect(s).toMatchObject({ state: 'closed', short: 'סגור', label: 'סגור · נפתח היום ב-10:00' });
    expect(isOpenNow(p, sundayMorning)).toBe(false);
  });

  it('names tomorrow and later days for the next opening', () => {
    const tomorrow = place(weekly({ 1: [['09:00', '17:00']] }));
    expect(getOpenStatus(tomorrow, sundayMorning).label).toBe('סגור · נפתח מחר ב-09:00');
    const thursday = place(weekly({ 4: [['09:00', '17:00']] }));
    expect(getOpenStatus(thursday, sundayMorning).label).toBe('סגור · נפתח ביום חמישי ב-09:00');
  });

  it('is plainly closed when it never opens', () => {
    expect(getOpenStatus(place(emptyWeek()), sundayMorning)).toMatchObject({ state: 'closed', label: 'סגור' });
  });

  it('supports split shifts', () => {
    const p = place(weekly({ 0: [['08:00', '12:00'], ['16:00', '20:00']] }));
    expect(getOpenStatus(p, at('2026-07-05T10:00:00+03:00')).state).toBe('open');
    const noon = getOpenStatus(p, at('2026-07-05T13:00:00+03:00'));
    expect(noon.state).toBe('closed');
    expect(noon.label).toBe('סגור · נפתח היום ב-16:00');
  });

  it('handles ranges that cross midnight, on both sides of midnight', () => {
    const p = place(weekly({ 5: [['18:00', '02:00']] })); // Friday evening until 02:00 Saturday
    expect(getOpenStatus(p, at('2026-07-10T23:00:00+03:00')).state).toBe('open'); // Fri 23:00
    expect(getOpenStatus(p, at('2026-07-11T01:00:00+03:00')).state).toBe('closing_soon'); // Sat 01:00
    expect(getOpenStatus(p, at('2026-07-11T02:00:00+03:00')).state).toBe('closed'); // Sat 02:00
    expect(getOpenStatus(p, at('2026-07-10T17:00:00+03:00')).state).toBe('closed'); // Fri 17:00
  });

  it('accepts 24:00 as the end of the day', () => {
    const p = place(weekly({ 0: [['20:00', '24:00']] }));
    expect(getOpenStatus(p, at('2026-07-05T23:30:00+03:00')).state).toBe('closing_soon');
    expect(getOpenStatus(p, at('2026-07-06T00:30:00+03:00')).state).toBe('closed'); // Monday 00:30
  });

  it('works the same in winter time', () => {
    const p = place(weekly({ 0: [['07:00', '22:00']] }));
    expect(getOpenStatus(p, at('2026-01-04T08:00:00+02:00')).state).toBe('open'); // Sunday 08:00 IST
  });
});

describe('validateSchedule', () => {
  it('accepts null, always and a complete week', () => {
    expect(validateSchedule(null)).toBeNull();
    expect(validateSchedule({ type: 'always' })).toBeNull();
    expect(validateSchedule(weekly({ 0: [['07:00', '22:00']] }))).toBeNull();
  });

  it('rejects bad times, empty ranges and missing days', () => {
    expect(validateSchedule(weekly({ 0: [['7:00', '22:00']] }))).toBeTruthy();
    expect(validateSchedule(weekly({ 0: [['25:00', '22:00']] }))).toBeTruthy();
    expect(validateSchedule(weekly({ 0: [['08:00', '08:00']] }))).toBeTruthy();
    expect(validateSchedule(weekly({ 0: [['24:00', '08:00']] }))).toBeTruthy();
    expect(validateSchedule({ type: 'weekly', days: { 0: [] } })).toBeTruthy();
    expect(validateSchedule({ type: 'monthly' })).toBeTruthy();
  });
});

describe('parseHoursText (the real values in the database)', () => {
  it('maps open-space texts to always-open', () => {
    expect(parseHoursText('שטח פתוח')).toEqual({ type: 'always' });
    expect(parseHoursText('24/7')).toEqual({ type: 'always' });
  });

  it('parses a bare range as every day', () => {
    const s = parseHoursText('07:00-20:00');
    for (let d = 0; d < 7; d += 1) expect(s.days[d]).toEqual([['07:00', '20:00']]);
  });

  it('parses day ranges and leaves unmentioned days closed', () => {
    const s = parseHoursText("א'-ה' 10:00-18:00, ש' 10:00-14:00");
    expect(s.days[0]).toEqual([['10:00', '18:00']]);
    expect(s.days[4]).toEqual([['10:00', '18:00']]);
    expect(s.days[5]).toEqual([]); // Friday not mentioned
    expect(s.days[6]).toEqual([['10:00', '14:00']]);
  });

  it('parses the three-part weekly pattern', () => {
    const s = parseHoursText("א'-ה' 07:00-22:00, ו' 07:00-15:00, ש' 09:00-23:00");
    expect(s.days[2]).toEqual([['07:00', '22:00']]);
    expect(s.days[5]).toEqual([['07:00', '15:00']]);
    expect(s.days[6]).toEqual([['09:00', '23:00']]);
  });

  it('parses a full week range', () => {
    const s = parseHoursText("א'-ו' 07:00-19:00");
    expect(s.days[5]).toEqual([['07:00', '19:00']]);
    expect(s.days[6]).toEqual([]);
  });

  it('gives up (null) on anything it is not sure about', () => {
    expect(parseHoursText('ימים משתנים')).toBeNull();
    expect(parseHoursText('בדקו בעמוד')).toBeNull();
    expect(parseHoursText('לפי לוח הטיולים')).toBeNull();
    expect(parseHoursText('סופי שבוע')).toBeNull();
    expect(parseHoursText('')).toBeNull();
    expect(parseHoursText(null)).toBeNull();
    expect(parseHoursText("א' 25:00-26:00")).toBeNull();
    expect(parseHoursText("07:00-20:00, א' 08:00-12:00")).toBeNull(); // bare range mixed with days
  });
});

describe('summarizeSchedule', () => {
  it('round-trips the text patterns used in the data', () => {
    for (const text of [
      "א'-ה' 07:00-22:00, ו' 07:00-15:00, ש' 09:00-23:00",
      "א'-ה' 10:00-18:00, ש' 10:00-14:00",
      "א'-ו' 07:00-19:00",
      '07:00-20:00',
    ]) {
      expect(summarizeSchedule(parseHoursText(text))).toBe(text);
    }
  });

  it('describes always-open and closed-all-week', () => {
    expect(summarizeSchedule({ type: 'always' })).toBe('פתוח תמיד');
    expect(summarizeSchedule(emptyWeek())).toBe('סגור');
    expect(summarizeSchedule(null)).toBe('');
  });

  it('joins split shifts', () => {
    expect(summarizeSchedule(weekly({ 0: [['08:00', '12:00'], ['16:00', '20:00']] }))).toBe("א' 08:00-12:00 ו-16:00-20:00");
  });
});

describe('weeklyRows', () => {
  it('lists all seven days with closed days marked', () => {
    const rows = weeklyRows(weekly({ 0: [['07:00', '22:00']] }));
    expect(rows).toHaveLength(7);
    expect(rows[0]).toMatchObject({ name: 'ראשון', text: '07:00-22:00' });
    expect(rows[6].text).toBe('סגור');
    expect(weeklyRows({ type: 'always' })).toEqual([]);
  });
});
