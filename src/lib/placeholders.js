// Illustrative pictures for places that have no photo yet. They are generic (one per kind of place),
// always labelled "for illustration only", and disappear as soon as the place gets a real photo.
import { normalizeCategory } from './categories.js';
import { getPlaceImages } from './placeImages.js';

export const PLACEHOLDER_KINDS = ['spring', 'viewpoint', 'beach', 'nature', 'bar', 'cafe', 'cart', 'market', 'museum', 'heritage', 'amusement', 'water', 'games', 'extreme'];

// How many pictures exist per kind: public/placeholders/<kind>.jpg, <kind>-2.jpg, <kind>-3.jpg ...
// Raise a number here after adding files; a place always gets the same variant (chosen by its id).
export const PLACEHOLDER_VARIANTS = { ...Object.fromEntries(PLACEHOLDER_KINDS.map((kind) => [kind, 1])), bar: 3 };

// Checked in order against the place name and its first tag (the kind label from the importer).
const RULES = [
  ['cart', /עגלת|דוכן|פודטראק|משאית אוכל|food truck/i],
  ['cafe', /קפה|cafe|café|coffee|בית תה/i],
  ['amusement', /פארק שעשועים|פארק מים|גן חיות|חוות חיות|אקווריום|פלנטריום|מצפה כוכבים|amusement|water park|zoo|aquarium/i],
  ['games', /חדר בריחה|חדרי בריחה|באולינג|לייזר|ארקייד|escape room|bowling|laser tag|arcade/i],
  ['water', /קיאק|צלילה|גלישה|שייט|אופנועי ים|סירות|השכרת סירות|kayak|diving|surf|boat tour|jet ski/i],
  ['extreme', /קארטינג|טרקטורון|טיפוס|סנפלינג|צניחה|רכיבה על סוסים|פיינטבול|סקייטפארק|כדור פורח|רכבל|אתר סקי|karting|atv|paintball|climbing|skydiv|horseback/i],
  ['bar', /(?<![א-ת])בר(?![א-ת])|פאב|מועדון|קוקטייל|נרגילה|\bpub\b|\bbar\b|lounge|לאונג/i],
  ['spring', /מעיין|מעין|(?<![א-ת])עין(?![א-ת])|נחל|מפל|אגם|בריכה|spring|waterfall/i],
  ['viewpoint', /תצפית|מצפה|מצפור|viewpoint|lookout/i],
  ['beach', /חוף|beach/i],
  ['market', /שוק|מרקט|market/i],
  ['museum', /מוזיאון|גלריה|museum|gallery/i],
  ['heritage', /אתר ארכאולוגי|ארכיאולוגי|חורבת|תל |עתיק|קיסריה|בית כנסת|אתר היסטורי|אתר מבקרים|מבצר|מצד /i],
];

const BY_CATEGORY = { food: 'cart', nature: 'nature', nightlife: 'bar', shopping: 'market', culture: 'heritage', attractions: 'amusement' };

/** Which illustration fits a place, by kind label / name first and category as the fallback. */
export function placeholderKind(place) {
  const text = `${place?.tags?.[0] ?? ''} ${place?.name ?? ''}`;
  const hit = RULES.find(([, re]) => re.test(text));
  if (hit) return hit[0];
  return BY_CATEGORY[normalizeCategory(place?.category)] || 'nature';
}

const hash = (text) => [...String(text ?? '')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

export function placeholderSrc(kind, seed = '') {
  const safe = PLACEHOLDER_KINDS.includes(kind) ? kind : 'nature';
  const variant = (hash(seed) % (PLACEHOLDER_VARIANTS[safe] || 1)) + 1;
  return `/placeholders/${safe}${variant > 1 ? `-${variant}` : ''}.jpg`;
}

/** The picture to show for a place without photos, or null when it has real ones. */
export const placeholderFor = (place) => (getPlaceImages(place).length > 0 ? null : placeholderSrc(placeholderKind(place), place?.id ?? place?.name));
