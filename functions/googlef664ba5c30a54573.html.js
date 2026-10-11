// Google Search Console verification. Served by a function so the exact .html URL
// answers 200 (Pages would otherwise 308-redirect static .html files to the bare path).
export function onRequestGet() {
  return new Response('google-site-verification: googlef664ba5c30a54573.html', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
