import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, ExternalLink, Inbox, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { parseOrder } from '@/lib/tripUtils';

/** Published trips. A trip appears for everybody at once; here an admin can hide it again or delete it. */
export default function TripsModeration({ onError, onSuccess }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, description, author_name, places_order, is_public, hidden, published_at')
        .eq('is_public', true)
        .order('published_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setTrips(data || []);
    } catch (e) {
      console.error('Failed to load trips:', e);
      onError?.('שגיאה בטעינת המסלולים');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const setHidden = async (trip, hidden) => {
    setBusyId(trip.id);
    const { error } = await supabase.from('trips').update({ hidden }).eq('id', trip.id);
    setBusyId(null);
    if (error) return onError?.('העדכון נכשל');
    setTrips((list) => list.map((t) => (t.id === trip.id ? { ...t, hidden } : t)));
    return onSuccess?.(hidden ? 'המסלול הוסתר מהקהילה' : 'המסלול חזר להופיע');
  };

  const remove = async (trip) => {
    if (!window.confirm(`למחוק את "${trip.title}" לצמיתות?`)) return;
    setBusyId(trip.id);
    const { error } = await supabase.from('trips').delete().eq('id', trip.id);
    setBusyId(null);
    if (error) return onError?.('המחיקה נכשלה');
    setTrips((list) => list.filter((t) => t.id !== trip.id));
    return onSuccess?.('המסלול נמחק');
  };

  return (
    <div className="space-y-4">
      <div className="text-right">
        <h1 className="text-2xl font-bold text-foreground">מסלולים של הקהילה</h1>
        <p className="text-sm text-muted-foreground">מסלולים שגולשים שיתפו. הם מתפרסמים מיד. כאן אפשר להסתיר או למחוק.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : trips.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border py-12 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2" />
          עוד לא שותפו מסלולים
        </div>
      ) : (
        <ul className="space-y-3">
          {trips.map((trip) => (
            <li key={trip.id} className={`space-y-2 rounded-2xl border border-border bg-card p-4 text-right ${trip.hidden ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${trip.hidden ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'}`}>
                  {trip.hidden ? 'מוסתר' : 'מוצג'}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center justify-end gap-2 font-bold text-foreground">
                    <a href={`/trips/${trip.id}`} target="_blank" rel="noopener noreferrer" aria-label="פתח את המסלול" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink size={14} />
                    </a>
                    {trip.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trip.author_name || 'ללא שם'} · {parseOrder(trip.places_order).length} תחנות ·{' '}
                    {trip.published_at ? new Date(trip.published_at).toLocaleDateString('he-IL') : ''}
                  </p>
                </div>
              </div>
              {trip.description && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{trip.description}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => remove(trip)}
                  disabled={busyId === trip.id}
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
                >
                  <Trash2 size={16} /> מחק
                </button>
                <button
                  type="button"
                  onClick={() => setHidden(trip, !trip.hidden)}
                  disabled={busyId === trip.id}
                  className="flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
                >
                  {trip.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                  {trip.hidden ? 'החזר' : 'הסתר'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
