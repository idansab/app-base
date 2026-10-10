#!/usr/bin/env node
/**
 * Fills in contact details, opening hours and a short factual description for imported places.
 *
 *   node scripts/enrich-places.mjs --places places.json --out enrich.sql
 *
 * places.json: [{ source: 'osm'|'overture', source_ref, name, lat, lng, city, address, label,
 *                 phones?, websites?, socials? }]   (phones/websites/socials come from Overture)
 *
 * Sources (all open): Overture (phone, website, social links), OpenStreetMap (phone, links, opening_hours,
 * matched to Overture places by name + distance), Wikidata (CC0 short Hebrew description).
 * Nothing is copied from business websites. The script only writes an SQL file; the UPDATE keeps any
 * value that is already in the database (COALESCE), so it is safe to run again.
 */
import fs from 'node:fs';
import { buildDescription, formatPhone, pickLinks } from '../src/lib/enrich.js';
import { normalizeName } from '../src/lib/importPlaces.js';
import { haversineKm } from '../src/lib/geo.js';
import { summarizeSchedule } from '../src/lib/openingHours.js';
import { parseOsmHours } from '../src/lib/osmHours.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const places = JSON.parse(fs.readFileSync(args.places, 'utf8'));
const outFile = args.out || 'enrich.sql';
const UA = 'ma-yesh-po-import/1.0 (contact: idansabah15@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ENDPOINTS = ['https://overpass.openstreetmap.fr/api/interpreter', 'https://overpass-api.de/api/interpreter'];

async function overpass(query) {
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

const tagsOf = (el) => el.tags || {};
const osmUrls = (t) => [t.website, t['contact:website'], t.url].filter(Boolean);
const osmSocials = (t) =>
  [t['contact:facebook'], t.facebook, t['contact:instagram'], t.instagram].filter((v) => v && /^https?:/.test(v));
const osmPhone = (t) => (t.phone || t['contact:phone'] || '').split(';')[0];

// ---- OSM-sourced places: tags by id ------------------------------------------------------------
const osmPlaces = places.filter((p) => p.source === 'osm');
const osmTags = {};
if (osmPlaces.length) {
  const ids = { node: [], way: [], relation: [] };
  osmPlaces.forEach((p) => {
    const [t, i] = p.source_ref.split('/');
    ids[t]?.push(i);
  });
  const part = (t) => (ids[t].length ? `${t}(id:${ids[t].join(',')});` : '');
  const els = await overpass(`[out:json][timeout:90];(${part('node')}${part('way')}${part('relation')});out tags;`);
  for (const el of els) osmTags[`${el.type}/${el.id}`] = tagsOf(el);
  console.error(`OSM tags: ${Object.keys(osmTags).length}/${osmPlaces.length}`);
}

// ---- Wikidata short descriptions (CC0) -------------------------------------------------------------
const qids = [...new Set(Object.values(osmTags).map((t) => t.wikidata).filter((q) => /^Q\d+$/.test(q || '')))];
const wikidata = {};
for (let i = 0; i < qids.length; i += 40) {
  const params = new URLSearchParams({ action: 'wbgetentities', format: 'json', ids: qids.slice(i, i + 40).join('|'), props: 'descriptions', languages: 'he' });
  const json = await (await fetch(`https://www.wikidata.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } })).json();
  for (const [q, e] of Object.entries(json.entities || {})) if (e.descriptions?.he?.value) wikidata[q] = e.descriptions.he.value;
  await sleep(500);
}
console.error(`Wikidata Hebrew descriptions: ${Object.keys(wikidata).length}/${qids.length}`);

// ---- Overture places: opening hours from a matching OSM element nearby --------------------------------
const ovPlaces = places.filter((p) => p.source === 'overture');
const nearby = [];
for (let i = 0; i < ovPlaces.length; i += 40) {
  const chunk = ovPlaces.slice(i, i + 40);
  const q = `[out:json][timeout:90];(${chunk.map((p) => `nwr(around:80,${p.lat},${p.lng})["opening_hours"];`).join('')});out center tags;`;
  nearby.push(...(await overpass(q)));
  await sleep(2500);
}
console.error(`OSM elements with hours near Overture places: ${nearby.length}`);

const sameName = (a, b) => {
  const x = normalizeName(a);
  const y = normalizeName(b);
  return Boolean(x && y && (x.includes(y) || y.includes(x)));
};

function osmHoursFor(p) {
  for (const el of nearby) {
    const t = tagsOf(el);
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || haversineKm(p.lat, p.lng, lat, lng) > 0.08) continue;
    if (![t.name, t['name:he'], t['name:en']].some((n) => sameName(p.name, n))) continue;
    const schedule = parseOsmHours(t.opening_hours);
    if (schedule) return schedule;
  }
  return null;
}

// ---- assemble -------------------------------------------------------------------------------------------
const rows = places.map((p) => {
  const t = p.source === 'osm' ? osmTags[p.source_ref] || {} : {};
  const schedule = p.source === 'osm' ? parseOsmHours(t.opening_hours) : osmHoursFor(p);
  return {
    source: p.source,
    ref: p.source_ref,
    phone: formatPhone(p.phones?.[0] ?? osmPhone(t)),
    ...pickLinks([...(p.websites || []), ...osmUrls(t)], [...(p.socials || []), ...osmSocials(t)]),
    opening_schedule: schedule,
    opening_hours: schedule ? summarizeSchedule(schedule) : null,
    description: buildDescription({ label: p.label, city: p.city, address: p.address, wikidata: wikidata[t.wikidata] }),
  };
});

const sql = `update places p set
  phone = coalesce(nullif(p.phone, ''), x.phone),
  website = coalesce(p.website, x.website),
  instagram = coalesce(p.instagram, x.instagram),
  facebook = coalesce(p.facebook, x.facebook),
  opening_schedule = coalesce(p.opening_schedule, x.opening_schedule),
  opening_hours = case when p.opening_schedule is null and x.opening_schedule is not null then x.opening_hours else p.opening_hours end,
  description = coalesce(nullif(p.description, ''), x.description)
from jsonb_to_recordset($j$${JSON.stringify(rows)}$j$::jsonb) as x(source text, ref text, phone text, website text, instagram text, facebook text, opening_schedule jsonb, opening_hours text, description text)
where p.source = x.source and p.source_ref = x.ref
returning p.name;`;
fs.writeFileSync(outFile, sql);

const count = (f) => rows.filter(f).length;
console.log(
  JSON.stringify(
    {
      places: rows.length,
      phone: count((r) => r.phone),
      website: count((r) => r.website),
      instagram: count((r) => r.instagram),
      facebook: count((r) => r.facebook),
      hours: count((r) => r.opening_schedule),
      description: count((r) => r.description),
    },
    null,
    2
  )
);
