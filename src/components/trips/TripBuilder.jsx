import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, X } from 'lucide-react';
import StopPicker from '@/components/trips/StopPicker';
import { createTrip, tripErrorMessage, updateTrip } from '@/lib/tripsApi';
import { useDisplayName } from '@/lib/AuthContext';
import { MAX_TRIP_STOPS, estimateHours, moveItem, parseOrder, routeKm } from '@/lib/tripUtils';

const AUTHOR_KEY = 'mayhishpo:trip-author';
const inputCls =
  'w-full rounded-xl border border-border bg-background px-4 py-2.5 text-right text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

const readAuthor = () => {
  try {
    return localStorage.getItem(AUTHOR_KEY) || '';
  } catch {
    return '';
  }
};

/**
 * Build a trip, or edit one. Stops come from any approved place (nearby, search, or favorites).
 * A trip can be kept private or shared with the community when it is saved.
 */
export default function TripBuilder({ userId, places, favoriteIds, userLocation, onRequestLocation, initialTrip, onSaved, onCancel }) {
  const [title, setTitle] = useState(initialTrip?.title ?? '');
  const [description, setDescription] = useState(initialTrip?.description ?? '');
  const [order, setOrder] = useState(() => parseOrder(initialTrip?.places_order));
  const [shareWithCommunity, setShareWithCommunity] = useState(Boolean(initialTrip?.is_public));
  const displayName = useDisplayName();
  const [authorName, setAuthorName] = useState(initialTrip?.author_name ?? (readAuthor() || displayName));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const stops = order.map((id) => byId.get(id)).filter(Boolean);
  const km = routeKm(stops);
  const hours = estimateHours(stops.length, km);
  const full = order.length >= MAX_TRIP_STOPS;

  const add = (placeId) => setOrder((list) => (list.includes(placeId) || list.length >= MAX_TRIP_STOPS ? list : [...list, placeId]));
  const remove = (placeId) => setOrder((list) => list.filter((id) => id !== placeId));
  const move = (from, to) => setOrder((list) => moveItem(list, from, to));

  const save = async (event) => {
    event.preventDefault();
    if (title.trim().length < 2) return setError('איך קוראים למסלול? כתוב שם של לפחות שני תווים.');
    if (stops.length < 2) return setError('מסלול צריך לפחות שתי תחנות.');
    setSaving(true);
    setError('');
    try {
      const fields = { title, description, order: stops.map((s) => s.id), hours, isPublic: shareWithCommunity, authorName };
      const saved = initialTrip?.id ? await updateTrip(initialTrip.id, fields) : await createTrip(userId, fields);
      if (shareWithCommunity && authorName.trim()) {
        try {
          localStorage.setItem(AUTHOR_KEY, authorName.trim());
        } catch {
          /* private mode */
        }
      }
      onSaved(saved);
    } catch (e) {
      console.error('Saving trip failed:', e);
      setError(tripErrorMessage(e, 'השמירה נכשלה. בדוק את החיבור ונסה שוב.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border-2 border-primary bg-card p-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onCancel} className="rounded-lg p-1 hover:bg-secondary" aria-label="סגור">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold">{initialTrip?.id ? 'עריכת מסלול' : 'מסלול חדש'}</h2>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-right text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <input className={inputCls} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="שם המסלול, למשל: יום במעיינות הצפון" aria-label="שם המסלול" />
      <textarea className={`${inputCls} resize-none`} rows={2} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="תיאור קצר (אופציונלי)" aria-label="תיאור המסלול" />

      <div>
        <h3 className="mb-2 text-right text-sm font-semibold">
          התחנות שלך ({order.length}/{MAX_TRIP_STOPS})
        </h3>
        {stops.length === 0 ? (
          <p className="rounded-xl bg-secondary p-4 text-center text-sm text-muted-foreground">עוד אין תחנות. בחר מקומות מהרשימה למטה.</p>
        ) : (
          <ol className="space-y-2">
            {stops.map((place, index) => (
              <li key={place.id} className="flex items-center gap-2 rounded-xl bg-secondary p-2">
                <button type="button" onClick={() => remove(place.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40" aria-label={`הסר את ${place.name}`}>
                  <X size={16} />
                </button>
                <div className="flex flex-col">
                  <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} className="rounded p-0.5 hover:bg-accent disabled:opacity-30" aria-label="הזז למעלה">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" onClick={() => move(index, index + 1)} disabled={index === stops.length - 1} className="rounded p-0.5 hover:bg-accent disabled:opacity-30" aria-label="הזז למטה">
                    <ArrowDown size={14} />
                  </button>
                </div>
                <span className="min-w-0 flex-1 truncate text-right text-sm font-medium">{place.name}</span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
              </li>
            ))}
          </ol>
        )}
        {stops.length >= 2 && (
          <p className="mt-2 text-right text-xs text-muted-foreground">
            כ-{Math.round(km)} ק״מ בקו אווירי · כ-{hours} שעות
          </p>
        )}
      </div>

      <StopPicker
        places={places}
        favoriteIds={favoriteIds}
        selectedIds={order}
        userLocation={userLocation}
        onRequestLocation={onRequestLocation}
        onAdd={add}
        full={full}
      />

      <div className="space-y-3 rounded-xl border border-border p-3">
        <label className="flex cursor-pointer items-center justify-end gap-2 text-sm font-medium">
          שתף את המסלול עם הקהילה
          <input type="checkbox" checked={shareWithCommunity} onChange={(e) => setShareWithCommunity(e.target.checked)} className="h-4 w-4" />
        </label>
        {shareWithCommunity ? (
          <div>
            <input className={inputCls} value={authorName} maxLength={40} onChange={(e) => setAuthorName(e.target.value)} placeholder="השם שיוצג (אופציונלי)" aria-label="השם שיוצג" />
            <p className="mt-1.5 text-right text-xs text-muted-foreground">המסלול יופיע ב"מהקהילה" ויהיה אפשר לשתף אותו בקישור. אפשר להסיר אותו מהקהילה בכל זמן.</p>
          </div>
        ) : (
          <p className="text-right text-xs text-muted-foreground">בלי שיתוף, המסלול נשאר פרטי ורק אתה רואה אותו.</p>
        )}
      </div>

      <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
        {saving && <Loader2 size={18} className="animate-spin" />}
        {initialTrip?.id ? 'שמור שינויים' : shareWithCommunity ? 'שמור ושתף' : 'שמור מסלול'}
      </button>
    </form>
  );
}
