#!/usr/bin/env node
/**
 * Checks whether places really exist, using independent public sources. It cannot prove that a venue is
 * open today, but it separates places with evidence from places with none.
 *
 *   node scripts/verify-places.mjs --places verify-input.json --out verify-report.json
 *
 * Input: [{ source: 'osm'|'overture'|'seed', source_ref, name, lat, lng }]  ('overture' needs only source_ref)
 *
 * Evidence used
 *   osm      the OpenStreetMap element still exists and has a name (and a Wikidata item when it has one)
 *   overture the venue's own website answers (HTTP 2xx/3xx), or an OpenStreetMap element with the same
 *            name is within 100 m
 *   seed     (places added by hand) a venue with the same name in OpenStreetMap or Overture within 3 km
 * Verdicts: "evidence" | "weak" (only a social page / phone, which cannot be checked automatically) | "none"
 */
import fs from 'node:fs';
import { DuckDBInstance } from '@duckdb/node-api';
import { haversineKm } from '../src/lib/geo.js';
import { normalizeName } from '../src/lib/importPlaces.js';
import { latestRelease, fetchOvertureByIds } from './lib/overture.mjs';
import { overpass, sleep, UA } from './lib/osm.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const places = JSON.parse(fs.readFileSync(args.places, 'utf8'));
const outFile = args.out || 'verify-report.json';

const sameName = (a, b) => {
  const x = normalizeName(a);
  const y = normalizeName(b);
  return Boolean(x && y && x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x)));
};

async function websiteAnswers(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; place-check/1.0)' } });
    return res.status < 400 ? 'ok' : `http-${res.status}`;
  } catch (e) {
    return e?.name === 'TimeoutError' ? 'timeout' : 'unreachable';
  }
}

const report = [];

// ---- OSM landmarks -----------------------------------------------------------------------------
const osm = places.filter((p) => p.source === 'osm');
if (osm.length) {
  const ids = { node: [], way: [], relation: [] };
  osm.forEach((p) => {
    const [t, i] = p.source_ref.split('/');
    ids[t]?.push(i);
  });
  const part = (t) => (ids[t].length ? `${t}(id:${ids[t].join(',')});` : '');
  const els = await overpass(`[out:json][timeout:90];(${part('node')}${part('way')}${part('relation')});out tags;`);
  const byRef = new Map(els.map((el) => [`${el.type}/${el.id}`, el.tags || {}]));
  for (const p of osm) {
    const t = byRef.get(p.source_ref);
    report.push({ ...p, verdict: t?.name ? 'evidence' : 'none', evidence: t ? [t.wikidata ? 'OSM+Wikidata' : 'OSM'] : ['missing in OSM now'] });
  }
}

// ---- Overture venues -----------------------------------------------------------------------------
const ov = places.filter((p) => p.source === 'overture');
if (ov.length) {
  const details = await fetchOvertureByIds(ov.map((p) => p.source_ref));
  // OSM elements near each venue, to match by name
  const nearby = [];
  const list = ov.map((p) => ({ p, d: details.get(p.source_ref) })).filter((x) => x.d);
  for (let i = 0; i < list.length; i += 40) {
    const q = `[out:json][timeout:90];(${list.slice(i, i + 40).map(({ d }) => `nwr(around:100,${d.lat},${d.lng})["name"];`).join('')});out center tags;`;
    nearby.push(...(await overpass(q)));
    await sleep(2500);
  }
  for (const { p, d } of list) {
    const evidence = [];
    const site = d.websites.find((u) => /^https?:/.test(u));
    let siteStatus = 'no-website';
    if (site) {
      siteStatus = await websiteAnswers(site);
      evidence.push(`website ${siteStatus}`);
    }
    const inOsm = nearby.some((el) => {
      const t = el.tags || {};
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      return lat != null && haversineKm(d.lat, d.lng, lat, lng) <= 0.1 && [t.name, t['name:he'], t['name:en']].some((n) => sameName(d.name, n));
    });
    if (inOsm) evidence.push('also in OpenStreetMap');
    const verdict = siteStatus === 'ok' || inOsm ? 'evidence' : d.socials.length || d.phones.length || site ? 'weak' : 'none';
    report.push({ ...p, name: d.name, lat: d.lat, lng: d.lng, website: site ?? null, verdict, evidence });
  }
  for (const p of ov) if (!details.has(p.source_ref)) report.push({ ...p, verdict: 'none', evidence: ['no longer in Overture'] });
}

// ---- hand-added places ---------------------------------------------------------------------------
const seeds = places.filter((p) => p.source === 'seed');
if (seeds.length) {
  const release = await latestRelease();
  const db = await DuckDBInstance.create(':memory:');
  const conn = await db.connect();
  await conn.run("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';");
  const south = Math.min(...seeds.map((s) => s.lat)) - 0.03;
  const north = Math.max(...seeds.map((s) => s.lat)) + 0.03;
  const west = Math.min(...seeds.map((s) => s.lng)) - 0.03;
  const east = Math.max(...seeds.map((s) => s.lng)) + 0.03;
  const rows = (
    await conn.runAndReadAll(`select names.primary as n, (bbox.ymin+bbox.ymax)/2 as lat, (bbox.xmin+bbox.xmax)/2 as lng
      from read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning=1)
      where bbox.xmin between ${west} and ${east} and bbox.ymin between ${south} and ${north} and confidence >= 0.4`)
  ).getRowObjects();
  const ovNear = rows.map((r) => ({ n: r.n, lat: Number(r.lat), lng: Number(r.lng) }));
  for (const s of seeds) {
    const evidence = [];
    const els = await overpass(`[out:json][timeout:60];nwr(around:3000,${s.lat},${s.lng})["name"];out center tags;`);
    await sleep(2500);
    const hitOsm = els.find((el) => {
      const t = el.tags || {};
      return [t.name, t['name:he'], t['name:en']].some((n) => sameName(s.name, n));
    });
    if (hitOsm) evidence.push(`OpenStreetMap: ${hitOsm.tags.name}`);
    const hitOv = ovNear.find((r) => haversineKm(s.lat, s.lng, r.lat, r.lng) <= 3 && sameName(s.name, r.n));
    if (hitOv) evidence.push(`Overture: ${hitOv.n}`);
    report.push({ ...s, verdict: evidence.length ? 'evidence' : 'none', evidence: evidence.length ? evidence : ['not found in OpenStreetMap or Overture'] });
  }
}

fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
const tally = report.reduce((a, r) => ({ ...a, [`${r.source}:${r.verdict}`]: (a[`${r.source}:${r.verdict}`] || 0) + 1 }), {});
console.log(JSON.stringify(tally, null, 2));
