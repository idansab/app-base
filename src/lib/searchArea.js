import { haversineKm } from '@/lib/geo';

const KEY = 'mayhishpo:search-area';

/** Remembers the area the visitor chose on the home page (centre + radius) for this session. */
export function saveSearchArea(center, km) {
  try {
    if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng) || !(km > 0)) return;
    sessionStorage.setItem(KEY, JSON.stringify({ lat: center.lat, lng: center.lng, km }));
  } catch {
    // storage can be blocked: the area just is not remembered
  }
}

/** The remembered area as { lat, lng, km }, or null. */
export function loadSearchArea() {
  try {
    const area = JSON.parse(sessionStorage.getItem(KEY));
    if (Number.isFinite(area?.lat) && Number.isFinite(area?.lng) && area?.km > 0) return area;
  } catch {
    // nothing stored, or unreadable
  }
  return null;
}

/** Only the places inside the area; everything when there is no area. */
export function placesInArea(places, area) {
  if (!area) return places;
  return places.filter((p) => {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    return p.lat != null && p.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && haversineKm(area.lat, area.lng, lat, lng) <= area.km;
  });
}
