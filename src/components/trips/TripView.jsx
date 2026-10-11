import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Copy, Eye, EyeOff, Flag, Loader2, MapPin, Navigation, Pencil, Trash2 } from 'lucide-react';
import RouteMap from '@/components/trips/RouteMap';
import TripShare from '@/components/trips/TripShare';
import { getCategory } from '@/lib/categories';
import { wazeUrl } from '@/lib/geo';
import { estimateHours, routeKm } from '@/lib/tripUtils';
import {
  deleteTrip,
  duplicateTrip,
  removeTripBookmark,
  reportTrip,
  saveTripBookmark,
  setTripPublished,
  tripErrorMessage,
} from '@/lib/tripsApi';
import { useAuth } from '@/lib/AuthContext';

const btn =
  'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50';

/**
 * One trip: map, stops, sharing, and what you can do with it.
 *   your own trip: edit, publish / unpublish, delete
 *   somebody else's published trip: save (bookmark), save and edit (a private copy), report
 */
export default function TripView({ trip, stops, onChanged, onDeleted, onEdit, onOpenPlace }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', error: false });
  const [publishing, setPublishing] = useState(false);
  const [authorName, setAuthorName] = useState(trip.author_name || '');
  const [saved, setSaved] = useState(Boolean(trip.saved_by_me));
  const [saves, setSaves] = useState(Number(trip.saves_count) || 0);

  const km = useMemo(() => routeKm(stops), [stops]);
  const hours = trip.duration_hours || estimateHours(stops.length, km);
  const isPublic = Boolean(trip.is_public);

  const needLogin = () => {
    navigate('/login', { state: { from: location } });
  };

  const run = async (action, done) => {
    setBusy(true);
    setMessage({ text: '', error: false });
    try {
      await action();
      done?.();
    } catch (e) {
      console.error('Trip action failed:', e);
      setMessage({ text: tripErrorMessage(e), error: true });
    } finally {
      setBusy(false);
    }
  };

  const toggleSave = () => {
    if (!isAuthenticated) return needLogin();
    return run(
      () => (saved ? removeTripBookmark(user.id, trip.id) : saveTripBookmark(user.id, trip.id)),
      () => {
        setSaves((n) => Math.max(0, n + (saved ? -1 : 1)));
        setSaved(!saved);
        onChanged?.({ ...trip, saved_by_me: !saved });
      }
    );
  };

  const copyToMine = () => {
    if (!isAuthenticated) return needLogin();
    return run(
      () => duplicateTrip(user.id, trip).then((copy) => onEdit?.(copy)),
    );
  };

  const publish = () =>
    run(
      () => setTripPublished(trip.id, true, authorName).then((next) => onChanged?.({ ...trip, ...next })),
      () => setPublishing(false)
    );

  const unpublish = () => run(() => setTripPublished(trip.id, false).then((next) => onChanged?.({ ...trip, ...next })));

  const remove = () => {
    if (!window.confirm('למחוק את המסלול לצמיתות?')) return;
    run(() => deleteTrip(trip.id), () => onDeleted?.());
  };

  const report = () => {
    const reason = window.prompt('מה לא בסדר במסלול הזה?');
    if (!reason || reason.trim().length < 3) return;
    run(() => reportTrip(trip.id, `${trip.title}: ${reason.trim()}`), () => setMessage({ text: 'תודה, הדיווח התקבל.', error: false }));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 text-right">
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
          {trip.owned && (
            <span className={`rounded-full px-2.5 py-1 font-medium ${isPublic ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-secondary text-secondary-foreground'}`}>
              {isPublic ? 'משותף עם הקהילה' : 'פרטי'}
            </span>
          )}
          {!trip.owned && trip.author_name && <span>מאת {trip.author_name}</span>}
        </div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{trip.title}</h1>
        {trip.description && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{trip.description}</p>}
        <p className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{stops.length} תחנות</span>
          {stops.length > 1 && <span>כ-{Math.round(km)} ק״מ</span>}
          <span>כ-{hours} שעות</span>
          {!trip.owned && saves > 0 && <span>{saves} שמרו</span>}
        </p>
      </div>

      {message.text && (
        <p role={message.error ? 'alert' : 'status'} className={`text-right text-sm ${message.error ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>
          {message.text}
        </p>
      )}

      {isPublic && <TripShare trip={trip} stopNames={stops.map((s) => s.name)} km={km} />}

      <div className="flex flex-wrap gap-2">
        {trip.owned ? (
          <>
            <button type="button" className={btn} onClick={() => onEdit?.(trip)}>
              <Pencil size={16} /> ערוך
            </button>
            {isPublic ? (
              <button type="button" className={btn} onClick={unpublish} disabled={busy}>
                <EyeOff size={16} /> הסר מהקהילה
              </button>
            ) : (
              <button type="button" className={btn} onClick={() => setPublishing((v) => !v)} disabled={busy}>
                <Eye size={16} /> שתף עם הקהילה
              </button>
            )}
            <button type="button" className={`${btn} text-red-600`} onClick={remove} disabled={busy}>
              <Trash2 size={16} /> מחק
            </button>
          </>
        ) : (
          <>
            <button type="button" className={btn} onClick={toggleSave} disabled={busy}>
              {saved ? <BookmarkCheck size={16} className="text-primary" /> : <Bookmark size={16} />}
              {saved ? 'שמור אצלך' : 'שמור'}
            </button>
            <button type="button" className={btn} onClick={copyToMine} disabled={busy}>
              <Copy size={16} /> שכפל ועדכן
            </button>
            <button type="button" className={`${btn} text-muted-foreground`} onClick={report} disabled={busy}>
              <Flag size={16} /> דווח
            </button>
          </>
        )}
        {busy && <Loader2 size={18} className="mt-2.5 animate-spin text-muted-foreground" />}
      </div>

      {publishing && !isPublic && (
        <div className="space-y-2 rounded-xl border border-border p-3 text-right">
          <input
            value={authorName}
            maxLength={40}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="השם שיוצג (אופציונלי)"
            aria-label="השם שיוצג"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-right text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="button" onClick={publish} disabled={busy} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            פרסם
          </button>
        </div>
      )}

      {stops.length > 0 && <RouteMap stops={stops} />}

      <ol className="space-y-2">
        {stops.map((place, index) => (
          <li key={place.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
            <button type="button" onClick={() => onOpenPlace?.(place)} className="min-w-0 flex-1 text-right">
              <span className="block truncate font-medium text-foreground">{place.name}</span>
              <span className="flex items-center justify-end gap-1 truncate text-xs text-muted-foreground">
                {getCategory(place.category).label}
                {place.city ? ` · ${place.city}` : ''}
                <MapPin size={12} aria-hidden="true" />
              </span>
            </button>
            <a
              href={wazeUrl(place.lat, place.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              aria-label={`נווט אל ${place.name} ב-Waze`}
            >
              <Navigation size={14} aria-hidden="true" /> Waze
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
