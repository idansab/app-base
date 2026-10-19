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

/** The template text the nature importer writes ("מעיין בגליל. מומלץ לבדוק ... לפני היציאה."), safe to replace. */
export const isGeneratedDescription = (text) => /מומלץ לבדוק [^.]* לפני (היציאה|ההגעה)\.\s*$/.test(String(text ?? ''));

const dropParens = (text) => {
  let out = String(text ?? '').replace(/[֑-ֽֿ-ׇ]/g, ''); // niqqud, not the maqaf
  for (let i = 0; i < 3; i += 1) out = out.replace(/\s*\([^()]*\)/g, '');
  return out.replace(/\s+([,.])/g, '$1').replace(/\s+/g, ' ').trim();
};

/** First sentences of a Wikipedia lead: no parentheses (transliterations, dates), at most `max` characters. */
export function leadSentences(extract, max = 280) {
  const para = dropParens(String(extract ?? '').split(/\n+/).find((l) => l.trim().length > 20) ?? '');
  const sentences = para.split(/(?<=[.!?])\s+(?=\D)/).filter(Boolean);
  if (!sentences.length) return '';
  let out = sentences[0];
  if (out.length > max + 70) return `${out.slice(0, out.lastIndexOf(' ', max))}…`;
  for (const s of sentences.slice(1)) {
    if (out.length + s.length + 1 > max) break;
    out += ` ${s}`;
  }
  return /[.!?…]$/.test(out) ? out : `${out}.`;
}

/**
 * A description from a Hebrew Wikipedia lead (CC BY-SA, credited in the text) or a Wikidata description (CC0),
 * replacing the first, generic sentence of the generated text and keeping its practical notes.
 * null when there is nothing better than what is there.
 */
export function wikiDescription({ name, existing, extract, wikidata }) {
  const sentences = String(existing ?? '').split(/(?<=\.)\s+/);
  const tail = sentences.slice(1).join(' ');
  const lead = leadSentences(extract);
  if (lead.length >= 25) return `${lead} (מתוך ויקיפדיה) ${tail}`.trim();
  const desc = String(wikidata ?? '').trim().replace(/\.$/, '');
  if (desc.split(/\s+/).length >= 3 && desc.length >= 15) return `${name} – ${desc}. ${tail}`.trim();
  return null;
}
