/**
 * Structured opening hours.
 *
 * place.opening_schedule is one of
 *   null                                   -> unknown (nothing is shown / filtered on)
 *   { type: 'always' }                     -> open space / 24h
 *   { type: 'weekly', days: { 0: [["07:00","22:00"]], ..., 6: [] }, note?: string }
 *
 * Day index follows Israel's week: 0 = Sunday ... 6 = Saturday. An empty array means closed.
 * A range whose close time is <= its open time crosses midnight ("18:00" -> "02:00").
 * "24:00" is accepted as an end time. All "now" maths uses Asia/Jerusalem.
 */

export const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const DAY_ABBR = DAY_LETTERS.map((l) => `${l}'`);
const CLOSING_SOON_MINUTES = 60;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;

export const isValidTime = (value) => typeof value === 'string' && TIME_RE.test(value);

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const emptyWeek = () => ({
  type: 'weekly',
  days: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
});

/** Returns an error message, or null when the schedule is usable. */
export function validateSchedule(schedule) {
  if (schedule == null) return null;
  if (schedule.type === 'always') return null;
  if (schedule.type !== 'weekly' || typeof schedule.days !== 'object' || schedule.days === null) {
    return 'סוג שעות לא תקין';
  }
  for (let day = 0; day < 7; day += 1) {
    const ranges = schedule.days[day];
    if (!Array.isArray(ranges)) return 'חסר יום בשעות הפתיחה';
    for (const range of ranges) {
      if (!Array.isArray(range) || range.length !== 2 || !isValidTime(range[0]) || !isValidTime(range[1])) {
        return `שעות לא תקינות ביום ${DAY_NAMES[day]}`;
      }
      if (range[0] === range[1]) return `טווח ריק ביום ${DAY_NAMES[day]}`;
      if (range[0] === '24:00') return `שעת פתיחה לא יכולה להיות 24:00 (${DAY_NAMES[day]})`;
    }
  }
  return null;
}

/** Day index (0=Sunday) and minutes since midnight in Israel for a given instant. */
export function israelNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

// Normalised ranges for one day: [{ start, end }] where end may exceed 1440 (crosses midnight)
const dayRanges = (schedule, day) =>
  (schedule.days[day] || []).map(([open, close]) => {
    const start = toMinutes(open);
    let end = toMinutes(close);
    if (end <= start) end += 1440;
    return { start, end };
  });

const nextOpeningLabel = (schedule, day, minutes) => {
  for (let offset = 0; offset <= 7; offset += 1) {
    const d = (day + offset) % 7;
    const starts = dayRanges(schedule, d)
      .map((r) => r.start)
      .filter((start) => offset > 0 || start > minutes)
      .sort((a, b) => a - b);
    if (starts.length === 0) continue;
    const time = toHHMM(starts[0]);
    if (offset === 0) return `נפתח היום ב-${time}`;
    if (offset === 1) return `נפתח מחר ב-${time}`;
    return `נפתח ביום ${DAY_NAMES[d]} ב-${time}`;
  }
  return null;
};

/**
 * @returns {{ state: 'unknown'|'always'|'open'|'closing_soon'|'closed', short: string|null, label: string|null }}
 *  `short` is the badge text for cards, `label` the longer sentence for the details view.
 */
export function getOpenStatus(place, now = new Date()) {
  const schedule = place?.opening_schedule;
  if (!schedule || validateSchedule(schedule)) return { state: 'unknown', short: null, label: null };
  if (schedule.type === 'always') return { state: 'always', short: 'פתוח תמיד', label: 'פתוח תמיד' };

  const { day, minutes } = israelNow(now);

  // Open if inside one of today's ranges, or still inside a range that started yesterday
  let closeAt = null;
  for (const r of dayRanges(schedule, day)) {
    if (minutes >= r.start && minutes < r.end) closeAt = Math.max(closeAt ?? 0, r.end);
  }
  for (const r of dayRanges(schedule, (day + 6) % 7)) {
    if (r.end > 1440 && minutes < r.end - 1440) closeAt = Math.max(closeAt ?? 0, r.end - 1440);
  }

  if (closeAt !== null) {
    const left = closeAt - minutes;
    if (left <= CLOSING_SOON_MINUTES) {
      return { state: 'closing_soon', short: `נסגר בעוד ${left} דק׳`, label: `פתוח עד ${toHHMM(closeAt)}` };
    }
    return { state: 'open', short: 'פתוח עכשיו', label: `פתוח עד ${toHHMM(closeAt)}` };
  }

  const next = nextOpeningLabel(schedule, day, minutes);
  return { state: 'closed', short: 'סגור', label: next ? `סגור · ${next}` : 'סגור' };
}

/** true / false, or null when the hours are unknown (so filters can ignore those places). */
export function isOpenNow(place, now = new Date()) {
  const { state } = getOpenStatus(place, now);
  if (state === 'unknown') return null;
  return state !== 'closed';
}

const rangesText = (ranges) => ranges.map(([open, close]) => `${open}-${close}`).join(' ו-');

/** One row per weekday for the details view. */
export function weeklyRows(schedule) {
  if (!schedule || schedule.type !== 'weekly') return [];
  return DAY_NAMES.map((name, day) => ({
    day,
    name,
    text: (schedule.days[day] || []).length ? rangesText(schedule.days[day]) : 'סגור',
  }));
}

/** Human text kept in `opening_hours` so older screens and exports still read well. */
export function summarizeSchedule(schedule) {
  if (!schedule) return '';
  if (schedule.type === 'always') return 'פתוח תמיד';
  const groups = [];
  for (let day = 0; day < 7; day += 1) {
    const ranges = schedule.days[day] || [];
    if (ranges.length === 0) continue;
    const text = rangesText(ranges);
    const last = groups[groups.length - 1];
    if (last && last.text === text && last.to === day - 1) last.to = day;
    else groups.push({ from: day, to: day, text });
  }
  if (groups.length === 0) return 'סגור';
  if (groups.length === 1 && groups[0].from === 0 && groups[0].to === 6) return groups[0].text;
  return groups
    .map((g) => `${g.from === g.to ? DAY_ABBR[g.from] : `${DAY_ABBR[g.from]}-${DAY_ABBR[g.to]}`} ${g.text}`)
    .join(', ');
}

const normaliseTime = (t) => {
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${m}`;
};

const OPEN_SPACE_TEXTS = new Set(['שטח פתוח', 'פתוח 24 שעות', 'פתוח 24/7', '24/7', '24 שעות', 'פתוח תמיד']);

/**
 * Best-effort conversion of the legacy free-text hours into a schedule.
 * Handles "א'-ה' 07:00-22:00, ו' 07:00-15:00", "07:00-20:00", "שטח פתוח".
 * Returns null whenever it is not sure; an admin then fills the schedule in by hand.
 */
export function parseHoursText(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim().replace(/[׳’`]/g, "'").replace(/[–—]/g, '-');
  if (OPEN_SPACE_TEXTS.has(clean)) return { type: 'always' };

  const timeRange = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
  const segments = clean.split(/\s*,\s*/).filter(Boolean);
  if (segments.length === 0) return null;

  const schedule = emptyWeek();
  let sawDays = false;
  let sawBare = false;

  for (const segment of segments) {
    const match = segment.match(timeRange);
    if (!match) return null;
    const open = normaliseTime(match[1]);
    const close = normaliseTime(match[2]);
    if (!isValidTime(open) || !isValidTime(close) || open === close) return null;

    const daysPart = segment.slice(0, match.index).trim();
    if (!daysPart) {
      sawBare = true;
      for (let d = 0; d < 7; d += 1) schedule.days[d].push([open, close]);
      continue;
    }
    sawDays = true;
    const dayMatch = daysPart.match(/^([אבגדהוש])'?(?:\s*-\s*([אבגדהוש])'?)?$/);
    if (!dayMatch) return null;
    const from = DAY_LETTERS.indexOf(dayMatch[1]);
    const to = dayMatch[2] ? DAY_LETTERS.indexOf(dayMatch[2]) : from;
    for (let d = from; ; d = (d + 1) % 7) {
      schedule.days[d].push([open, close]);
      if (d === to) break;
    }
  }

  // A bare range only makes sense on its own ("07:00-20:00")
  if (sawBare && (sawDays || segments.length > 1)) return null;
  return validateSchedule(schedule) ? null : schedule;
}

/** Coffee carts (and similar stalls) are only useful with real hours, so they must have a schedule. */
export const requiresHours = (place) =>
  /עגל(ת|ה)\s*קפה|קפה\s*נייד/.test(String(place?.name ?? ''));

/** True when the schedule says something: always open, or at least one opening range. */
export const hasUsableSchedule = (schedule) =>
  !!schedule && (schedule.type === 'always' || Object.values(schedule.days || {}).some((r) => r?.length > 0));
