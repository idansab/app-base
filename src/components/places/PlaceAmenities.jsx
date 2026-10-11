import React from 'react';
import { getPlaceAmenities } from '@/lib/amenities';

/**
 * What a place offers (accessible, car access, parking). Only known facts are shown:
 * a place without an entry simply has no row, it is never presented as "no".
 *  - default: the full grid with a title, for the place page
 *  - compact: a small row of icons for the place cards
 */
export default function PlaceAmenities({ place, compact = false, className = '' }) {
  const amenities = getPlaceAmenities(place);
  if (amenities.length === 0) return null;

  if (compact) {
    return (
      <ul className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="מאפיינים">
        {amenities.map(({ key, label, icon: Icon }) => (
          <li
            key={key}
            title={label}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground"
          >
            <Icon size={13} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className={`text-right ${className}`} aria-label="מאפייני המקום">
      <h3 className="mb-3 text-sm font-bold text-foreground">מאפייני המקום</h3>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {amenities.map(({ key, label, icon: Icon }) => (
          <li key={key} className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-foreground">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
