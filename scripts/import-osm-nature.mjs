#!/usr/bin/env node
/**
 * Builds a batch of every named nature spot in Israel from OpenStreetMap (ODbL): springs, waterfalls,
 * viewpoints, beaches, nature reserves and national parks.
 *
 *   node scripts/import-osm-nature.mjs --out nature-batch.json [--cache nature-geo-cache.json]
 *
 * Unlike import-osm-places.mjs there is no quota per region: everything with a Hebrew, non-generic name
 * is kept, minus duplicates of places already on the site (read from Supabase with the public anon key)
 * and anything Nominatim places outside Israel. The script only reads; it never writes to the database.
 * Reverse geocoding runs at 1 request per second and is cached, so an interrupted run resumes.
 */
import fs from 'node:fs';
import { classify, hebrewName, isGenericName, removeDuplicates, score } from '../src/lib/importPlaces.js';
import { overpass, sleep, UA } from './lib/osm.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const outFile = args.out || 'nature-batch.json';
const cacheFile = args.cache || 'nature-geo-cache.json';

// Kiryat Shmona / the Golan down to Eilat. Points outside Israel are dropped after reverse geocoding.
const BBOX = '(29.45,34.25,33.35,35.92)';
const TAG_GROUPS = [
  `node["natural"="spring"]["name"]${BBOX};node["waterway"="waterfall"]["name"]${BBOX};`,
  `nwr["tourism"="viewpoint"]["name"]${BBOX};`,
  `nwr["leisure"="nature_reserve"]["name"]${BBOX};nwr["boundary"~"^(national_park|protected_area)$"]["name"]${BBOX};`,
  `nwr["natural"="beach"]["name"]${BBOX};`,
];

function readEnv() {
  const env = {};
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2];
    }
  }
  return env;
}

/** Every place already on the site (any status), so nothing is imported twice. */
async function existingPlaces() {
  const env = readEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing in .env');
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/places?select=name,lat,lng,source_ref&lat=not.is.null`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    const page = await res.json();
    rows.push(...page.map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) })));
    if (page.length < 1000) break;
  }
  return rows;
}

function toCandidate(el) {
  const tags = el.tags || {};
  const kind = classify(tags);
  const name = hebrewName(tags);
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!kind || kind.category !== 'nature' || !name || isGenericName(name) || lat == null || lng == null) return null;
  return {
    name,
    lat: Number(lat),
    lng: Number(lng),
    category: kind.category,
    kind: kind.kind,
    label: kind.label,
    score: score(tags),
    source_ref: `${el.type}/${el.id}`,
    wikidata: tags.wikidata || null,
  };
}

async function reverse(c) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${c.lat}&lon=${c.lng}&zoom=14&accept-language=he`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const { address = {} } = await res.json();
        const city = address.city || address.town || address.village || address.municipality || address.county || address.state;
        return { city: city || null, countryCode: address.country_code || null };
      }
    } catch {
      // retried below
    }
    await sleep(3000 * (attempt + 1));
  }
  return { city: null, countryCode: null };
}

async function main() {
  const existing = await existingPlaces();
  console.error(`Places already on the site: ${existing.length}`);
  const knownRefs = new Set(existing.map((p) => p.source_ref).filter(Boolean));

  const seen = new Set();
  const candidates = [];
  for (const group of TAG_GROUPS) {
    for (const el of await overpass(`[out:json][timeout:180];(${group});out center tags;`)) {
      const ref = `${el.type}/${el.id}`;
      if (seen.has(ref) || knownRefs.has(ref)) continue;
      seen.add(ref);
      const c = toCandidate(el);
      if (c) candidates.push(c);
    }
    await sleep(3000);
  }
  // best-documented first, so when two entries clash the one with Wikidata / Wikipedia survives
  candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'he'));
  const { kept, dropped } = removeDuplicates(candidates, existing);
  console.error(`OSM: ${candidates.length} usable, ${dropped.length} duplicates dropped, ${kept.length} to geocode`);

  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
  const rows = [];
  const outside = [];
  let done = 0;
  for (const c of kept) {
    if (!cache[c.source_ref]) {
      cache[c.source_ref] = await reverse(c);
      await sleep(1100);
      if (++done % 25 === 0) {
        fs.writeFileSync(cacheFile, JSON.stringify(cache));
        process.stderr.write(`${done} `);
      }
    }
    const { city, countryCode } = cache[c.source_ref];
    if (countryCode && countryCode !== 'il') {
      outside.push({ name: c.name, country: countryCode });
      continue;
    }
    const place = city && !/^מחוז /.test(city) ? city : null;
    rows.push({
      name: c.name,
      category: 'nature',
      city: place,
      address: place,
      lat: Number(c.lat.toFixed(6)),
      lng: Number(c.lng.toFixed(6)),
      short_description: place ? `${c.label} · ${place}` : c.label,
      tags: [c.label],
      status: 'pending',
      source: 'osm',
      source_ref: c.source_ref,
      source_license: 'ODbL',
      _kind: c.kind,
      _score: c.score,
      _wikidata: c.wikidata,
    });
  }
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  fs.writeFileSync(outFile, JSON.stringify({ rows, dropped: dropped.map((d) => ({ candidate: d.candidate.name, clashesWith: d.clash.name })), outside }, null, 2));

  const byKind = rows.reduce((acc, r) => ({ ...acc, [r._kind]: (acc[r._kind] || 0) + 1 }), {});
  console.log(JSON.stringify({ total: rows.length, byKind, duplicatesDropped: dropped.length, outsideIsrael: outside.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
