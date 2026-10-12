import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { X, LocateFixed } from 'lucide-react';
import { clusterPlaces } from '@/lib/mapCluster';
import { normalizeCategory } from '@/lib/categories';

const MARKER = {
  carts: { color: '#ea580c', emoji: '☕' },
  food: { color: '#d97706', emoji: '🍽️' },
  nature: { color: '#059669', emoji: '🏞️' },
  nightlife: { color: '#4f46e5', emoji: '🌙' },
  shopping: { color: '#e11d48', emoji: '🛍️' },
  culture: { color: '#7c3aed', emoji: '🎨' },
  attractions: { color: '#0284c7', emoji: '🎢' },
};
const FALLBACK = { color: '#64748b', emoji: '📍' };

const placeIcon = (place) => {
  const { color, emoji } = MARKER[normalizeCategory(place.category)] || FALLBACK;
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:17px">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

const clusterIcon = (count) => {
  const size = count < 10 ? 38 : count < 100 ? 44 : 52;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#16a34a;color:#fff;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font:700 14px Rubik,sans-serif">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const ISRAEL_CENTER = [31.8, 35.0];

/**
 * Full-screen map of the places the home page is currently filtered to.
 * Nearby places are grouped into numbered circles; tapping a place opens its card.
 */
export default function PlacesMap({ places, userLocation, onSelect, onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const placesRef = useRef(places);
  const selectRef = useRef(onSelect);
  const drawRef = useRef(() => {});
  placesRef.current = places;
  selectRef.current = onSelect;

  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: false, center: ISRAEL_CENTER, zoom: 8 });
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;

    const draw = () => {
      layer.clearLayers();
      const bounds = map.getBounds().pad(0.2);
      const visible = placesRef.current.filter((p) => bounds.contains([Number(p.lat), Number(p.lng)]));
      for (const cluster of clusterPlaces(visible, map.getZoom())) {
        if (cluster.items.length === 1) {
          const place = cluster.items[0];
          L.marker([Number(place.lat), Number(place.lng)], { icon: placeIcon(place), title: place.name })
            .on('click', () => selectRef.current(place))
            .addTo(layer);
        } else {
          L.marker([cluster.lat, cluster.lng], { icon: clusterIcon(cluster.items.length), title: `${cluster.items.length} מקומות` })
            .on('click', () => {
              const pts = cluster.items.map((p) => [Number(p.lat), Number(p.lng)]);
              map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 18 });
            })
            .addTo(layer);
        }
      }
    };
    drawRef.current = draw;
    map.on('moveend zoomend', draw);

    const pts = placesRef.current
      .filter((p) => p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
      .map((p) => [Number(p.lat), Number(p.lng)]);
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
    else draw();

    return () => map.remove();
  }, []);

  // the filter changed while the map is open
  useEffect(() => {
    drawRef.current();
  }, [places]);

  // the visitor's own position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return undefined;
    const dot = L.circleMarker([userLocation.lat, userLocation.lng], {
      radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1,
    }).addTo(map);
    return () => dot.remove();
  }, [userLocation]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 z-[35] bg-background" role="dialog" aria-label="מפת מקומות">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <div className="absolute top-3 inset-x-3 z-[1000] flex items-center justify-between gap-2">
        <span className="rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg border border-border">
          {places.length} מקומות
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg border border-border hover:bg-secondary"
          aria-label="סגור מפה"
        >
          <X size={16} /> סגור
        </button>
      </div>
      {userLocation && (
        <button
          type="button"
          onClick={() => mapRef.current?.setView([userLocation.lat, userLocation.lng], 14)}
          className="absolute bottom-4 right-3 z-[1000] rounded-full bg-card p-3 text-primary shadow-lg border border-border hover:bg-secondary"
          aria-label="המיקום שלי"
          title="המיקום שלי"
        >
          <LocateFixed size={20} />
        </button>
      )}
    </div>
  );
}
