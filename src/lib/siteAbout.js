// Who runs the site, why, and where its places come from. One source for the home page, the About page,
// the plain-HTML version crawlers get (functions/_middleware.js) and the Organization JSON-LD,
// so people, search engines and AI assistants all read the same thing. Must stay import-free plain JS.

export const SITE_NAME = 'מה יש פה';
export const SITE_ORIGIN = 'https://mayeshpo.top';
export const CONTACT_EMAIL = 'idansbah21@gmail.com';

export const ABOUT_SUMMARY =
  '"מה יש פה" הוא מדריך טיולים ומקומות בישראל, בעברית ובחינם: מעיינות, מסלולים, נקודות תצפית, עגלות קפה, אוכל ובילוי. ' +
  'זה פרויקט ישראלי עצמאי. אין באתר תשלומים, ואנחנו לא מבקשים פרטי אשראי או סיסמאות מחוץ להרשמה לאתר עצמו.';

export const ABOUT_VISION =
  'לרכז במקום אחד את המקומות ששווה להכיר באזור שלך, כולל הפינות הפחות מוכרות, עם מידע מעשי: איך מגיעים, מתי פתוח, מה יש במקום וניווט ב-Waze בלחיצה.';

/** Where the places come from. Every source here is real and credited on the site. */
export const ABOUT_SOURCES = [
  {
    title: 'המלצות מהקהילה',
    text: 'גולשים ממליצים על מקומות ומציעים תיקונים. כל המלצה ותיקון נבדקים על ידי מנהל לפני שהם עולים לאתר.',
  },
  {
    title: 'מאגרי מידע פתוחים',
    text: 'חלק מהמקומות יובאו מ-OpenStreetMap ומ-Overture Maps. חלק מהתיאורים מבוססים על ויקיפדיה העברית ו-Wikidata, וחלק מהתמונות מוויקישיתוף, עם קרדיט ורישיון לכל תמונה.',
  },
  {
    title: 'בעלי עסקים',
    text: 'בעלי עסקים יכולים לבקש בעלות על הדף של העסק ולעדכן שעות, תמונות ופרטים. כל בקשה נבדקת לפני אישור.',
  },
];

/** schema.org Organization + WebSite, for the home page head. */
export const siteJsonLd = () =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#org`,
        name: SITE_NAME,
        url: `${SITE_ORIGIN}/`,
        logo: `${SITE_ORIGIN}/icon-512.png`,
        email: CONTACT_EMAIL,
        description: ABOUT_SUMMARY,
        areaServed: { '@type': 'Country', name: 'ישראל' },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#site`,
        name: SITE_NAME,
        url: `${SITE_ORIGIN}/`,
        inLanguage: 'he',
        publisher: { '@id': `${SITE_ORIGIN}/#org` },
      },
    ],
  });
