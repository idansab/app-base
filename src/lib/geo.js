export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} מ׳`;
  if (km < 10) return `${km.toFixed(1)} ק״מ`;
  return `${Math.round(km)} ק״מ`;
}

export const wazeUrl = (lat, lng) => `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`;

export const googleMapsUrl = (lat, lng) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/**
 * Resolves a free-text address (e.g. "הרצל 10, נתניה") into coordinates
 * using the OpenStreetMap Nominatim service. Returns null when nothing matched.
 */
export async function geocodeAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=he&q=${encodeURIComponent(
    query
  )}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return null;
  return {
    lat: Number.parseFloat(results[0].lat),
    lng: Number.parseFloat(results[0].lon),
    label: results[0].display_name,
  };
}

/**
 * The city (or town / village) from a Nominatim `address` object. City level only:
 * no street, house number or neighbourhood is shown or kept.
 */
export function formatPlaceName(address) {
  if (!address) return "";
  return address.city || address.town || address.village || address.municipality || address.county || "";
}

/** Street + house number from a Nominatim `address` object ("" when there is no street). */
export function formatStreetAddress(address) {
  if (!address) return "";
  const street = address.road || address.pedestrian || address.footway || "";
  return street ? [street, address.house_number].filter(Boolean).join(" ") : "";
}

/**
 * Full address of a point, for the add-a-place form: { city, address } where address is
 * street + house number (empty when the point has no street). Null when it cannot be resolved.
 */
export async function reverseGeocodeAddress(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=he&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const data = await response.json();
    return { city: formatPlaceName(data?.address), address: formatStreetAddress(data?.address) };
  } catch {
    return null;
  }
}

const reverseCache = new Map();

/**
 * Which city are these coordinates in? Uses OpenStreetMap Nominatim at city level (zoom 10).
 * Returns a name such as "תל אביב - יפו", or null when it cannot be resolved.
 * Results are cached per ~100 m so moving the map does not repeat the request.
 */
export async function reverseGeocode(lat, lng, { signal } = {}) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (reverseCache.has(key)) return reverseCache.get(key);
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&accept-language=he&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
    if (!response.ok) return null;
    const data = await response.json();
    const name = formatPlaceName(data?.address);
    if (name) reverseCache.set(key, name);
    return name || null;
  } catch {
    return null;
  }
}
