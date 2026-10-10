const SUPABASE_URL = 'https://gsbbtrknnkdihdlojwbd.supabase.co';

const STATIC_PATHS = ['/', '/about', '/for-business', '/surprise', '/accessibility', '/privacy', '/terms'];

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const urls = STATIC_PATHS.map((p) => ({ loc: origin + p }));

  if (key) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/places?select=id,updated_at&status=eq.approved&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (res.ok) {
      for (const p of await res.json()) {
        urls.push({ loc: `${origin}/place/${encodeURIComponent(p.id)}`, lastmod: p.updated_at?.slice(0, 10) });
      }
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
