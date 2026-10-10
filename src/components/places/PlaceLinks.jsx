import React from 'react';
import { Globe, Instagram, Facebook } from 'lucide-react';

const LINKS = [
  ['website', 'אתר העסק', Globe],
  ['instagram', 'אינסטגרם', Instagram],
  ['facebook', 'פייסבוק', Facebook],
];

/** Website and social links of a place (only http/https links are ever rendered). */
export default function PlaceLinks({ place, className = '' }) {
  const items = LINKS.filter(([key]) => /^https?:\/\//.test(place?.[key] || ''));
  if (items.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-2 justify-end ${className}`}>
      {items.map(([key, label, Icon]) => (
        <a
          key={key}
          href={place[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </a>
      ))}
    </div>
  );
}
