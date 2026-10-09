import { supabase } from '@/api/base44Client';

const SESSION_KEY = 'place_session_id';
const WINDOW_MS = 30 * 60 * 1000; // mirrors the 30-minute de-duplication window in the database

/** true when this (place, event) should be reported now; remembers the attempt in `store`. */
export function shouldSend(store, key, now, windowMs = WINDOW_MS) {
  const last = Number(store.getItem(key));
  if (Number.isFinite(last) && last > 0 && now - last < windowMs) return false;
  store.setItem(key, String(now));
  return true;
}

/** A random id for this browser tab session. Not linked to the user, never stored server-side with an IP. */
export function getSessionId(store, makeId = () => crypto.randomUUID()) {
  let id = store.getItem(SESSION_KEY);
  if (!id) {
    id = makeId();
    store.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Fire-and-forget usage statistics for a place ('view' | 'call' | 'navigate' | 'share' | 'favorite').
 * Anonymous, throttled per session and silent on any failure: it must never affect the page.
 * Honors the browser's Do Not Track setting.
 */
export function trackPlaceEvent(placeId, event) {
  try {
    if (!placeId || typeof window === 'undefined') return;
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    const store = window.sessionStorage;
    if (!shouldSend(store, `pt:${placeId}:${event}`, Date.now())) return;
    supabase
      .rpc('track_place_event', { p_place_id: String(placeId), p_event: event, p_session: getSessionId(store) })
      .then(
        () => {},
        () => {}
      );
  } catch {
    // storage blocked, offline, etc.: statistics are best effort
  }
}
