const PLACES_KEY = "mayhishpo:places:v1";

export function savePlacesCache(places) {
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify({ savedAt: Date.now(), places }));
  } catch (error) {
    // Storage may be full or unavailable — caching is best effort only.
  }
}

export function loadPlacesCache() {
  try {
    const raw = localStorage.getItem(PLACES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.places) || parsed.places.length === 0) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}
