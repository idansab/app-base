import React, { useState } from 'react';
import { BadgeCheck, ChevronDown, Clock } from 'lucide-react';
import { getOpenStatus, israelNow, weeklyRows } from '@/lib/openingHours';

const DOT = {
  open: 'bg-green-500',
  always: 'bg-green-500',
  closing_soon: 'bg-amber-500',
  closed: 'bg-slate-400',
};

/** Opening hours block for the details views: live status + optional weekly table. */
export function PlaceHours({ place, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const status = getOpenStatus(place);
  const rows = weeklyRows(place?.opening_schedule);
  const today = israelNow().day;
  const text = place?.opening_hours;

  if (status.state === 'unknown' && !text) return null;

  return (
    <div className={`text-right ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {status.state !== 'unknown' && (
            <p className="flex items-center justify-end gap-2 font-semibold text-foreground">
              <span>{status.label}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${DOT[status.state]}`} aria-hidden="true" />
            </p>
          )}
          {/* Free text is the fallback for places without a structured schedule */}
          {text && (status.state === 'unknown' || place.opening_schedule?.type === 'always') && (
            <p className={status.state === 'unknown' ? 'font-semibold text-foreground' : 'text-sm text-muted-foreground'}>
              {text}
            </p>
          )}
          <p className="text-xs text-muted-foreground">שעות פתיחה</p>
        </div>
        <Clock size={20} className="text-green-600 flex-shrink-0" />
      </div>

      {rows.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-2 flex items-center gap-1 text-sm text-green-700 hover:underline dark:text-green-300"
          >
            <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'הסתר שעות לפי יום' : 'שעות לפי יום'}
          </button>
          {expanded && (
            <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-border bg-card text-sm">
              {rows.map((row) => (
                <li
                  key={row.day}
                  className={`flex justify-between px-3 py-2 ${row.day === today ? 'bg-green-50 font-semibold' : ''}`}
                >
                  <span dir="ltr" className="tabular-nums text-foreground">{row.text}</span>
                  <span className="text-foreground">יום {row.name}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {place?.opening_schedule?.note && (
        <p className="mt-2 text-xs text-muted-foreground">{place.opening_schedule.note}</p>
      )}
    </div>
  );
}

/** Kosher row; silent unless the place is explicitly marked. */
export function PlaceKosher({ place, className = '' }) {
  if (place?.kosher !== 'kosher' && place?.kosher !== 'not_kosher') return null;
  const isKosher = place.kosher === 'kosher';
  return (
    <div className={`flex items-start gap-3 text-right ${className}`}>
      <div className="flex-1">
        <p className="font-semibold text-foreground">{isKosher ? 'כשר' : 'לא כשר'}</p>
        {isKosher && place.kosher_note && <p className="text-sm text-muted-foreground">{place.kosher_note}</p>}
        <p className="text-xs text-muted-foreground">כשרות</p>
      </div>
      <BadgeCheck size={20} className={`flex-shrink-0 ${isKosher ? 'text-sky-600' : 'text-gray-400'}`} />
    </div>
  );
}
