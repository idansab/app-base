#!/usr/bin/env node
/**
 * Brings new places from Overture Maps (open data, CDLA-Permissive-2.0) into the database.
 *
 *   node scripts/import-places.mjs --category nightlife --area north --count 30            (dry run)
 *   node scripts/import-places.mjs --category nightlife --area all --count 100 --apply     (inserts)
 *
 * Options
 *   --category    nightlife | food                                 (see CATEGORY_SOURCES)
 *   --area        north | haifa | center | jerusalem | south | deadsea | eilat | all
 *   --count       how many new places to add (default 30)
 *   --min-confidence   Overture confidence 0..1 (default 0.6)
 *   --per-city    at most this many from one city (default 5)
 *   --existing    JSON [{name,lat,lng,source,source_ref}] to dedupe against when there is no service key
 *   --out         where to write the batch JSON (default import-batch.json)
 *   --apply       insert into Supabase as status "pending" (needs the two env vars below)
 *
 * Environment (never committed): SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 * With the key the script reads every existing place (pending too) so duplicates are impossible;
 * the UNIQUE (source, source_ref) constraint is a second safety net. Re-running is safe.
 */
import fs from 'node:fs';
import { DuckDBInstance } from '@duckdb/node-api';
import { removeDuplicates } from '../src/lib/importPlaces.js';
import { AREAS, CATEGORY_SOURCES, spreadByCity, toPlaceRow } from '../src/lib/overtureImport.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]]] : acc), [])
);
const category = args.category;
const area = AREAS[args.area || 'all'];
const COUNT = Number(args.count ?? 30);
const MIN_CONF = Number(args['min-confidence'] ?? 0.6);
const PER_CITY = Number(args['per-city'] ?? 5);
const outFile = args.out || 'import-batch.json';

if (!CATEGORY_SOURCES[category] || !area) {
  console.error(`Usage: --category ${Object.keys(CATEGORY_SOURCES).join('|')} --area ${Object.keys(AREAS).join('|')} [--count N] [--apply]`);
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rest = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });

async function loadExisting() {
  if (SUPABASE_URL && SERVICE_KEY) {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const res = await rest(`places?select=name,lat,lng,source,source_ref&order=id&offset=${from}&limit=1000`);
      if (!res.ok) throw new Error(`Reading places failed: ${res.status} ${await res.text()}`);
      const page = await res.json();
      rows.push(...page);
      if (page.length < 1000) break;
    }
    console.error(`Existing places read from the database: ${rows.length}`);
    return rows;
  }
  if (args.existing) return JSON.parse(fs.readFileSync(args.existing, 'utf8'));
  console.error('WARNING: no service key and no --existing file: only duplicates inside this batch are detected.');
  return [];
}

async function latestRelease() {
  const res = await fetch('https://overturemaps-us-west-2.s3.amazonaws.com/?prefix=release/&delimiter=/');
  const releases = [...(await res.text()).matchAll(/<Prefix>release\/([^<]+)\/<\/Prefix>/g)].map((m) => m[1]).sort();
  return releases.at(-1);
}

async function fetchOverture() {
  const release = await latestRelease();
  console.error(`Overture release ${release}, area ${area.label}`);
  const db = await DuckDBInstance.create(':memory:');
  const conn = await db.connect();
  await conn.run("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';");
  const [south, west, north, east] = area.bbox;
  const taxa = Object.keys(CATEGORY_SOURCES[category]).map((t) => `'${t}'`).join(',');
  const result = await conn.runAndReadAll(`
    select id, names.primary as name, taxonomy.primary as taxonomy, confidence, operating_status as status,
           addresses[1].freeform as address, addresses[1].locality as city, addresses[1].country as country,
           (bbox.ymin + bbox.ymax) / 2 as lat, (bbox.xmin + bbox.xmax) / 2 as lng
    from read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning=1)
    where bbox.xmin between ${west} and ${east} and bbox.ymin between ${south} and ${north}
      and taxonomy.primary in (${taxa}) and confidence >= ${MIN_CONF}
    order by confidence desc limit 5000`);
  return result.getRowObjects().map((r) => ({ ...r, confidence: Number(r.confidence), lat: Number(r.lat), lng: Number(r.lng) }));
}

const existing = await loadExisting();
const knownRefs = new Set(existing.filter((e) => e.source === 'overture').map((e) => e.source_ref));
const raw = await fetchOverture();
const rows = raw.map((r) => toPlaceRow(r, category, { minConfidence: MIN_CONF })).filter((r) => r && !knownRefs.has(r.source_ref));
const { kept, dropped } = removeDuplicates(rows, existing);
const picked = spreadByCity(kept, COUNT, PER_CITY);

fs.writeFileSync(outFile, JSON.stringify({ rows: picked, dropped: dropped.map((d) => ({ candidate: d.candidate.name, clashesWith: d.clash.name })) }, null, 2));
console.log(picked.map((r) => `${r.city ?? '-'} | ${r.name} | ${r.address} | ${r._confidence}`).join('\n'));
console.log(`\nOverture ${raw.length} -> usable ${rows.length} -> without duplicates ${kept.length} (${dropped.length} dropped) -> picked ${picked.length}. Written to ${outFile}`);

if (args.apply) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('--apply needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
    process.exit(1);
  }
  const payload = picked.map(({ _confidence, ...row }) => row);
  const res = await rest('places?on_conflict=source,source_ref', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    console.error(`Insert failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  console.log(`Inserted ${(await res.json()).length} places as "pending". Review them in /admin.`);
} else {
  console.log('Dry run: nothing was written to the database. Add --apply to insert.');
}
