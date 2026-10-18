#!/usr/bin/env node
/**
 * Turns the nature batch (import-osm-nature.mjs) and its photos (fetch-commons-images.mjs) into INSERT
 * statements, adding what open sources say about each place:
 *   - a short description written from facts: the Wikidata Hebrew description (CC0) and OpenStreetMap
 *     tags (ODbL) such as seasonal flow, drinking water, fee, wheelchair access, operator, elevation.
 *     No text is copied from Wikipedia or any website.
 *   - opening hours and website from the OpenStreetMap element
 *   - Commons photos with author + license credits
 * Places OSM marks as private / no access are dropped.
 *
 *   node scripts/build-nature-sql.mjs --batch nature-batch.json --images nature-images.json \
 *        --out-dir nature-sql [--chunk 150] [--approve images|all|none]
 *
 * --approve  which rows go live: "images" (default) = places with a photo are approved, the rest pending
 * Writes one SQL file per chunk plus preview.json; it never touches the database. Re-running is safe:
 * the INSERT skips any source_ref that is already in the table.
 */
import fs from 'node:fs';
import path from 'node:path';
import { summarizeSchedule } from '../src/lib/openingHours.js';
import { parseOsmHours } from '../src/lib/osmHours.js';
import { overpass, sleep, UA } from './lib/osm.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const batch = JSON.parse(fs.readFileSync(args.batch, 'utf8')).rows;
const images = args.images ? JSON.parse(fs.readFileSync(args.images, 'utf8')).results : [];
const outDir = args['out-dir'] || 'nature-sql';
const CHUNK = Number(args.chunk ?? 150);
const APPROVE = args.approve || 'images';

const photosByRef = new Map(images.map((r) => [r.source_ref, r]));

async function osmTagsByRef(rows) {
  const ids = { node: [], way: [], relation: [] };
  rows.forEach((r) => {
    const [t, i] = r.source_ref.split('/');
    ids[t]?.push(i);
  });
  const out = {};
  for (const type of Object.keys(ids)) {
    for (let i = 0; i < ids[type].length; i += 400) {
      const els = await overpass(`[out:json][timeout:120];${type}(id:${ids[type].slice(i, i + 400).join(',')});out tags;`);
      for (const el of els) out[`${el.type}/${el.id}`] = el.tags || {};
      await sleep(2500);
    }
  }
  return out;
}

async function wikidataDescriptions(qids) {
  const out = {};
  for (let i = 0; i < qids.length; i += 40) {
    const params = new URLSearchParams({ action: 'wbgetentities', format: 'json', ids: qids.slice(i, i + 40).join('|'), props: 'descriptions', languages: 'he' });
    try {
      const json = await (await fetch(`https://www.wikidata.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } })).json();
      for (const [q, e] of Object.entries(json.entities || {})) if (e.descriptions?.he?.value) out[q] = e.descriptions.he.value;
    } catch (e) {
      console.error(`Wikidata failed: ${e.message}`);
    }
    await sleep(500);
  }
  return out;
}

const yes = (v) => /^(yes|true)$/i.test(String(v || ''));
const no = (v) => /^(no|false)$/i.test(String(v || ''));
const sentence = (s) => (s ? `${s.trim().replace(/[.\s]+$/, '')}.` : '');

/** A few plain sentences built only from facts in open data. */
export function describe(row, tags, wikidataText) {
  const where = row.city ? ` ב${row.city}` : '';
  const parts = [sentence(wikidataText || `${row.tags[0]}${where}`)];
  const water = row._kind === 'spring' || row._kind === 'waterfall';
  if (water && (yes(tags.seasonal) || yes(tags.intermittent))) parts.push('הזרימה עונתית, ולא תמיד יש בו מים.');
  if (water && no(tags.drinking_water)) parts.push('המים אינם ראויים לשתייה.');
  if (row._kind === 'beach' && yes(tags.supervised)) parts.push('בעונת הרחצה יש בחוף הצלה.');
  if (row._kind === 'beach' && no(tags.supervised)) parts.push('החוף אינו מוכרז לרחצה ואין בו הצלה.');
  const ele = Number(String(tags.ele || '').replace(',', '.'));
  if (row._kind === 'viewpoint' && ele > 0) parts.push(`התצפית בגובה של כ-${Math.round(ele)} מטר מעל פני הים.`);
  if (yes(tags.fee)) parts.push('הכניסה בתשלום.');
  if (no(tags.fee)) parts.push('הכניסה חופשית.');
  if (tags.wheelchair === 'yes') parts.push('המקום נגיש לכיסאות גלגלים.');
  if (tags.wheelchair === 'limited') parts.push('המקום נגיש באופן חלקי.');
  if (tags.operator && /[֐-׿]/.test(tags.operator)) parts.push(`המקום בניהול ${tags.operator}.`);
  parts.push(row._kind === 'reserve' ? 'מומלץ לבדוק שעות ותנאי כניסה לפני ההגעה.' : 'מומלץ לבדוק את תנאי השטח לפני היציאה.');
  return parts.filter(Boolean).join(' ');
}

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `ARRAY[${a.map(q).join(',')}]::text[]`;
// typed nulls: a chunk where every row lacks a value must still resolve to the column's type
const json = (o) => (o == null ? 'null::jsonb' : `${q(JSON.stringify(o))}::jsonb`);

async function main() {
  const tags = await osmTagsByRef(batch);
  console.error(`OSM tags: ${Object.keys(tags).length}/${batch.length}`);
  const qids = [...new Set(Object.values(tags).map((t) => t.wikidata).filter((x) => /^Q\d+$/.test(x || '')))];
  const wd = await wikidataDescriptions(qids);
  console.error(`Wikidata Hebrew descriptions: ${Object.keys(wd).length}/${qids.length}`);

  const rows = [];
  const skipped = [];
  for (const r of batch) {
    const t = tags[r.source_ref];
    if (!t) {
      skipped.push({ name: r.name, why: 'gone from OSM' });
      continue;
    }
    if (/^(private|no)$/i.test(t.access || '')) {
      skipped.push({ name: r.name, why: `access=${t.access}` });
      continue;
    }
    const photos = photosByRef.get(r.source_ref);
    const schedule = parseOsmHours(t.opening_hours);
    const approved = APPROVE === 'all' || (APPROVE === 'images' && photos?.images?.length);
    rows.push({
      name: r.name,
      description: describe(r, t, wd[t.wikidata]),
      short_description: r.short_description,
      category: 'nature',
      city: r.city,
      address: r.address || r.city || 'ישראל',
      lat: r.lat,
      lng: r.lng,
      image_url: photos?.images?.[0] ?? null,
      images: photos?.images ?? [],
      image_credits: photos?.credits ?? {},
      tags: r.tags,
      status: approved ? 'approved' : 'pending',
      opening_schedule: schedule,
      opening_hours: schedule ? summarizeSchedule(schedule) : null,
      website: t.website || t['contact:website'] || null,
      source_ref: r.source_ref,
      _kind: r._kind,
    });
  }

  fs.mkdirSync(outDir, { recursive: true });
  const cols = 'name,description,short_description,category,city,address,lat,lng,image_url,images,image_credits,tags,status,price_level,opening_hours,opening_schedule,website,source,source_ref,source_license';
  let files = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const values = rows.slice(i, i + CHUNK).map((r) =>
      `(${[q(r.name), q(r.description), q(r.short_description), q(r.category), q(r.city), q(r.address), r.lat, r.lng, q(r.image_url), arr(r.images), json(r.image_credits), arr(r.tags), q(r.status), 'null::text', q(r.opening_hours), json(r.opening_schedule), q(r.website), q('osm'), q(r.source_ref), q('ODbL')].join(',')})`
    );
    const sql = `insert into public.places (${cols})\nselect * from (values\n${values.join(',\n')}\n) as v(${cols})\nwhere not exists (select 1 from public.places p where p.source = 'osm' and p.source_ref = v.source_ref);\n`;
    fs.writeFileSync(path.join(outDir, `chunk-${String(++files).padStart(2, '0')}.sql`), sql);
  }
  fs.writeFileSync(path.join(outDir, 'preview.json'), JSON.stringify({ rows, skipped }, null, 2));

  const count = (f) => rows.filter(f).length;
  console.log(JSON.stringify({
    rows: rows.length,
    files,
    approved: count((r) => r.status === 'approved'),
    pending: count((r) => r.status === 'pending'),
    withPhotos: count((r) => r.images.length),
    withHours: count((r) => r.opening_schedule),
    withWebsite: count((r) => r.website),
    withWikidataText: count((r) => !r.description.startsWith(r.tags[0])),
    byKind: rows.reduce((a, r) => ({ ...a, [r._kind]: (a[r._kind] || 0) + 1 }), {}),
    skipped: skipped.length,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
