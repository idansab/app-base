// Per-URL SEO for the SPA: Googlebot's first look at each URL is the raw HTML,
// so title / description / canonical / robots / JSON-LD are rewritten here
// instead of relying on client-side JS (which can conflict with the raw HTML).
import { LANDINGS, MIN_LANDING_PLACES, getLanding, landingFilter, landingPath } from '../src/lib/landings.js';
import { ABOUT_SUMMARY, ABOUT_VISION, ABOUT_SOURCES, CONTACT_EMAIL, siteJsonLd } from '../src/lib/siteAbout.js';

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
  // Collection pages (src/lib/collections.js); `image` is a site path used as the link-preview image.
  '/list/springs': {
    title: `5 מעיינות שעוד לא היית בהם | ${SITE_NAME}`,
    description: '5 מעיינות פחות מוכרים מהגולן ועד הנגב, עם ניווט ל-Waze בלחיצה.',
    image: '/og/springs.jpg',
  },
  '/list/winter-streams': {
    title: `3 נחלים שמתעוררים רק בחורף | ${SITE_NAME}`,
    description: 'מפל התנור, מפל סער ונחל צין: מקומות שבאמת שווה לראות אחרי גשם, ואיפה לצפות בשיטפון בבטחה.',
    image: '/og/winter-streams.jpg',
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

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// short_description is often just a label ("מפל · שמורת נחל עיון"); pad it with the full text.
const placeDescription = (place, n) => {
  const short = clip(place.short_description, n);
  const long = clip(place.description, n);
  if (short && long && short.length < 60 && !long.startsWith(short)) return clip(`${short} — ${long}`, n);
  return short || long;
};

// Plain-HTML content inside #root for crawlers that don't run JS (Bing, ChatGPT, Perplexity, Claude).
// React's createRoot replaces it on load; it's visually hidden so users never see it flash.
const FALLBACK_STYLE = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
const fallback = (inner) => `<div style="${FALLBACK_STYLE}">${inner}</div>`;

const NAV_LINKS = [
  ...Object.entries(PAGES)
    .filter(([p]) => p.startsWith('/list/'))
    .map(([p, m]) => [p, m.title.replace(` | ${SITE_NAME}`, '')]),
  ['/discover', 'גלה — סרטונים ורעיונות לטיולים'],
  ['/surprise', 'הפתעה — מקום אקראי באזור'],
  ['/about', 'אודות'],
  ['/for-business', 'לעסקים'],
];

const navHtml = () =>
  `<nav><ul>${NAV_LINKS.map(([p, t]) => `<li><a href="${p}">${esc(t)}</a></li>`).join('')}</ul></nav>`;

const landingLinks = (kind, except) =>
  `<ul>${LANDINGS.filter((l) => l.kind === kind && l !== except)
    .map((l) => `<li><a href="${landingPath(l)}">${esc(l.name)}</a></li>`)
    .join('')}</ul>`;

const landingsNavHtml = (except) =>
  `<h2>לפי עיר ואזור</h2>${landingLinks('city', except)}<h2>לפי סוג מקום</h2>${landingLinks('category', except)}`;

async function loadPlaceList(env, limit = 300) {
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/places?select=id,name,city&status=eq.approved&order=updated_at.desc&limit=${limit}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cf: { cacheTtl: 900, cacheEverything: true } }
    );
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

// Who runs the site and where its places come from, so a crawler or AI assistant can tell what the site is.
const aboutHtml = (heading) =>
  `<h2>${heading}</h2><p>${esc(ABOUT_SUMMARY)}</p><h3>החזון</h3><p>${esc(ABOUT_VISION)}</p>` +
  `<h3>איך נאספו המקומות</h3><ul>${ABOUT_SOURCES.map((s) => `<li><strong>${esc(s.title)}:</strong> ${esc(s.text)}</li>`).join('')}</ul>` +
  `<p>יצירת קשר: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> · <a href="/about">אודות</a></p>`;

function aboutFallback() {
  return fallback(`<h1>אודות ${esc(SITE_NAME)}</h1>${aboutHtml('מי אנחנו')}${navHtml()}`);
}

function homeFallback(meta, places) {
  const items = places
    .map((p) => `<li><a href="/place/${encodeURIComponent(p.id)}">${esc(p.name)}${p.city ? `, ${esc(p.city)}` : ''}</a></li>`)
    .join('');
  return fallback(
    `<h1>${esc(SITE_NAME)} — כל מה שיש באזור</h1><p>${esc(meta.description)}</p>${aboutHtml('מי אנחנו ואיך נאספו המקומות')}` +
      `${navHtml()}${landingsNavHtml()}` +
      (items ? `<h2>מקומות במדריך</h2><ul>${items}</ul>` : '')
  );
}

function placeFallback(place, desc) {
  const cityPage = LANDINGS.find((l) => l.kind === 'city' && l.match.cities.includes(place.city));
  const rows = [
    place.address || place.city ? `<p>כתובת: ${esc([place.address, place.city].filter(Boolean).join(', '))}</p>` : '',
    place.phone ? `<p>טלפון: ${esc(place.phone)}</p>` : '',
  ].join('');
  return fallback(
    `<h1>${esc(place.name)}</h1><p>${esc(clip(place.description || desc, 1200))}</p>${rows}` +
      (cityPage ? `<p><a href="${landingPath(cityPage)}">${esc(cityPage.h1)}</a></p>` : '') +
      `<p><a href="/">כל המקומות ב${esc(SITE_NAME)}</a></p>${navHtml()}`
  );
}

async function loadLandingPlaces(landing, env) {
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!key) return { places: [], lookupFailed: true };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/places?select=id,name,city,short_description&status=eq.approved` +
        `&or=(${encodeURIComponent(landingFilter(landing))})&order=rating.desc.nullslast,name&limit=300`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cf: { cacheTtl: 900, cacheEverything: true } }
    );
    return res.ok ? { places: await res.json(), lookupFailed: false } : { places: [], lookupFailed: true };
  } catch {
    return { places: [], lookupFailed: true };
  }
}

function landingFallback(landing, places) {
  const items = places
    .map((p) => {
      const label = String(p.short_description || '').split(' · ')[0].trim();
      const extra = landing.kind === 'category' ? p.city : label;
      return `<li><a href="/place/${encodeURIComponent(p.id)}">${esc(p.name)}</a>${extra ? ` — ${esc(extra)}` : ''}</li>`;
    })
    .join('');
  return fallback(
    `<h1>${esc(landing.h1)}</h1><p>${esc(landing.intro)}</p>` +
      (items ? `<h2>${places.length} מקומות במדריך</h2><ul>${items}</ul>` : '') +
      landingsNavHtml(landing) +
      `<p><a href="/">כל המקומות ב${esc(SITE_NAME)}</a></p>${navHtml()}`
  );
}

function landingJsonLd(landing, places, url, origin) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: landing.h1,
    description: landing.description,
    url,
    inLanguage: 'he',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: places.length,
      itemListElement: places.slice(0, 50).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${origin}/place/${encodeURIComponent(p.id)}`,
        name: p.name,
      })),
    },
  };
  return JSON.stringify(ld).replace(/</g, '\\u003c');
}

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

// The site moved to its own domain: send the old pages.dev address (and www) there (301) so
// shared links and search rankings follow and there is one canonical host. Only the production host — preview deploys
// (<hash>.app-base-420.pages.dev) stay reachable, and so does the Search Console file.
const OLD_HOST = 'app-base-420.pages.dev';
const SITE_ORIGIN = 'https://mayeshpo.top';

export async function onRequest(context) {
  const reqUrl = new URL(context.request.url);
  const movedHost = reqUrl.hostname === OLD_HOST || reqUrl.hostname === 'www.mayeshpo.top';
  if (movedHost && !/^\/google[0-9a-f]+\.html$/.test(reqUrl.pathname)) {
    return Response.redirect(SITE_ORIGIN + reqUrl.pathname + reqUrl.search, 301);
  }
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
  let ogImage = meta?.image ? url.origin + meta.image : null;
  let rootHtml = null;

  if (path === '/') rootHtml = homeFallback(meta, await loadPlaceList(env));
  if (path === '/about') rootHtml = aboutFallback();

  const placeMatch = path.match(/^\/place\/([^/]+)$/);
  const landingMatch = path.match(/^\/(city|category)\/([^/]+)$/);
  const landing = landingMatch && getLanding(landingMatch[1], decodeURIComponent(landingMatch[2]));
  if (landing) {
    const { places, lookupFailed } = await loadLandingPlaces(landing, env);
    meta = { title: `${landing.title} | ${SITE_NAME}`, description: landing.description };
    if (!lookupFailed && places.length < MIN_LANDING_PLACES) {
      // Thin page (too few places): don't let it be indexed.
      status = 404;
      noindex = true;
    } else if (places.length) {
      rootHtml = landingFallback(landing, places);
      ldJson = landingJsonLd(landing, places, canonical, url.origin);
    } else {
      rootHtml = landingFallback(landing, places);
    }
  } else if (placeMatch) {
    const { place, lookupFailed } = await loadPlace(decodeURIComponent(placeMatch[1]), env);
    if (place) {
      const where = [place.city, place.address].filter(Boolean).join(', ');
      const desc = placeDescription(place, 155) || `${place.name} — ${where}`;
      meta = {
        // Comma, not "ב" + city: "בהגליל העליון" is wrong Hebrew, and the prefix can't be fixed generically.
        title: `${place.name}${place.city ? `, ${place.city}` : ''} | ${SITE_NAME}`,
        description: desc,
      };
      ogImage = /^https?:\/\//.test(place.image_url || '') ? place.image_url : null;
      ldJson = placeJsonLd(place, canonical, ogImage);
      rootHtml = placeFallback(place, desc);
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
  // the home page names the organization behind the site (replaces the plain WebSite block in index.html)
  if (path === '/') {
    rewriter = rewriter.on('script[type="application/ld+json"]', { element: (e) => e.setInnerContent(siteJsonLd()) });
  }
  if (rootHtml) rewriter = rewriter.on('div#root', { element: (e) => e.setInnerContent(rootHtml, { html: true }) });
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
