#!/usr/bin/env node
/**
 * Builds a batch of places from OpenStreetMap (ODbL) for the app.
 *
 *   node scripts/import-osm-places.mjs --existing existing.json --out batch.json [--near 50] [--country 50]
 *
 * --existing  JSON array of {name, lat, lng} for places already in the database (used to avoid duplicates)
 * --near      how many places within 50 km of Nof HaGalil
 * --country   how many places elsewhere in the country, spread over several regions
 *
 * The script only reads from OpenStreetMap/Nominatim and writes a JSON file; it never touches the
 * database. Rows come out as status "pending" so an admin reviews them before they go live.
 * Be polite to the public servers: few requests, 1 request per second to Nominatim, real User-Agent.
 */
import fs from 'node:fs';
import {
  classify,
  hebrewName,
  isGenericName,
  pickBalanced,
  removeDuplicates,
  score,
  withinKm,
} from '../src/lib/importPlaces.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const NEAR = Number(args.near ?? 50);
const COUNTRY = Number(args.country ?? 50);
const existing = args.existing ? JSON.parse(fs.readFileSync(args.existing, 'utf8')) : [];
const outFile = args.out || 'osm-batch.json';

const UA = 'ma-yesh-po-import/1.0 (contact: idansabah15@gmail.com)';
const NOF_HAGALIL = { lat: 32.7, lng: 35.32 };
const NEAR_RADIUS_KM = 50;

// Rough regions from Kiryat Shmona down to Eilat: [south, west, north, east]
const REGIONS = [
  { key: 'north', label: 'הגליל העליון והגולן', bbox: [32.95, 35.15, 33.32, 35.9] },
  { key: 'haifa', label: 'חיפה, הכרמל והחוף הצפוני', bbox: [32.55, 34.85, 32.95, 35.12] },
  { key: 'center', label: 'השרון, גוש דן והמרכז', bbox: [31.85, 34.7, 32.5, 35.0] },
  { key: 'jerusalem', label: 'ירושלים והסביבה', bbox: [31.7, 35.08, 31.85, 35.28] },
  { key: 'deadsea', label: 'ים המלח ומדבר יהודה', bbox: [31.0, 35.3, 31.6, 35.5] },
  { key: 'negev', label: 'הנגב', bbox: [30.55, 34.6, 31.3, 35.05] },
  { key: 'eilat', label: 'אילת והערבה', bbox: [29.45, 34.85, 29.75, 35.05] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Several small queries are much kinder to the public Overpass servers than one big union.
const TAG_GROUPS = [
  (area) => `node["natural"="spring"]["name"]${area};node["waterway"="waterfall"]["name"]${area};`,
  (area) => `nwr["tourism"="viewpoint"]["name"]${area};`,
  (area) => `nwr["tourism"="museum"]["name"]${area};nwr["tourism"="attraction"]["name"]${area};`,
  (area) => `nwr["historic"~"^(archaeological_site|ruins|castle|fort|monument)$"]["name"]${area};`,
  (area) => `nwr["leisure"="nature_reserve"]["name"]${area};nwr["boundary"="national_park"]["name"]${area};`,
  (area) => `nwr["natural"="beach"]["name"]${area};nwr["amenity"="marketplace"]["name"]${area};`,
];

const queryFor = (group, area) => `[out:json][timeout:60];(${group(area)});out center tags;`;

const ENDPOINTS = ['https://overpass.openstreetmap.fr/api/interpreter', 'https://overpass-api.de/api/interpreter'];

async function overpass(query) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.remark && /timed out|runtime error|out of memory/i.test(json.remark)) {
          console.error(`Overpass ${url} remark: ${json.remark}, retrying`);
        } else {
          return json.elements || [];
        }
      } else {
        console.error(`Overpass ${url} -> ${res.status}, retrying`);
      }
    } catch (e) {
      console.error(`Overpass ${url} failed: ${e.message}`);
    }
    await sleep(4000 * (attempt + 1));
  }
  throw new Error('Overpass unavailable');
}

async function overpassArea(area) {
  const seen = new Set();
  const elements = [];
  for (const group of TAG_GROUPS) {
    for (const el of await overpass(queryFor(group, area))) {
      const key = `${el.type}/${el.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        elements.push(el);
      }
    }
    await sleep(2500);
  }
  return elements;
}

/** OSM element -> candidate, or null when it is not usable (no Hebrew name, unknown kind...). */
function toCandidate(el) {
  const tags = el.tags || {};
  const kind = classify(tags);
  const name = hebrewName(tags);
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!kind || !name || isGenericName(name) || lat == null || lng == null) return null;
  return {
    name,
    lat: Number(lat),
    lng: Number(lng),
    category: kind.category,
    kind: kind.kind,
    label: kind.label,
    score: score(tags),
    source_ref: `${el.type}/${el.id}`,
    osm_tags: { wikidata: tags.wikidata, website: tags.website || tags['contact:website'] },
  };
}

const toCandidates = (elements) => elements.map(toCandidate).filter(Boolean);

async function reverse(c) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${c.lat}&lon=${c.lng}&zoom=16&accept-language=he`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return {};
    const { address = {} } = await res.json();
    const countryCode = address.country_code;
    const city = address.city || address.town || address.village || address.municipality || address.suburb || address.county || address.state;
    const street = address.road && address.house_number ? `${address.road} ${address.house_number}` : address.road;
    return { city, street, countryCode };
  } catch {
    return {};
  }
}

async function main() {
  console.error(`Existing places to avoid: ${existing.length}`);

  // 1) around Nof HaGalil
  const around = `(around:${NEAR_RADIUS_KM * 1000},${NOF_HAGALIL.lat},${NOF_HAGALIL.lng})`;
  const nearAll = toCandidates(await overpassArea(around)).filter((c) => withinKm(c, NOF_HAGALIL, NEAR_RADIUS_KM));
  const nearDedup = removeDuplicates(pickBalanced(nearAll, nearAll.length, Math.ceil(NEAR * 0.4)), existing);
  const near = pickBalanced(nearDedup.kept, NEAR, Math.ceil(NEAR * 0.4)).map((c) => ({ ...c, set: 'near', region: 'סביב נוף הגליל' }));
  console.error(`Near: ${nearAll.length} usable, ${nearDedup.dropped.length} duplicates dropped, ${near.length} picked`);

  // 2) the rest of the country, region by region (Kiryat Shmona -> Eilat)
  const perRegion = Math.floor(COUNTRY / REGIONS.length);
  let pool = [...existing, ...near];
  const country = [];
  const leftovers = [];
  const droppedCountry = [];
  for (const region of REGIONS) {
    await sleep(3000);
    const [s, w, n, e] = region.bbox;
    const all = toCandidates(await overpassArea(`(${s},${w},${n},${e})`)).filter((c) => !withinKm(c, NOF_HAGALIL, NEAR_RADIUS_KM));
    const { kept, dropped } = removeDuplicates(all, pool);
    droppedCountry.push(...dropped);
    const picked = pickBalanced(kept, perRegion, 3).map((c) => ({ ...c, set: 'country', region: region.label }));
    leftovers.push(...kept.filter((c) => !picked.includes(c)).map((c) => ({ ...c, set: 'country', region: region.label })));
    country.push(...picked);
    pool = [...pool, ...picked];
    console.error(`${region.key}: ${all.length} usable, ${picked.length} picked`);
  }
  // top up to the requested total from the best leftovers (varied, no duplicates)
  const missing = COUNTRY - country.length;
  if (missing > 0) {
    const extra = removeDuplicates(pickBalanced(leftovers, leftovers.length, 4), pool).kept.slice(0, missing);
    country.push(...extra);
  }

  // 3) addresses from Nominatim (1 request per second). Anything OSM places outside Israel
  //    (Jordan, the West Bank...) is rejected and replaced by the next best candidate.
  const nearLeftovers = removeDuplicates(pickBalanced(nearDedup.kept, nearDedup.kept.length, 12), []).kept
    .filter((c) => !near.includes(c))
    .map((c) => ({ ...c, set: 'near', region: 'סביב נוף הגליל' }));
  const countryLeftovers = leftovers.filter((c) => !country.includes(c));
  const rows = [];
  const rejected = [];

  async function finalize(picks, spare, target) {
    const queue = [...picks];
    let accepted = 0;
    while (accepted < target && queue.length > 0) {
      const c = queue.shift();
      await sleep(1100);
      const { city, street, countryCode } = await reverse(c);
      if (countryCode && countryCode !== 'il') {
        rejected.push({ name: c.name, country: countryCode });
        // next best spare that is not a duplicate of anything chosen so far
        const taken = [...existing, ...rows.map((r) => ({ name: r.name, lat: r.lat, lng: r.lng })), ...queue];
        while (spare.length > 0) {
          const next = spare.shift();
          if (removeDuplicates([next], taken).kept.length === 1) {
            queue.push(next);
            break;
          }
        }
        continue;
      }
      // a district name makes a poor "city": fall back to the region
      const place = city && !/^מחוז /.test(city) ? city : c.region;
      rows.push({
        name: c.name,
        category: c.category,
        city: place,
        address: street ? `${street}, ${place}` : place,
        lat: Number(c.lat.toFixed(6)),
        lng: Number(c.lng.toFixed(6)),
        short_description: `${c.label} · ${place}`,
        tags: [c.label],
        status: 'pending',
        price_level: null,
        opening_hours: null,
        source: 'osm',
        source_ref: c.source_ref,
        source_license: 'ODbL',
        _set: c.set,
        _region: c.region,
      });
      accepted += 1;
      process.stderr.write('.');
    }
  }

  await finalize(near, nearLeftovers, NEAR);
  await finalize(country, countryLeftovers, COUNTRY);
  process.stderr.write('\n');
  if (rejected.length) console.error(`Rejected (outside Israel): ${rejected.map((r) => `${r.name} [${r.country}]`).join(', ')}`);

  const dropped = [...nearDedup.dropped, ...droppedCountry].map((d) => ({ candidate: d.candidate.name, clashesWith: d.clash.name }));
  fs.writeFileSync(outFile, JSON.stringify({ rows, dropped }, null, 2));

  const byCategory = rows.reduce((acc, r) => ({ ...acc, [r.category]: (acc[r.category] || 0) + 1 }), {});
  console.log(JSON.stringify({ total: rows.length, near: rows.filter((r) => r._set === 'near').length, country: rows.filter((r) => r._set === 'country').length, byCategory, duplicatesDropped: dropped.length, rejectedOutsideIsrael: rejected.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
