#!/usr/bin/env node
/**
 * Inserts the rows prepared by build-nature-sql.mjs (its preview.json) into Supabase.
 *
 *   node scripts/apply-nature-batch.mjs --preview nature-sql/preview.json            (dry run: duplicate check only)
 *   node scripts/apply-nature-batch.mjs --preview nature-sql/preview.json --apply    (inserts)
 *
 * Needs SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) and VITE_SUPABASE_URL in .env.local / .env.
 * With the service key it reads every existing place, pending ones too, and drops rows that duplicate
 * them by name + distance; the UNIQUE (source, source_ref) constraint stops repeats of the same OSM element,
 * so re-running is safe.
 */
import fs from 'node:fs';
import { removeDuplicates } from '../src/lib/importPlaces.js';
import { validateSchedule } from '../src/lib/openingHours.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const APPLY = process.argv.includes('--apply');
const { rows } = JSON.parse(fs.readFileSync(args.preview, 'utf8'));

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

const env = readEnv();
const URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) throw new Error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function allPlaces() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${URL}/rest/v1/places?select=name,lat,lng,status,source,source_ref&order=id`, {
      headers: { ...headers, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`read ${res.status}: ${await res.text()}`);
    const page = await res.json();
    out.push(...page.map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) })));
    if (page.length < 1000) break;
  }
  return out;
}

const existing = await allPlaces();
const refs = new Set(existing.filter((p) => p.source === 'osm').map((p) => p.source_ref));
const fresh = rows.filter((r) => !refs.has(r.source_ref));
const { kept, dropped } = removeDuplicates(fresh, existing);
console.error(`Existing places (all statuses): ${existing.length}; already imported refs: ${rows.length - fresh.length}; name/spot duplicates: ${dropped.length}`);
dropped.forEach((d) => console.error(`  dup: ${d.candidate.name} ~ ${d.clash.name} [${d.clash.status}]`));

// places_links_check: http(s), no whitespace / quotes / angle brackets, at most 300 chars
const cleanUrl = (url) => {
  const v = String(url || '').trim().replace(/["'<> ]/g, (c) => encodeURIComponent(c));
  return /^https?:\/\/[^\s<>"']+$/.test(v) && v.length <= 300 ? v : null;
};

// places_opening_schedule_valid: same rules as the app's validateSchedule (e.g. no empty 06:00-06:00 range)
const validHours = (r) => r.opening_schedule && !validateSchedule(r.opening_schedule);

const toInsert = kept.map((r) => ({
  name: r.name,
  description: r.description,
  short_description: r.short_description,
  category: r.category,
  city: r.city,
  address: r.address,
  lat: r.lat,
  lng: r.lng,
  image_url: r.image_url,
  images: r.images,
  image_credits: r.image_credits,
  tags: r.tags,
  status: r.status,
  price_level: null,
  opening_hours: validHours(r) ? r.opening_hours : null,
  opening_schedule: validHours(r) ? r.opening_schedule : null,
  website: cleanUrl(r.website),
  source: 'osm',
  source_ref: r.source_ref,
  source_license: 'ODbL',
}));

const summary = {
  toInsert: toInsert.length,
  approved: toInsert.filter((r) => r.status === 'approved').length,
  pending: toInsert.filter((r) => r.status === 'pending').length,
  dropped: dropped.length,
};
if (!APPLY) {
  console.log(JSON.stringify({ dryRun: true, ...summary }, null, 2));
  process.exit(0);
}

let inserted = 0;
for (let i = 0; i < toInsert.length; i += 200) {
  const chunk = toInsert.slice(i, i + 200);
  const res = await fetch(`${URL}/rest/v1/places?on_conflict=source,source_ref`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(chunk),
  });
  if (!res.ok) throw new Error(`insert ${res.status} at row ${i}: ${await res.text()}`);
  inserted += chunk.length;
  console.error(`inserted ${inserted}/${toInsert.length}`);
}
console.log(JSON.stringify({ applied: true, ...summary }, null, 2));
