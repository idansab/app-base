// Pure helpers for picking licensed photos from Wikimedia Commons (no network).
// Used by scripts/fetch-commons-images.mjs and unit-tested in commonsImages.test.js.
import { coreName, normalizeName } from './importPlaces.js';

/** "Category:Ein Gedi" / "File:X.jpg" / a commons.wikimedia.org URL -> { type, title } or null. */
export function parseCommonsRef(value) {
  if (!value || typeof value !== 'string') return null;
  let text = value.trim();
  const url = text.match(/^https?:\/\/commons\.wikimedia\.org\/wiki\/(.+)$/i);
  if (url) text = decodeURIComponent(url[1]);
  text = text.replace(/_/g, ' ');
  const match = text.match(/^(Category|File|Image):(.+)$/i);
  if (!match) return null;
  const kind = match[1].toLowerCase();
  return { type: kind === 'category' ? 'category' : 'file', title: `${kind === 'category' ? 'Category' : 'File'}:${match[2].trim()}` };
}

/**
 * Only licenses that allow reuse with attribution on a website:
 * CC0, public domain, CC BY, CC BY-SA. NonCommercial / NoDerivatives / GFDL-only / fair use are out.
 */
export function isFreeLicense(shortName) {
  const s = String(shortName ?? '').trim();
  if (!s) return false;
  if (/\b(NC|ND)\b|[-\s](NC|ND)[-\s\d]|fair use|copyrighted|all rights reserved|non-?free/i.test(s)) return false;
  return /^(CC0|Public domain|PD\b|CC[ -]BY)/i.test(s);
}

export const isPhotoMime = (mime) => /^image\/(jpeg|png|webp)$/i.test(mime || '');

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

/** Commons "Artist" fields are HTML. Returns plain text, capped, or '' when nothing usable. */
export function stripHtml(html, max = 120) {
  const text = String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Credit shown under a photo, from a Commons imageinfo record. null when it cannot be used. */
export function buildCredit(info) {
  const meta = info?.extmetadata || {};
  const license = stripHtml(meta.LicenseShortName?.value, 40);
  if (!isFreeLicense(license) || !isPhotoMime(info?.mime)) return null;
  const author = stripHtml(meta.Artist?.value) || 'Wikimedia Commons';
  return {
    author,
    license,
    license_url: meta.LicenseUrl?.value || null,
    source_url: info.descriptionurl || null,
  };
}

const latinTokens = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 4);

/**
 * Does a file title plausibly show this place? A nearby photo is not enough (a photo taken
 * 100 m away may show something else): the title must contain a distinctive word of the name,
 * in Hebrew or in English.
 */
export function titleMatches(fileTitle, names = []) {
  const title = String(fileTitle ?? '').replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '');
  const hebrewTitle = normalizeName(title);
  const latinTitle = new Set(latinTokens(title));
  for (const name of names.filter(Boolean)) {
    const core = coreName(name);
    if (core.length >= 3 && /[֐-׿]/.test(core) && hebrewTitle.includes(core)) return true;
    if (latinTokens(name).some((t) => latinTitle.has(t))) return true;
  }
  return false;
}

// File titles that are not a good picture of a place: map screenshots, old maps and engravings,
// archive illustrations, official-visit photos, and a few things nobody wants on a listing.
const UNWANTED_TITLE = [
  /\bIHM\b|israel[ _]hiking[ _]map/i, // screenshots of the Israel Hiking Map
  /^File:thumbnail\./i,
  /(?<!\d)(1[0-8]\d\d|19[0-8]\d)(?!\d)/, // a year before 1990: historical maps and old photographs
  /\b(map|plan|drawing|engraving|lithograph|painting|postcard|manuscript|bible|diagram|logo|flag)\b|IWMART/i,
  /\b(visits?|ambassador|minister|president|mayor|ceremony|conference|meeting|protest)\b/i,
  /matpc|\bLOC\b/, // Library of Congress archive photographs
  /\b(hotel|resort)\b|מלון/i, // the listing is the place, not a hotel named after it
  /\b(feces|poop|garbage|trash|litter|vandal|sewage|corpse|dead)\b/i,
];

export const isUsefulTitle = (title) => !UNWANTED_TITLE.some((re) => re.test(String(title ?? '').replace(/_/g, ' ')));

// Archives and illustrators whose material is historical rather than a picture of the place today.
const UNWANTED_AUTHOR = /Internet Archive|NYPL|New York Public Library|van de Velde|David Roberts|American Colony|Matson|Library of Congress|Royal Navy|Willem van de Poll/i;

export const isUnwantedAuthor = (author) => UNWANTED_AUTHOR.test(String(author ?? ''));

/** The image URL without tracking parameters (the API adds ?utm_* to thumbnails). */
export const cleanUrl = (url) => String(url ?? '').split('?')[0];

/** Keeps the best usable photos: a license credit, wide enough, no duplicates, at most `max`. */
export function pickImages(candidates, max = 3, minWidth = 800) {
  const seen = new Set();
  const picked = [];
  for (const c of candidates) {
    if (picked.length >= max) break;
    const credit = buildCredit(c.info);
    const width = c.info?.width || 0;
    const url = cleanUrl(c.info?.thumburl || c.info?.url);
    if (c.title !== undefined && !isUsefulTitle(c.title)) continue;
    if (!credit || isUnwantedAuthor(credit.author) || !url || url.length > 500 || width < minWidth || seen.has(url)) continue;
    seen.add(url);
    picked.push({ url, credit, via: c.via });
  }
  return picked;
}

/** Commons file page for a stored image URL (thumb or original), or null for other hosts. */
export function commonsFilePage(url) {
  const m = String(url ?? '').match(/^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)/);
  return m ? `https://commons.wikimedia.org/wiki/File:${m[1]}` : null;
}

/** License page for a Creative Commons short name such as "CC BY-SA 4.0"; null otherwise. */
export function licenseUrl(license) {
  const m = String(license ?? '').match(/^CC[ -]BY(-SA)?[ -](\d\.\d)/i);
  if (m) return `https://creativecommons.org/licenses/by${m[1] ? '-sa' : ''}/${m[2]}/`;
  if (/^CC0/i.test(license ?? '')) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  return null;
}
