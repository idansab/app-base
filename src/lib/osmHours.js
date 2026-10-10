// Converts the common forms of OpenStreetMap's opening_hours tag into the app's schedule.
// Returns null whenever the value is anything it does not fully understand (holidays, sunrise,
// "by appointment", week numbers...): a wrong schedule is worse than none.
import { emptyWeek } from './openingHours.js';

const DAY_INDEX = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
const DAY_ORDER = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const TIME = /^([01]?\d|2[0-4]):([0-5]\d)$/;

const normTime = (t) => {
  const m = t.match(TIME);
  if (!m) return null;
  const h = Number(m[1]);
  if (h === 24) return m[2] === '00' ? '00:00' : null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
};

function expandDays(spec) {
  const days = new Set();
  for (const part of spec.split(',')) {
    const range = part.match(/^(Su|Mo|Tu|We|Th|Fr|Sa)(?:-(Su|Mo|Tu|We|Th|Fr|Sa))?$/);
    if (!range) return null;
    const from = DAY_ORDER.indexOf(range[1]);
    const to = range[2] ? DAY_ORDER.indexOf(range[2]) : from;
    for (let i = from; ; i = (i + 1) % 7) {
      days.add(i);
      if (i === to) break;
    }
  }
  return [...days];
}

export function parseOsmHours(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text === '24/7') return { type: 'always' };
  const schedule = emptyWeek();
  for (const rule of text.split(';').map((r) => r.trim()).filter(Boolean)) {
    const m = rule.match(/^((?:(?:Su|Mo|Tu|We|Th|Fr|Sa)(?:-(?:Su|Mo|Tu|We|Th|Fr|Sa))?,?)+)\s+(off|closed|[\d:,\- ]+)$/);
    if (!m) return null;
    const days = expandDays(m[1]);
    if (!days) return null;
    if (m[2] === 'off' || m[2] === 'closed') {
      days.forEach((d) => { schedule.days[d] = []; });
      continue;
    }
    const ranges = [];
    for (const r of m[2].split(',').map((x) => x.trim())) {
      const t = r.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
      if (!t) return null;
      const open = normTime(t[1]);
      const close = normTime(t[2]);
      if (!open || !close) return null;
      ranges.push([open, close]);
    }
    days.forEach((d) => { schedule.days[d] = ranges; });
  }
  return Object.values(schedule.days).some((r) => r.length > 0) ? schedule : null;
}
