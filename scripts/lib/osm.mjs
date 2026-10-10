// Network helpers shared by the importer scripts: Overpass queries and opening hours lookup.
import { haversineKm } from '../../src/lib/geo.js';
import { summarizeSchedule } from '../../src/lib/openingHours.js';
import { normalizeName } from '../../src/lib/importPlaces.js';
import { parseOsmHours } from '../../src/lib/osmHours.js';

export const UA = 'ma-yesh-po-import/1.0 (contact: idansabah15@gmail.com)';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ENDPOINTS = ['https://overpass.openstreetmap.fr/api/interpreter', 'https://overpass-api.de/api/interpreter'];

export async function overpass(query) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(ENDPOINTS[attempt % 2], {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (res.ok) {
        const json = await res.json();
        if (!(json.remark && /timed out|runtime error|out of memory/i.test(json.remark))) return json.elements || [];
      }
    } catch (e) {
      console.error(`Overpass failed: ${e.message}`);
    }
    await sleep(4000 * (attempt + 1));
  }
  throw new Error('Overpass unavailable');
}

const sameName = (a, b) => {
  const x = normalizeName(a);
  const y = normalizeName(b);
  return Boolean(x && y && (x.includes(y) || y.includes(x)));
};

/**
 * Opening hours for places that have none, taken from an OpenStreetMap element within 80 m
 * whose name matches. Returns Map(index -> { opening_schedule, opening_hours }).
 */
export async function findOsmHours(places) {
  const found = new Map();
  const nearby = [];
  for (let i = 0; i < places.length; i += 40) {
    const chunk = places.slice(i, i + 40);
    const q = `[out:json][timeout:90];(${chunk.map((p) => `nwr(around:80,${p.lat},${p.lng})["opening_hours"];`).join('')});out center tags;`;
    nearby.push(...(await overpass(q)));
    await sleep(2500);
  }
  places.forEach((p, index) => {
    for (const el of nearby) {
      const t = el.tags || {};
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat == null || haversineKm(p.lat, p.lng, lat, lng) > 0.08) continue;
      if (![t.name, t['name:he'], t['name:en']].some((n) => sameName(p.name, n))) continue;
      const schedule = parseOsmHours(t.opening_hours);
      if (schedule) {
        found.set(index, { opening_schedule: schedule, opening_hours: summarizeSchedule(schedule) });
        return;
      }
    }
  });
  return found;
}
