// Per-URL SEO for the SPA: Googlebot's first look at each URL is the raw HTML,
// so title / description / canonical / robots / JSON-LD are rewritten here
// instead of relying on client-side JS (which can conflict with the raw HTML).
const SUPABASE_URL = 'https://gsbbtrknnkdihdlojwbd.supabase.co';
const SITE_NAME = 'מה יש פה';

const PAGES = {
  '/': {
    title: 'מה יש פה — מדריך מקומות באזור: עגלות קפה, מעיינות ומסלולי הליכה',
    description: 'מה יש פה — כל מה שיש באזור: עגלות קפה, מעיינות, מסלולי הליכה, תרבות ובילוי, עם טיפים מהקהילה וניווט בלחיצה ל-Waze.',
  },
  '/about': {
    title: `אודות | ${SITE_NAME}`,
    description: 'מי אנחנו ואיך מקומות נבדקים ומאושרים במדריך "מה יש פה".',
  },
  '/for-business': {
    title: `לעסקים — הוספת העסק שלך למדריך | ${SITE_NAME}`,
    description: 'בעלי עסקים: הוסיפו את העסק שלכם למדריך המקומי "מה יש פה" ותנו ללקוחות לגלות אתכם.',
  },
  '/surprise': {
    title: `הפתעה — מקום אקראי באזור | ${SITE_NAME}`,
    description: 'לא יודעים לאן ללכת? תנו ל"מה יש פה" להפתיע אתכם במקום אקראי באזור.',
  },
  '/discover': {
    title: `גלה — סרטונים ורעיונות לטיולים | ${SITE_NAME}`,
    description: 'סרטוני תדמית ורעיונות לסופ"ש, אזורים ומקומות מומלצים מתוך "מה יש פה".',
  },
  '/accessibility': { title: `הצהרת נגישות | ${SITE_NAME}`, description: 'הצהרת הנגישות של "מה יש פה".' },
  '/privacy': { title: `מדיניות פרטיות | ${SITE_NAME}`, description: 'מדיניות הפרטיות של "מה יש פה".' },
  '/terms': { title: `תנאי שימוש | ${SITE_NAME}`, description: 'תנאי השימוש של "מה יש פה".' },
  '/cookies': { title: `מדיניות עוגיות | ${SITE_NAME}`, description: 'מדיניות העוגיות של "מה יש פה".' },
};

// Real pages that should never appear in search results (mirrors robots.txt).
const PRIVATE_PREFIXES = [
  '/admin', '/admin-login', '/login', '/register', '/signup', '/forgot-password', '/reset-password',
  '/favorites', '/trips', '/settings', '/my-business', '/community-chat', '/studio', '/contribute',
];

const isPrivate = (path) => PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));

const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
};

async function loadPlace(id, env) {
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!key || !/^[\w-]{1,64}$/.test(id)) return { place: null, lookupFailed: !key };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/places?select=id,name,description,short_description,city,address,lat,lng,image_url,phone&status=eq.approved&id=eq.${encodeURIComponent(id)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cf: { cacheTtl: 300, cacheEverything: true } }
    );
    if (!res.ok) return { place: null, lookupFailed: true };
    const rows = await res.json();
    return { place: rows[0] || null, lookupFailed: false };
  } catch {
    return { place: null, lookupFailed: true };
  }
}

function placeJsonLd(place, url, image) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: place.name,
    url,
    address: { '@type': 'PostalAddress', streetAddress: place.address, addressLocality: place.city || undefined, addressCountry: 'IL' },
  };
  if (place.description || place.short_description) ld.description = clip(place.description || place.short_description, 300);
  if (place.lat != null && place.lng != null) ld.geo = { '@type': 'GeoCoordinates', latitude: Number(place.lat), longitude: Number(place.lng) };
  if (place.phone) ld.telephone = place.phone;
  if (image) ld.image = image;
  return JSON.stringify(ld).replace(/</g, '\\u003c');
}

export async function onRequest(context) {
  // SEO rewriting must never take the site down: on any error serve the original page.
  const original = context.request.method === 'GET' ? context.request.clone() : context.request;
  try {
    return await rewrite(context);
  } catch {
    return context.env.ASSETS.fetch(original);
  }
}

async function rewrite({ request, next, env }) {
  const response = await next();
  const url = new URL(request.url);
  const type = response.headers.get('content-type') || '';
  if (request.method !== 'GET' || !type.includes('text/html')) return response;

  if (/^\/google[0-9a-f]+\.html$/.test(url.pathname)) return response; // Search Console verification file

  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/';
  const canonical = url.origin + (path === '/' ? '/' : path);

  let status = response.status;
  let meta = PAGES[path];
  let noindex = isPrivate(path);
  let ldJson = null;
  let ogImage = null;

  const placeMatch = path.match(/^\/place\/([^/]+)$/);
  if (placeMatch) {
    const { place, lookupFailed } = await loadPlace(decodeURIComponent(placeMatch[1]), env);
    if (place) {
      const where = [place.city, place.address].filter(Boolean).join(', ');
      const desc = clip(place.short_description || place.description, 155) || `${place.name} — ${where}`;
      meta = {
        title: `${place.name}${place.city ? ` ב${place.city}` : ''} | ${SITE_NAME}`,
        description: desc,
      };
      ogImage = /^https?:\/\//.test(place.image_url || '') ? place.image_url : null;
      ldJson = placeJsonLd(place, canonical, ogImage);
    } else if (!lookupFailed) {
      status = 404;
      noindex = true;
    }
  } else if (!meta && !noindex) {
    // Not a known route: real 404 status (the SPA still renders its own 404 page).
    status = 404;
    noindex = true;
  }

  const headers = new Headers(response.headers);
  if (noindex) headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (status === 404) headers.set('Cache-Control', 'no-store');

  const setContent = (v) => ({ element: (e) => e.setAttribute('content', v) });
  let rewriter = new HTMLRewriter()
    .on('link[rel="canonical"]', { element: (e) => e.setAttribute('href', canonical) })
    .on('meta[property="og:url"]', setContent(canonical));

  if (meta) {
    rewriter = rewriter
      .on('title', { element: (e) => e.setInnerContent(meta.title) })
      .on('meta[name="description"]', setContent(meta.description))
      .on('meta[property="og:title"]', setContent(meta.title))
      .on('meta[property="og:description"]', setContent(meta.description));
  }
  if (ogImage) {
    rewriter = rewriter
      .on('meta[property="og:image"]', setContent(ogImage))
      .on('meta[name="twitter:card"]', setContent('summary_large_image'));
  }
  if (noindex || ldJson) {
    rewriter = rewriter.on('head', {
      element: (e) => {
        if (noindex) e.append('<meta name="robots" content="noindex, nofollow">', { html: true });
        if (ldJson) e.append(`<script type="application/ld+json">${ldJson}</script>`, { html: true });
      },
    });
  }

  return rewriter.transform(new Response(response.body, { status, statusText: response.statusText, headers }));
}
