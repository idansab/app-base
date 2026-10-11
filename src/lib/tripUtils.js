// Pure helpers for trips (routes): no React, no network.
import { haversineKm } from './geo.js';

export const MAX_TRIP_STOPS = 12;

/** The place ids of a trip. The database keeps them as JSON text; accept text or an array. */
export function parseOrder(value) {
  let list = value;
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((id) => typeof id === 'string' && id !== ''))].slice(0, MAX_TRIP_STOPS);
}

/** A new array with the item moved from one index to another. */
export function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const hasPosition = (place) => Number.isFinite(Number(place?.lat)) && Number.isFinite(Number(place?.lng));

/** The places of a trip, in the trip's order. Places that no longer exist are skipped. */
export function stopsOf(order, placesById) {
  return parseOrder(order)
    .map((id) => placesById.get(id))
    .filter(Boolean);
}

/** Straight-line distance along the stops, in km (a rough guide, not a driving distance). */
export function routeKm(stops) {
  let total = 0;
  for (let i = 1; i < stops.length; i += 1) {
    if (hasPosition(stops[i - 1]) && hasPosition(stops[i])) {
      total += haversineKm(Number(stops[i - 1].lat), Number(stops[i - 1].lng), Number(stops[i].lat), Number(stops[i].lng));
    }
  }
  return total;
}

/** About 45 minutes per stop plus driving at ~40 km/h on the straight-line distance, in half-hours, at least 1. */
export function estimateHours(stopCount, km) {
  const hours = stopCount * 0.75 + km / 40;
  return Math.max(1, Math.round(hours * 2) / 2);
}

/** Places closest to a point, nearest first: [{ place, km }]. */
export function nearbyPlaces(places, origin, { exclude = [], limit = 12 } = {}) {
  if (!origin || !hasPosition(origin)) return [];
  const skip = new Set(exclude);
  return places
    .filter((place) => !skip.has(place.id) && hasPosition(place))
    .map((place) => ({ place, km: haversineKm(Number(origin.lat), Number(origin.lng), Number(place.lat), Number(place.lng)) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '') // niqqud and cantillation
    .replace(/["'`׳״.,\-–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Places matching every word of the query in the name, city or tags. */
export function searchPlaces(places, query, { exclude = [], limit = 12 } = {}) {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const skip = new Set(exclude);
  const matches = [];
  for (const place of places) {
    if (skip.has(place.id)) continue;
    const haystack = normalize(`${place.name} ${place.city ?? ''} ${(place.tags || []).join(' ')}`);
    if (words.every((word) => haystack.includes(word))) matches.push(place);
    if (matches.length >= limit) break;
  }
  return matches;
}

export const tripUrl = (origin, id) => `${String(origin).replace(/\/$/, '')}/trips/${encodeURIComponent(id)}`;

/** The message people paste or send: name, a few stops, the link. */
export function shareText({ title, stopNames, km, url }) {
  const shown = stopNames.slice(0, 5).map((name, i) => `${i + 1}. ${name}`);
  if (stopNames.length > 5) shown.push(`ועוד ${stopNames.length - 5} תחנות`);
  const facts = [`${stopNames.length} תחנות`, km >= 1 ? `כ-${Math.round(km)} ק״מ` : null].filter(Boolean).join(' · ');
  return [`🧭 ${title}`, facts, '', ...shown, '', 'מסלול מהקהילה ב"מה יש פה":', url].join('\n');
}

export const whatsappUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
