#!/usr/bin/env node
/**
 * Builds a batch of bars / pubs / night clubs from OpenStreetMap (ODbL), category "nightlife".
 *
 *   node scripts/import-osm-nightlife.mjs --existing existing.json --out nightlife-batch.json
 *
 * Reads only; rows come out as status "pending" for admin review. Same duplicate rules as the
 * main import. Spread over several cities so the list is not all Tel Aviv.
 */
import fs from 'node:fs';
import { classify, hebrewName, isGenericName, removeDuplicates, score } from '../src/lib/importPlaces.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const existing = args.existing ? JSON.parse(fs.readFileSync(args.existing, 'utf8')) : [];
const outFile = args.out || 'nightlife-batch.json';
const UA = 'ma-yesh-po-import/1.0 (contact: idansabah15@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// [label, lat, lng, radius km, how many]
const MAIN_AREAS = [
  ['תל אביב', 32.0733, 34.7818, 4, 7],
  ['ירושלים', 31.7800, 35.2200, 4, 4],
  ['חיפה', 32.8100, 34.9900, 4, 4],
  ['אילת', 29.5550, 34.9500, 3, 2],
  ['באר שבע', 31.2500, 34.7900, 4, 2],
  ['טבריה והכנרת', 32.7900, 35.5300, 5, 1],
  ['נוף הגליל ונצרת', 32.7000, 35.3200, 8, 2],
  ['הרצליה ונתניה', 32.2400, 34.8500, 9, 2],
];
// --set north: the north, where Hebrew-named bars are rare in OSM (English names are accepted too)
const NORTH_AREAS = [
  ['טבריה', 32.7900, 35.5300, 5, 2],
  ['נוף הגליל', 32.7000, 35.3200, 6, 2],
  ['נצרת', 32.7000, 35.3000, 5, 1],
  ['עכו ונהריה', 32.9300, 35.0800, 8, 2],
  ['כרמיאל וצפת', 32.9200, 35.3000, 12, 2],
  ['קריית שמונה והגליל העליון', 33.2000, 35.5700, 15, 1],
  ['עפולה והעמק', 32.6100, 35.2900, 10, 1],
  ['זכרון יעקב וקיסריה', 32.5500, 34.9200, 10, 1],
];
const AREAS = args.set === 'north' ? NORTH_AREAS : MAIN_AREAS;
const ENDPOINTS = ['https://overpass.openstreetmap.fr/api/interpreter', 'https://overpass-api.de/api/interpreter'];

async function overpass(query) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}` });
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

async function reverse(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=he`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return {};
    const { address = {} } = await res.json();
    const city = address.city || address.town || address.village || address.municipality;
    const street = address.road && address.house_number ? `${address.road} ${address.house_number}` : address.road;
    return { city, street, countryCode: address.country_code };
  } catch {
    return {};
  }
}

const rows = [];
for (const [label, lat, lng, km, quota] of AREAS) {
  await sleep(2500);
  const els = await overpass(`[out:json][timeout:60];nwr["amenity"~"^(bar|pub|nightclub)$"]["name"](around:${km * 1000},${lat},${lng});out center tags;`);
  const cands = els
    .map((el) => {
      const tags = el.tags || {};
      const kind = classify(tags);
      // Hebrew name when there is one; otherwise the plain name (Latin script is fine for bars)
      const name = hebrewName(tags) || (tags.name && /[A-Za-z֐-׿]/.test(tags.name) ? tags.name.trim() : null);
      const clat = el.lat ?? el.center?.lat;
      const clng = el.lon ?? el.center?.lon;
      if (!kind || !name || isGenericName(name) || clat == null) return null;
      // an opening_hours tag, a phone or a website suggests the venue is real and maintained
      const bonus = (tags.opening_hours ? 2 : 0) + (tags.phone || tags['contact:phone'] ? 1 : 0) + (tags['addr:street'] ? 1 : 0);
      return { name, lat: clat, lng: clng, kind, score: score(tags) + bonus, source_ref: `${el.type}/${el.id}`, region: label };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  const { kept } = removeDuplicates(cands, [...existing, ...rows]);
  let taken = 0;
  for (const c of kept) {
    if (taken >= quota) break;
    await sleep(1100);
    const { city, street, countryCode } = await reverse(c.lat, c.lng);
    if (countryCode && countryCode !== 'il') continue;
    const place = city && !/^מחוז /.test(city) ? city : label;
    rows.push({
      name: c.name,
      category: 'nightlife',
      city: place,
      address: street ? `${street}, ${place}` : place,
      lat: Number(c.lat.toFixed(6)),
      lng: Number(c.lng.toFixed(6)),
      short_description: `${c.kind.label} · ${place}`,
      tags: [c.kind.label],
      status: 'pending',
      price_level: null,
      opening_hours: null,
      source: 'osm',
      source_ref: c.source_ref,
      source_license: 'ODbL',
      _region: label,
    });
    taken += 1;
  }
  console.error(`${label}: ${cands.length} candidates, ${taken} picked`);
}
fs.writeFileSync(outFile, JSON.stringify({ rows }, null, 2));
console.log(rows.map((r) => `${r._region} | ${r.name} | ${r.address} | ${r.source_ref}`).join('\n'));
console.log('TOTAL', rows.length);
