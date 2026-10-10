// Pure helpers for enriching imported places with contact details (no network).
// Used by scripts/enrich-places.mjs and unit-tested in enrich.test.js.

/** "+972506374636" / "972-4-832-2066" -> "050-6374636" / "04-8322066"; null when it is not an Israeli number. */
export function formatPhone(raw) {
  let digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+972')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('972')) digits = `0${digits.slice(3)}`;
  if (!/^0\d{8,9}$/.test(digits)) return null;
  if (digits.startsWith('05') && digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

// Booking / ordering / shortener links are not the business's own website.
const NOT_A_WEBSITE = /(^|\.)(tabitisrael\.co\.il|tbit\.be|did\.li|ontopo\.(co\.il|com)|wolt\.com|10bis\.co\.il|bit\.ly|business\.site|cmenu\.co\.il|hopa\.tech)$/;

const isHttp = (u) => /^https?:\/\/[^\s<>"']+$/.test(u) && u.length <= 300;

/** Splits a list of URLs into website / instagram / facebook (first of each kind). */
export function pickLinks(urls = [], socials = []) {
  const out = { website: null, instagram: null, facebook: null };
  for (const raw of [...urls, ...socials]) {
    const url = String(raw ?? '').trim();
    if (!isHttp(url)) continue;
    let host = '';
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    // tracking parameters (igsh, utm_...) are dropped from social links
    if (/(^|\.)instagram\.com$/.test(host)) out.instagram ??= url.split('?')[0];
    else if (/(^|\.)(facebook|fb)\.com$/.test(host)) out.facebook ??= url.split('?')[0];
    else if (NOT_A_WEBSITE.test(host)) continue;
    else if (/(^|\.)(twitter|x|tiktok|linkedin|youtube|wa)\.(com|me)$/.test(host)) continue;
    else out.website ??= url;
  }
  return out;
}

/**
 * A short factual description in our own words, from facts only (type and place).
 * `wikidata` is the CC0 Hebrew description of the item, when there is one. Street addresses are
 * left out on purpose: they already have their own field and are often partial in the source data.
 */
export function buildDescription({ label, city, wikidata }) {
  if (wikidata) return `${wikidata.replace(/\.$/, '')}.`;
  if (label && city) return `${label} ב${city}.`;
  return label ? `${label}.` : null;
}
