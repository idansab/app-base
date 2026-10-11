import React from 'react';
import { AMENITIES, cleanAmenities } from '@/lib/amenities';

/** Checkboxes for the amenities of a place (admin, owner and visitor-suggestion forms). */
export default function AmenitiesField({ value, onChange, label = 'מאפיינים (סמן רק מה שידוע לך בוודאות)' }) {
  const selected = new Set(cleanAmenities(value));
  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(cleanAmenities([...next]));
  };

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-foreground mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {AMENITIES.map(({ key, label: text, icon: Icon }) => {
          const on = selected.has(key);
          return (
            <label
              key={key}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
                on ? 'border-green-600 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200' : 'border-border bg-card text-foreground hover:bg-secondary'
              }`}
            >
              <input type="checkbox" className="h-4 w-4" checked={on} onChange={() => toggle(key)} />
              <Icon size={16} aria-hidden="true" />
              {text}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
