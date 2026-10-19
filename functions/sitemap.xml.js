import { LANDINGS, MIN_LANDING_PLACES, landingMatches, landingPath } from '../src/lib/landings.js';

const SUPABASE_URL = 'https://gsbbtrknnkdihdlojwbd.supabase.co';

const STATIC_PATHS = ['/', '/about', '/for-business', '/surprise', '/list/springs', '/list/winter-streams', '/discover', '/accessibility', '/privacy', '/terms'];

// PostgREST caps each response at 1000 rows, so page through with Range.
async function loadAllPlaces(key, pageSize = 1000) {
  const all = [];
  for (let from = 0; from < 20000; from += pageSize) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/places?select=id,updated_at,city,category,tags,short_description&status=eq.approved&order=id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + pageSize - 1}` } }
    );
    if (!res.ok) break;
    const rows = await res.json();
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const urls = STATIC_PATHS.map((p) => ({ loc: origin + p }));

  if (key) {
    const places = await loadAllPlaces(key);
    // City / category pages only when they have enough places (the middleware 404s thin ones).
    for (const l of LANDINGS) {
      const matched = places.filter((p) => landingMatches(l, p));
      if (matched.length < MIN_LANDING_PLACES) continue;
      const lastmod = matched.reduce((m, p) => (p.updated_at > m ? p.updated_at : m), '').slice(0, 10);
      urls.push({ loc: origin + landingPath(l), lastmod: lastmod || undefined });
    }
    for (const p of places) {
      urls.push({ loc: `${origin}/place/${encodeURIComponent(p.id)}`, lastmod: p.updated_at?.slice(0, 10) });
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
