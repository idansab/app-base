import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { WATER_SAFETY_TEXT, isWaterPlace } from '@/lib/safetyNotes';

/** Visible safety reminder for springs, streams and beaches. Renders nothing for other places. */
export default function WaterSafetyNote({ place, className = '' }) {
  if (!isWaterPlace(place)) return null;
  return (
    <div
      role="note"
      className={`flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-right text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
    >
      <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>{WATER_SAFETY_TEXT}</p>
    </div>
  );
}
