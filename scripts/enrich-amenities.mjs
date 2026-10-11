#!/usr/bin/env node
/**
 * Fills the "amenities" of existing places (wheelchair accessible, organised parking) from OpenStreetMap.
 * Overture Maps has no such fields; OpenStreetMap has the `wheelchair` tag and mapped parking lots.
 *
 *   node scripts/enrich-amenities.mjs                         (dry run: shows what it would add)
 *   node scripts/enrich-amenities.mjs --apply                 (writes; needs the service key)
 *   node scripts/enrich-amenities.mjs --with-parking          (also add "parking" when a public lot is within 120 m)
 *
 * Rules
 *   - only ADDS facts. Never removes an amenity and never marks a place as "not accessible".
 *   - wheelchair is added only for wheelchair=yes on an OSM element with the same name within 80 m
 *     ("limited" and "no" are reported but not used).
 *   - parking is off by default: a lot nearby does not prove it belongs to the place. Review before using it.
 *
 * Options: --limit N (first N places), --category food|nature|..., --out file.json (default amenities-batch.json)
 * Environment (never committed): SUPABASE_URL (or VITE_SUPABASE_URL) and, for a dry run, SUPABASE_ANON_KEY
 * (the public key); for --apply SUPABASE_SERVICE_ROLE_KEY.
 */
import fs from 'node:fs';
import { amenitiesFromOsm, PARKING_RADIUS_M, WHEELCHAIR_RADIUS_M } from '../src/lib/osmAmenities.js';
import { overpass, sleep } from './lib/osm.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]]] : acc), [])
);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const READ_KEY = SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const outFile = args.out || 'amenities-batch.json';
const withParking = Boolean(args['with-parking']);

if (!SUPABASE_URL || !READ_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY (dry run) or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (args.apply && !SERVICE_KEY) {
  console.error('--apply needs SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const rest = (path, key, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });

async function loadPlaces() {
  const rows = [];
  const filter = args.category ? `&category=eq.${encodeURIComponent(args.category)}` : '';
  for (let from = 0; ; from += 1000) {
    const res = await rest(`places?select=id,name,lat,lng,amenities,category&status=eq.approved${filter}&order=id&offset=${from}&limit=1000`, READ_KEY);
    if (!res.ok) throw new Error(`Reading places failed: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows.filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))).map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) }));
}

/** OSM elements around every place, in small chunks so Overpass stays happy. */
async function fetchAround(places, filter, radiusM) {
  const found = [];
  const seen = new Set();
  for (let i = 0; i < places.length; i += 30) {
    const chunk = places.slice(i, i + 30);
    const query = `[out:json][timeout:90];(${chunk.map((p) => `nwr(around:${radiusM},${p.lat},${p.lng})${filter};`).join('')});out center tags;`;
    for (const el of await overpass(query)) {
      const key = `${el.type}/${el.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        found.push(el);
      }
    }
    console.error(`  ${Math.min(i + 30, places.length)}/${places.length}`);
    await sleep(2500);
  }
  return found;
}

let places = await loadPlaces();
if (args.limit) places = places.slice(0, Number(args.limit));
console.error(`Places: ${places.length}. Asking OpenStreetMap (this takes a few minutes)...`);

console.error('wheelchair tags');
const wheelchairElements = await fetchAround(places, '["wheelchair"]', WHEELCHAIR_RADIUS_M);
let parkingElements = [];
if (withParking) {
  console.error('parking lots');
  parkingElements = await fetchAround(places, '["amenity"="parking"]', PARKING_RADIUS_M);
}

const results = places.map((place) => ({ place, ...amenitiesFromOsm(place, { wheelchairElements, parkingElements }, { withParking }) }));
const toWrite = results.filter((r) => r.add.length > 0);
const count = (fn) => results.filter(fn).length;

console.log('\n--- summary ---');
console.log(`places checked:               ${places.length}`);
console.log(`wheelchair=yes (same venue):  ${count((r) => r.evidence.wheelchair === 'yes')}`);
console.log(`wheelchair=limited (not used): ${count((r) => r.evidence.wheelchair === 'limited')}`);
console.log(`wheelchair=no (not used):     ${count((r) => r.evidence.wheelchair === 'no')}`);
if (withParking) console.log(`public parking within ${PARKING_RADIUS_M} m:     ${count((r) => r.evidence.parking)}`);
console.log(`places that would change:     ${toWrite.length}\n`);
for (const r of toWrite.slice(0, 40)) {
  console.log(`${r.place.name} | +${r.add.join(', ')}${r.evidence.parking ? ` | parking ${r.evidence.parking.distanceM} m${r.evidence.parking.name ? ` (${r.evidence.parking.name})` : ''}` : ''}`);
}

fs.writeFileSync(outFile, JSON.stringify(toWrite.map((r) => ({ id: r.place.id, name: r.place.name, current: r.place.amenities || [], add: r.add, evidence: r.evidence })), null, 2));
console.log(`\nWritten to ${outFile}`);

if (args.apply) {
  let done = 0;
  for (const r of toWrite) {
    const merged = [...new Set([...(r.place.amenities || []), ...r.add])];
    const res = await rest(`places?id=eq.${encodeURIComponent(r.place.id)}`, SERVICE_KEY, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ amenities: merged }) });
    if (!res.ok) {
      console.error(`Update failed for ${r.place.name}: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    done += 1;
  }
  console.log(`Updated ${done} places.`);
} else {
  console.log('Dry run: nothing was written to the database. Add --apply to write.');
}
