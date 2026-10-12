const TILE = 256;

/** Web-mercator pixel position of a point at a zoom level. */
export function project(lat, lng, zoom) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

/**
 * Groups nearby places into clusters for a zoom level: points that fall in the same
 * `cellPx` square of the screen become one cluster. Places without usable coordinates
 * are dropped. Returns [{ lat, lng, items }] with the centre of each group.
 */
export function clusterPlaces(places, zoom, cellPx = 56) {
  const cells = new Map();
  for (const place of places) {
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    if (place.lat == null || place.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const { x, y } = project(lat, lng, zoom);
    const key = `${Math.floor(x / cellPx)}:${Math.floor(y / cellPx)}`;
    const cell = cells.get(key);
    if (cell) {
      cell.items.push(place);
      cell.latSum += lat;
      cell.lngSum += lng;
    } else {
      cells.set(key, { items: [place], latSum: lat, lngSum: lng });
    }
  }
  return [...cells.values()].map((c) => ({
    lat: c.latSum / c.items.length,
    lng: c.lngSum / c.items.length,
    items: c.items,
  }));
}
