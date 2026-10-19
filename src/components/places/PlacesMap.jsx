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

// names are user-contributed: never put them into HTML unescaped
const escapeHtml = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// from this zoom on, a place shows its name under the marker
const LABEL_ZOOM = 14;

const placeIcon = (place, showLabel) => {
  const { color, emoji } = MARKER[normalizeCategory(place.category)] || FALLBACK;
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:17px">${emoji}</div>${
      showLabel
        ? `<div style="position:absolute;top:38px;left:50%;transform:translateX(-50%);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:600 12px Rubik,sans-serif;color:#0f172a;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;pointer-events:none">${escapeHtml(place.name)}</div>`
        : ''
    }`,
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
export default function PlacesMap({
  places,
  userLocation,
  categories = [],
  selectedCategory = 'all',
  categoryCounts = {},
  onCategoryChange,
  onSelect,
  onClose,
}) {
  const containerRef = useRef(null);
  const categoryRef = useRef(selectedCategory);
  const chipsRef = useRef(null);
  const mapRef = useRef(null);
  const placesRef = useRef(places);
  const selectRef = useRef(onSelect);
  const drawRef = useRef(() => {});
  placesRef.current = places;
  selectRef.current = onSelect;

  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: false, center: ISRAEL_CENTER, zoom: 8 });
    // bottom-right, lifted above the "my location" button
    const zoomControl = L.control.zoom({ position: 'bottomright' }).addTo(map);
    zoomControl.getContainer().style.marginBottom = '76px';
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
          L.marker([Number(place.lat), Number(place.lng)], { icon: placeIcon(place, map.getZoom() >= LABEL_ZOOM), title: place.name })
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
    const map = mapRef.current;
    const categoryChanged = categoryRef.current !== selectedCategory;
    categoryRef.current = selectedCategory;
    // a new category with nothing in view: move to where its places are instead of showing an empty map
    if (map && categoryChanged) {
      const bounds = map.getBounds();
      const pts = places
        .filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
        .map((p) => [Number(p.lat), Number(p.lng)]);
      if (pts.length && !pts.some((pt) => bounds.contains(pt))) {
        map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
        return; // fitBounds fires moveend, which redraws
      }
    }
    drawRef.current();
  }, [places, selectedCategory]);

  // keep the picked category chip visible in the scrolling row
  useEffect(() => {
    chipsRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedCategory]);

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
      {onCategoryChange && categories.length > 0 && (
        <div ref={chipsRef} className="absolute top-[3.75rem] inset-x-0 z-[1000] overflow-x-auto no-scrollbar" role="group" aria-label="קטגוריות במפה">
          <div className="flex w-max gap-2 px-3 pb-1">
            {categories
              // a category with nothing to show here is hidden, unless it is the one picked
              .filter((cat) => cat.id === 'all' || cat.id === selectedCategory || categoryCounts[cat.id] > 0)
              .map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onCategoryChange(cat.id)}
                    aria-pressed={active}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium shadow-md transition-colors ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:bg-secondary'
                    }`}
                  >
                    <span aria-hidden="true">{cat.emoji}</span>
                    {cat.label}
                    <span className={`text-xs ${active ? 'opacity-90' : 'text-muted-foreground'}`}>
                      {categoryCounts[cat.id] || 0}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}
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
