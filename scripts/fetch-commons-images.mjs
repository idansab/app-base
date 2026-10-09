#!/usr/bin/env node
/**
 * Finds licensed photos on Wikimedia Commons for places imported from OpenStreetMap.
 *
 *   node scripts/fetch-commons-images.mjs --batch osm-batch.json --out images.json
 *
 * Sources, in order of trust:
 *   1. the place's Wikidata image (P18) and Commons category (P373)
 *   2. a `wikimedia_commons` / Commons `image` tag on the OSM element itself
 *   3. geotagged Commons files within 250 m whose TITLE contains the place name
 * Only CC0 / public domain / CC BY / CC BY-SA photos are kept, each with its attribution.
 * Nothing is written to the database: the output JSON is reviewed first.
 */
import fs from 'node:fs';
import { parseCommonsRef, pickImages, titleMatches } from '../src/lib/commonsImages.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const rows = JSON.parse(fs.readFileSync(args.batch, 'utf8')).rows;
const outFile = args.out || 'commons-images.json';
const MAX_PER_PLACE = Number(args.max ?? 3);

const UA = 'ma-yesh-po-import/1.0 (contact: idansabah15@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OVERPASS = ['https://overpass.openstreetmap.fr/api/interpreter', 'https://overpass-api.de/api/interpreter'];

async function getJson(url, init = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers || {}) } });
      if (res.ok) return await res.json();
      console.error(`${res.status} for ${url.slice(0, 90)}`);
    } catch (e) {
      console.error(`fetch failed: ${e.message}`);
    }
    await sleep(2000 * (attempt + 1));
  }
  return null;
}

const api = (host, params) => `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;

// ---- OSM tags for every imported element --------------------------------------------------
async function osmTags() {
  const ids = { node: [], way: [], relation: [] };
  for (const r of rows) {
    const [type, id] = r.source_ref.split('/');
    ids[type]?.push(id);
  }
  const part = (t) => (ids[t].length ? `${t}(id:${ids[t].join(',')});` : '');
  const query = `[out:json][timeout:60];(${part('node')}${part('way')}${part('relation')});out tags center;`;
  for (const url of OVERPASS) {
    const json = await getJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (json?.elements) return Object.fromEntries(json.elements.map((e) => [`${e.type}/${e.id}`, e.tags || {}]));
  }
  throw new Error('Overpass unavailable');
}

// ---- Wikidata: P18 (image) and P373 (Commons category) ---------------------------------------
async function wikidataClaims(qids) {
  const out = {};
  for (let i = 0; i < qids.length; i += 40) {
    const json = await getJson(api('www.wikidata.org', { action: 'wbgetentities', ids: qids.slice(i, i + 40).join('|'), props: 'claims' }));
    for (const [qid, entity] of Object.entries(json?.entities || {})) {
      const claim = (p) => entity.claims?.[p]?.map((c) => c.mainsnak?.datavalue?.value).filter(Boolean) || [];
      out[qid] = { images: claim('P18'), category: claim('P373')[0] };
    }
    await sleep(500);
  }
  return out;
}

const commons = (params) => getJson(api('commons.wikimedia.org', params));

async function categoryFiles(title, limit = 12) {
  const json = await commons({ action: 'query', list: 'categorymembers', cmtitle: title, cmtype: 'file', cmlimit: String(limit) });
  return (json?.query?.categorymembers || []).map((m) => m.title);
}

async function geoFiles(lat, lng) {
  const json = await commons({ action: 'query', list: 'geosearch', gscoord: `${lat}|${lng}`, gsradius: '250', gsnamespace: '6', gslimit: '25' });
  return (json?.query?.geosearch || []).map((g) => g.title);
}

async function imageInfo(titles) {
  const result = {};
  for (let i = 0; i < titles.length; i += 20) {
    const json = await commons({
      action: 'query',
      titles: titles.slice(i, i + 20).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|mime|size|extmetadata',
      iiurlwidth: '960',
    });
    for (const page of json?.query?.pages || []) {
      const info = page.imageinfo?.[0];
      if (info) result[page.title] = info;
    }
    await sleep(400);
  }
  return result;
}

async function main() {
  const tags = await osmTags();
  console.error(`OSM tags for ${Object.keys(tags).length}/${rows.length} elements`);

  const qids = [...new Set(Object.values(tags).map((t) => t.wikidata).filter((q) => /^Q\d+$/.test(q || '')))];
  const wd = qids.length ? await wikidataClaims(qids) : {};
  console.error(`Wikidata entities: ${qids.length}`);

  const results = [];
  const missing = [];
  for (const row of rows) {
    const t = tags[row.source_ref] || {};
    const names = [row.name, t['name:he'], t['name:en'], t.name].filter(Boolean);
    const titles = []; // [{ title, via }]
    const add = (title, via) => title && !titles.some((x) => x.title === title) && titles.push({ title: title.startsWith('File:') ? title : `File:${title}`, via });

    const claims = wd[t.wikidata];
    claims?.images.forEach((f) => add(f, 'wikidata'));
    const tagged = [parseCommonsRef(t.wikimedia_commons), parseCommonsRef(t.image)].filter(Boolean);
    for (const ref of tagged) {
      if (ref.type === 'file') add(ref.title, 'osm-tag');
      else (await categoryFiles(ref.title)).forEach((f) => add(f, 'osm-category'));
    }
    if (claims?.category) (await categoryFiles(`Category:${claims.category}`)).forEach((f) => add(f, 'wikidata-category'));
    if (titles.length === 0) {
      // last resort: nearby geotagged files, but only when the title names the place
      (await geoFiles(row.lat, row.lng)).filter((f) => titleMatches(f, names)).forEach((f) => add(f, 'geosearch'));
    }

    if (titles.length === 0) {
      missing.push(row.name);
      continue;
    }
    const infos = await imageInfo(titles.map((x) => x.title));
    const picked = pickImages(titles.map((x) => ({ via: x.via, title: x.title, info: infos[x.title] })), MAX_PER_PLACE);
    if (picked.length === 0) {
      missing.push(row.name);
      continue;
    }
    results.push({
      source_ref: row.source_ref,
      name: row.name,
      images: picked.map((p) => p.url),
      credits: Object.fromEntries(picked.map((p) => [p.url, p.credit])),
      via: [...new Set(picked.map((p) => p.via))],
    });
    process.stderr.write('.');
    await sleep(300);
  }
  process.stderr.write('\n');

  fs.writeFileSync(outFile, JSON.stringify({ results, missing }, null, 2));
  const imagesTotal = results.reduce((n, r) => n + r.images.length, 0);
  const licenses = results.flatMap((r) => Object.values(r.credits).map((c) => c.license));
  console.log(JSON.stringify({
    places: rows.length,
    withImages: results.length,
    withoutImages: missing.length,
    imagesTotal,
    byLicense: licenses.reduce((a, l) => ({ ...a, [l]: (a[l] || 0) + 1 }), {}),
    byRoute: results.flatMap((r) => r.via).reduce((a, v) => ({ ...a, [v]: (a[v] || 0) + 1 }), {}),
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
