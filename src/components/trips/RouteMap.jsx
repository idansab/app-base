import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const stopIcon = (number) =>
  L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:#16a34a;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font:700 13px Rubik,sans-serif">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

/** The stops of a trip on a map: numbered markers joined by a line (straight lines, not roads). */
export default function RouteMap({ stops, className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const points = stops.filter((s) => Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)));
    if (!container || points.length === 0) return undefined;

    const map = L.map(container, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    const latLngs = points.map((p) => [Number(p.lat), Number(p.lng)]);
    points.forEach((place, index) => {
      const popup = document.createElement('strong');
      popup.textContent = `${index + 1}. ${place.name}`;
      L.marker(latLngs[index], { icon: stopIcon(index + 1) }).bindPopup(popup).addTo(map);
    });
    if (latLngs.length > 1) L.polyline(latLngs, { color: '#16a34a', weight: 3, opacity: 0.7, dashArray: '6 6' }).addTo(map);
    map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 15 });

    return () => map.remove();
  }, [stops]);

  return <div ref={containerRef} className={`w-full rounded-xl border border-border bg-muted ${className}`} style={{ minHeight: 320 }} />;
}
