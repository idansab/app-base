import { useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';

const DAY_MS = 24 * 60 * 60 * 1000;
const IL = 'Asia/Jerusalem';

/** Whole days left until the beta ends (0 once it has ended). null when no date is known. */
export function daysLeft(endsAt, now = new Date()) {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - now.getTime()) / DAY_MS));
}

/** "31.12.2026" in Israel time. */
export function formatBetaDate(endsAt) {
  if (!endsAt) return '';
  const d = new Date(endsAt);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('he-IL', { timeZone: IL, day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(d)
    .replace(/\//g, '.');
}

const israelParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
};

/** "YYYY-MM-DD" (Israel date) for an <input type="date">. */
export function toDateInputValue(endsAt) {
  const d = new Date(endsAt);
  return Number.isNaN(d.getTime()) ? '' : israelParts(d).date;
}

/**
 * The instant at which the given Israel calendar day ends (23:59:59 local), as an ISO string.
 * Handles daylight saving: December is UTC+2, July is UTC+3.
 */
export function endOfDayIsrael(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  for (const offset of ['+02:00', '+03:00']) {
    const candidate = new Date(`${dateStr}T23:59:59${offset}`);
    if (Number.isNaN(candidate.getTime())) return null;
    const local = israelParts(candidate);
    if (local.date === dateStr && local.hour === 23) return candidate.toISOString();
  }
  return null;
}

/** { active, ends_at, everyone_pro } from the public RPC; null while loading or when unavailable. */
export function useBetaInfo() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    let cancelled = false;
    supabase.rpc('public_beta_info').then(({ data, error }) => {
      if (!cancelled && !error) setInfo(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return info;
}
