import React, { useMemo, useState } from 'react';
import { Crosshair, Loader2, Plus, Search } from 'lucide-react';
import { getCategory } from '@/lib/categories';
import { formatDistance } from '@/lib/geo';
import { nearbyPlaces, searchPlaces } from '@/lib/tripUtils';

const TABS = [
  ['near', 'קרובים'],
  ['search', 'חיפוש'],
  ['fav', 'המועדפים שלי'],
];

function Row({ place, km, full, onAdd }) {
  const category = getCategory(place.category);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={() => onAdd(place.id)}
        disabled={full}
        aria-label={`הוסף את ${place.name} למסלול`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <Plus size={18} aria-hidden="true" />
      </button>
      <span className="min-w-0 flex-1 text-right">
        <span className="block truncate text-sm font-medium text-foreground">{place.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {category.label}
          {place.city ? ` · ${place.city}` : ''}
        </span>
      </span>
      {km != null && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDistance(km)}</span>}
    </li>
  );
}

/**
 * Where the stops come from. Any approved place can be added: you do not need to have it in your favorites.
 *  - nearby: closest to the last stop of the trip, or to you while the trip is still empty
 *  - search: by name, city or tag
 *  - favorites: the places you saved
 */
export default function StopPicker({ places, favoriteIds, selectedIds, userLocation, onRequestLocation, onAdd, full }) {
  const [tab, setTab] = useState('near');
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);

  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const lastStop = selectedIds.length > 0 ? byId.get(selectedIds[selectedIds.length - 1]) : null;
  const origin = lastStop || userLocation;

  const near = useMemo(() => nearbyPlaces(places, origin, { exclude: selectedIds, limit: 12 }), [places, origin, selectedIds]);
  const found = useMemo(() => searchPlaces(places, query, { exclude: selectedIds, limit: 12 }), [places, query, selectedIds]);
  const favorites = useMemo(
    () => places.filter((p) => favoriteIds.has(p.id) && !selectedIds.includes(p.id)),
    [places, favoriteIds, selectedIds]
  );

  const locate = async () => {
    setLocating(true);
    await onRequestLocation();
    setLocating(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="mb-2 flex gap-1.5" role="tablist" aria-label="איך לבחור תחנות">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              tab === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'near' && (
        <div>
          {origin ? (
            <>
              <p className="mb-1 text-xs text-muted-foreground">
                {lastStop ? `קרוב ל"${lastStop.name}", התחנה האחרונה שלך` : 'קרוב אליך'}
              </p>
              <ul className="divide-y divide-border">
                {near.map(({ place, km }) => (
                  <Row key={place.id} place={place} km={km} full={full} onAdd={onAdd} />
                ))}
              </ul>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="mb-3 text-sm text-muted-foreground">כדי להראות מקומות קרובים צריך לדעת איפה אתה נמצא.</p>
              <button
                type="button"
                onClick={locate}
                disabled={locating}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
                השתמש במיקום שלי
              </button>
              <p className="mt-3 text-xs text-muted-foreground">או חפש מקום בלשונית "חיפוש", או הוסף מקום ראשון והקרובים אליו יופיעו כאן.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'search' && (
        <div>
          <div className="relative mb-2">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="שם מקום, עיר או סוג"
              aria-label="חיפוש מקום להוספה"
              className="w-full rounded-xl border border-border bg-card py-2.5 pr-9 pl-3 text-right text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {query.trim() === '' ? (
            <p className="py-3 text-center text-xs text-muted-foreground">כתוב כמה אותיות מהשם או מהעיר.</p>
          ) : found.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">לא נמצאו מקומות.</p>
          ) : (
            <ul className="divide-y divide-border">
              {found.map((place) => (
                <Row key={place.id} place={place} full={full} onAdd={onAdd} />
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'fav' && (
        <div>
          {favorites.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {favoriteIds.size === 0 ? 'אין עדיין מקומות במועדפים. אפשר להוסיף גם בלי.' : 'כל המועדפים שלך כבר במסלול.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {favorites.map((place) => (
                <Row key={place.id} place={place} full={full} onAdd={onAdd} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
