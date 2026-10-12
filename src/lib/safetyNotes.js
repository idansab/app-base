// Places where a short safety reminder is shown on the page itself (not only in the terms).
const WATER_WORDS = /(^|\s)(עין|מעיין|מעיינות|נחל|מפל|בריכת|בריכות|חוף|אגם|ים)(\s|$|-|,)/;

export function isWaterPlace(place) {
  if (!place) return false;
  if (WATER_WORDS.test(place.name || '')) return true;
  const kind = String(place.short_description || '').split('·')[0];
  return /(מעיין|חוף|נחל|מפל)/.test(kind);
}

export const WATER_SAFETY_TEXT =
  'מים, סלעים ושיטפונות: במעיינות, בנחלים ובחופים יש סכנת החלקה, טביעה ושיטפונות, בעיקר בחורף. ' +
  'בדקו תחזית ופתיחות לפני היציאה, אל תיכנסו למים בלי השגחה ושמרו על הילדים. ' +
  'המידע באתר אינו תחליף לשילוט ולהנחיות הרשויות במקום.';
