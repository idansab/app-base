// Google Analytics 4, loaded only after the visitor accepts analytics and only when
// VITE_GA_MEASUREMENT_ID is set (G-XXXXXXXXXX). Choice is kept in localStorage.
// public measurement ID (not a secret); VITE_GA_MEASUREMENT_ID overrides it
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-SFJ6QZPZ43';
const CONSENT_KEY = 'analytics_consent';

export const analyticsEnabled = Boolean(GA_ID);

export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY); // 'granted' | 'denied' | null
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch { /* storage blocked: choice applies for this visit only */ }
  if (value === 'granted') loadAnalytics();
  else disableAnalytics();
}

let loaded = false;

export function loadAnalytics() {
  if (!GA_ID || loaded || typeof document === 'undefined') return;
  loaded = true;
  window[`ga-disable-${GA_ID}`] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // page views are sent manually on route change (SPA)
  window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  trackPageView(window.location.pathname + window.location.search);
}

function disableAnalytics() {
  if (GA_ID) window[`ga-disable-${GA_ID}`] = true;
}

export function trackPageView(path) {
  if (!loaded || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href });
}

/** Custom GA4 event. No-op until the visitor consented. Never pass personal data in params. */
export function trackEvent(name, params = {}) {
  if (!loaded || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

if (getConsent() === 'granted') loadAnalytics();
