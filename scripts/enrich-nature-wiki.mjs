#!/usr/bin/env node
/**
 * Adds a sourced description and licensed photos to pending nature places (springs, viewpoints, reserves...).
 *
 *   node scripts/enrich-nature-wiki.mjs --places pending.json --out wiki.json [--limit 10] [--cache wiki-cache.json]
 *   node scripts/enrich-nature-wiki.mjs --apply wiki.json        (writes to Supabase with SUPABASE_SERVICE_KEY)
 *
 * pending.json: [{ id, name, lat, lng, source_ref, description, images, image_url, image_credits }]
 * Matching, most trusted first: the OSM element's wikidata / wikipedia tags, then a Hebrew Wikipedia article
 * within 1.5 km whose title is the same place name. Text: the first sentences of the Hebrew Wikipedia lead
 * (CC BY-SA, credited in the text) or the Wikidata Hebrew description (CC0). Photos: Wikidata P18 / P373,
 * the article's free lead image, OSM Commons tags, then nearby Commons files named after the place; only
 * CC0 / PD / CC BY / CC BY-SA, each with its credit in image_credits.
 * Only generated text (it ends with "מומלץ לבדוק ...") is replaced, photos only when there are none, and the
 * status is never changed: the admin still approves every place.
 */
import fs from 'node:fs';
import { parseCommonsRef, pickImages, titleMatches } from '../src/lib/commonsImages.js';
import { isGeneratedDescription, wikiDescription } from '../src/lib/enrich.js';
import { coreName } from '../src/lib/importPlaces.js';
import { haversineKm } from '../src/lib/geo.js';
import { overpass, sleep, UA } from './lib/osm.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);

async function getJson(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) return await res.json();
      console.error(`${res.status} for ${url.slice(0, 90)}`);
    } catch (e) {
      console.error(`fetch failed: ${e.message}`);
    }
    await sleep(3000 * (attempt + 1));
  }
  return null;
}
const api = (host, params) =>
  getJson(`https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`);
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

// ---- apply -------------------------------------------------------------------------------------------
if (args.apply) {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  const key = env.SUPABASE_SERVICE_KEY;
  const { results } = JSON.parse(fs.readFileSync(args.apply, 'utf8'));
  let desc = 0;
  let photos = 0;
  for (const r of results) {
    const patch = async (filter, body) => {
      const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/places?id=eq.${encodeURIComponent(r.id)}&status=eq.pending&${filter}`, {
        method: 'PATCH',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      return (await res.json()).length;
    };
    // the filters make the write a no-op when someone edited the place since the export
    if (r.description) desc += await patch(`description=eq.${encodeURIComponent(r.old_description)}`, { description: r.description });
    if (r.images?.length) {
      photos += await patch('or=(images.is.null,images.eq.{})&image_url=is.null', {
        images: r.images,
        image_url: r.images[0],
        image_credits: { ...(r.old_credits || {}), ...r.credits },
      });
    }
  }
  console.log(JSON.stringify({ descriptionsWritten: desc, photosWritten: photos }));
  process.exit(0);
}

// ---- collect -----------------------------------------------------------------------------------------
const cacheFile = args.cache || 'wiki-cache.json';
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const saveCache = () => fs.writeFileSync(cacheFile, JSON.stringify(cache));
let places = JSON.parse(fs.readFileSync(args.places, 'utf8'));
if (args.ids) places = places.filter((p) => args.ids.split(',').includes(p.id));
if (args.limit) places = places.slice(0, Number(args.limit));

// OSM tags (wikidata, wikipedia, Commons) for every imported element
if (!cache.osm) cache.osm = {};
const needOsm = places.map((p) => p.source_ref).filter((r) => r && !(r in cache.osm));
for (const part of chunks(needOsm, 300)) {
  const ids = { node: [], way: [], relation: [] };
  part.forEach((ref) => ids[ref.split('/')[0]]?.push(ref.split('/')[1]));
  const q = ['node', 'way', 'relation'].map((t) => (ids[t].length ? `${t}(id:${ids[t].join(',')});` : '')).join('');
  part.forEach((ref) => (cache.osm[ref] = {}));
  for (const el of await overpass(`[out:json][timeout:90];(${q});out tags;`)) cache.osm[`${el.type}/${el.id}`] = el.tags || {};
  saveCache();
  await sleep(2000);
}

// Words that only say what kind of place it is: "שמורת טבע חורש עדולם" is the article "חורש עדולם".
const KIND_WORDS = /^(שמורת|שמורה|טבע|גן|גנים|לאומי|לאומיים|נקודת|תצפית)$/;
const bareName = (name) => name.replace(/\s*\(.*\)$/, '').split(/\s+/).filter((w) => !KIND_WORDS.test(w)).join(' ');

/** A Wikipedia article title is this place when, without type words, both names are the same. */
const samePlace = (title, name) => {
  const a = coreName(bareName(title));
  const b = coreName(bareName(name));
  return a.length >= 3 && (a === b || (b.length >= 4 && (a.startsWith(`${b} `) || b.startsWith(`${a} `))));
};

// The lead must say it is this kind of place, so a viewpoint is not matched to the town it is named after.
const KIND_TEXT = { 'מעיין': /מעיין|מעין|עין|נביע/, 'מפל': /מפל|נחל|מעיין/, 'נקודת תצפית': /תצפית|מצפה|מצפור|נוף/, 'חוף': /חוף/, 'שמורת טבע או גן לאומי': /שמור|גן לאומי|גנים לאומיים|אתר|תל|חורש|יער|נחל/ };

// Hebrew Wikipedia article per place: OSM / Wikidata link first, then a name search checked by distance and kind
if (!cache.search) cache.search = {};
const article = {}; // id -> { lang, title, via }
const qidOf = {};
for (const p of places) {
  const t = cache.osm[p.source_ref] || {};
  if (/^Q\d+$/.test(t.wikidata || '')) qidOf[p.id] = t.wikidata;
  const wp = String(t.wikipedia || '').match(/^(he|en):(.+)$/);
  if (wp) article[p.id] = { lang: wp[1], title: wp[2], via: 'osm' };
  if (article[p.id]) continue;
  if (!(p.id in cache.search)) {
    const json = await api('he.wikipedia.org', {
      action: 'query', generator: 'search', gsrsearch: bareName(p.name) || p.name, gsrlimit: '6', gsrnamespace: '0',
      prop: 'coordinates|pageprops|extracts', ppprop: 'disambiguation', exintro: '1', explaintext: '1', exsentences: '2', exlimit: '6',
    });
    cache.search[p.id] = (json?.query?.pages || []).map((pg) => ({
      title: pg.title, index: pg.index, coords: pg.coordinates?.[0] || null, disambiguation: pg.pageprops?.disambiguation !== undefined, lead: pg.extract || '',
    }));
    saveCache();
    await sleep(250);
  }
  const names = [p.name, t['name:he']].filter(Boolean);
  const kindText = KIND_TEXT[p.tags?.[0]] || /./;
  const hit = cache.search[p.id]
    .filter((c) => !c.disambiguation && c.coords && haversineKm(p.lat, p.lng, c.coords.lat, c.coords.lon) <= 8)
    .filter((c) => kindText.test(c.lead.split(/(?<=\.)\s/)[0] || ''))
    .sort((x, y) => x.index - y.index)
    .find((c) => names.some((n) => samePlace(c.title, n)));
  if (hit) article[p.id] = { lang: 'he', title: hit.title, via: 'search' };
}

// Wikidata: sitelinks, Hebrew description, image, Commons category; and the item of each tagged article
const entities = {};
const needQ = [...new Set(Object.values(qidOf))];
for (const part of chunks(needQ, 50)) {
  const json = await api('www.wikidata.org', { action: 'wbgetentities', ids: part.join('|'), props: 'sitelinks|descriptions|claims', languages: 'he', sitefilter: 'hewiki|enwiki' });
  Object.assign(entities, json?.entities || {});
  await sleep(500);
}
for (const p of places) {
  const e = entities[qidOf[p.id]];
  if (e?.sitelinks?.hewiki && article[p.id]?.via !== 'osm') article[p.id] = { lang: 'he', title: e.sitelinks.hewiki.title, via: 'wikidata' };
}

// Lead text and free lead image of each Hebrew article
const heTitles = [...new Set(Object.values(article).filter((a) => a.lang === 'he').map((a) => a.title))];
const pages = {};
for (const part of chunks(heTitles, 20)) {
  const json = await api('he.wikipedia.org', {
    action: 'query', titles: part.join('|'), redirects: '1', prop: 'extracts|pageimages|coordinates|pageprops',
    exintro: '1', explaintext: '1', exlimit: '20', piprop: 'name', pilicense: 'free', ppprop: 'disambiguation|wikibase_item', colimit: '20',
  });
  const redirect = Object.fromEntries((json?.query?.redirects || []).map((r) => [r.to, r.from]));
  const normal = Object.fromEntries((json?.query?.normalized || []).map((r) => [r.to, r.from]));
  for (const pg of json?.query?.pages || []) {
    if (pg.missing || pg.pageprops?.disambiguation !== undefined) continue;
    const info = { title: pg.title, extract: pg.extract, image: pg.pageimage, coords: pg.coordinates?.[0], qid: pg.pageprops?.wikibase_item };
    pages[pg.title] = info;
    if (redirect[pg.title]) pages[redirect[pg.title]] = info;
    if (normal[redirect[pg.title] || pg.title]) pages[normal[redirect[pg.title] || pg.title]] = info;
  }
  await sleep(400);
}

// Items of articles found by tag / geosearch, for their image and Commons category
const extraQ = [...new Set(Object.values(pages).map((pg) => pg.qid).filter((q) => q && !entities[q]))];
for (const part of chunks(extraQ, 50)) {
  const json = await api('www.wikidata.org', { action: 'wbgetentities', ids: part.join('|'), props: 'descriptions|claims', languages: 'he' });
  Object.assign(entities, json?.entities || {});
  await sleep(500);
}

const commons = (params) => api('commons.wikimedia.org', params);
async function categoryFiles(title) {
  const json = await commons({ action: 'query', list: 'categorymembers', cmtitle: title, cmtype: 'file', cmlimit: '15' });
  return (json?.query?.categorymembers || []).map((m) => m.title);
}
async function imageInfo(titles) {
  const out = {};
  for (const part of chunks(titles, 20)) {
    const json = await commons({ action: 'query', titles: part.join('|'), prop: 'imageinfo', iiprop: 'url|mime|size|extmetadata', iiurlwidth: '960' });
    for (const pg of json?.query?.pages || []) if (pg.imageinfo?.[0]) out[pg.title] = pg.imageinfo[0];
    await sleep(300);
  }
  return out;
}
const claim = (e, prop) => e?.claims?.[prop]?.map((c) => c.mainsnak?.datavalue?.value).filter(Boolean) || [];

const results = [];
const nothing = [];
let n = 0;
for (const p of places) {
  const t = cache.osm[p.source_ref] || {};
  const a = article[p.id];
  let page = a?.lang === 'he' ? pages[a.title] : null;
  // an article's coordinates far from the place mean a different site with the same name
  if (page?.coords && haversineKm(p.lat, p.lng, page.coords.lat, page.coords.lon) > 5) page = null;
  const entity = entities[qidOf[p.id]] || entities[page?.qid];

  const generated = isGeneratedDescription(p.description);
  const description = generated
    ? wikiDescription({ name: p.name, existing: p.description, extract: page?.extract, wikidata: entity?.descriptions?.he?.value })
    : null;

  let picked = [];
  const hasPhotos = (p.images?.length || 0) > 0 || Boolean(p.image_url);
  if (!hasPhotos) {
    const titles = [];
    const add = (title, via) => {
      const full = (title.startsWith('File:') ? title : `File:${title}`).replace(/_/g, ' ');
      if (!titles.some((x) => x.title === full)) titles.push({ title: full, via });
    };
    claim(entity, 'P18').forEach((f) => add(f, 'wikidata'));
    if (page?.image) add(page.image, 'wikipedia');
    for (const ref of [parseCommonsRef(t.wikimedia_commons), parseCommonsRef(t.image)].filter(Boolean)) {
      if (ref.type === 'file') add(ref.title, 'osm-tag');
      else (await categoryFiles(ref.title)).forEach((f) => add(f, 'osm-category'));
    }
    const category = claim(entity, 'P373')[0];
    if (category) (await categoryFiles(`Category:${category}`)).forEach((f) => add(f, 'wikidata-category'));
    if (titles.length === 0) {
      const json = await commons({ action: 'query', list: 'geosearch', gscoord: `${p.lat}|${p.lng}`, gsradius: '300', gsnamespace: '6', gslimit: '30' });
      const names = [p.name, t['name:he'], t['name:en'], t.name].filter(Boolean);
      (json?.query?.geosearch || []).map((g) => g.title).filter((f) => titleMatches(f, names)).forEach((f) => add(f, 'geosearch'));
    }
    if (titles.length === 0 && coreName(bareName(p.name)).length >= 3) {
      // files whose page mentions the exact name and that were taken close by
      const json = await commons({
        action: 'query', generator: 'search', gsrsearch: `"${p.name}" filetype:bitmap`, gsrnamespace: '6', gsrlimit: '15', prop: 'coordinates',
      });
      const radius = p.tags?.[0] === 'שמורת טבע או גן לאומי' ? 5 : 2;
      (json?.query?.pages || [])
        .filter((f) => f.coordinates?.[0] && haversineKm(p.lat, p.lng, f.coordinates[0].lat, f.coordinates[0].lon) <= radius)
        .sort((x, y) => x.index - y.index)
        .forEach((f) => add(f.title, 'commons-search'));
    }
    if (titles.length) {
      const infos = await imageInfo(titles.map((x) => x.title));
      picked = pickImages(titles.map((x) => ({ ...x, info: infos[x.title] })), 3);
    }
  }

  const changed = Boolean(description && description !== p.description);
  if (!changed && picked.length === 0) {
    nothing.push({ id: p.id, name: p.name, city: p.city || '', kind: p.tags?.[0] || '', lat: p.lat, lng: p.lng, osm: p.source_ref || '' });
  } else {
    results.push({
      id: p.id,
      name: p.name,
      old_description: p.description,
      description: changed ? description : null,
      text_source: changed ? (page?.extract && description.includes('ויקיפדיה') ? `he.wikipedia: ${page.title}` : `wikidata: ${entity?.id}`) : null,
      images: picked.map((x) => x.url),
      credits: Object.fromEntries(picked.map((x) => [x.url, x.credit])),
      old_credits: p.image_credits,
      via: [...new Set(picked.map((x) => x.via))],
    });
  }
  if (++n % 50 === 0) console.error(`${n}/${places.length}`);
  await sleep(150);
}

fs.writeFileSync(args.out || 'wiki.json', JSON.stringify({ results, nothing }, null, 2));
console.log(JSON.stringify({
  places: places.length,
  withDescription: results.filter((r) => r.description).length,
  fromWikipedia: results.filter((r) => r.text_source?.startsWith('he.wikipedia')).length,
  withPhotos: results.filter((r) => r.images.length).length,
  photosTotal: results.reduce((s, r) => s + r.images.length, 0),
  nothingFound: nothing.length,
}, null, 2));
