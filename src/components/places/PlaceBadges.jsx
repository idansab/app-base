import React from 'react';
import { BadgeCheck, Clock } from 'lucide-react';
import { getOpenStatus } from '@/lib/openingHours';

const OPEN_TONES = {
  open: 'bg-green-600 text-white',
  always: 'bg-green-600 text-white',
  closing_soon: 'bg-amber-500 text-white',
  closed: 'bg-slate-600/90 text-white',
};

/** "Open now" style badge. Renders nothing when the hours are unknown. */
export function OpenBadge({ place, now, className = '' }) {
  const status = getOpenStatus(place, now);
  if (status.state === 'unknown') return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${OPEN_TONES[status.state]} ${className}`}
      title={status.label}
    >
      <Clock size={12} aria-hidden="true" />
      {status.short}
    </span>
  );
}

/** Only shown for places marked kosher; "not kosher" and "unknown" stay silent on cards. */
export function KosherBadge({ place, className = '' }) {
  if (place?.kosher !== 'kosher') return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm ${className}`}
      title={place.kosher_note || 'כשר'}
    >
      <BadgeCheck size={12} aria-hidden="true" />
      כשר
    </span>
  );
}
