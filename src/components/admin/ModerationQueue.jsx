import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const SOURCES = [
  { table: 'tips', label: 'טיפים' },
  { table: 'reports', label: 'דיווחים' },
];

/**
 * Pending community content. Approving / rejecting only changes `status`;
 * the database (RLS + triggers) is what actually enforces who may do that.
 */
export default function ModerationQueue({ onError, onSuccess }) {
  const [table, setTable] = useState('tips');
  const [items, setItems] = useState([]);
  const [placeNames, setPlaceNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;

      const ids = [...new Set((data || []).map((i) => i.place_id).filter(Boolean))];
      const names = {};
      if (ids.length > 0) {
        const { data: places } = await supabase.from('places').select('id, name').in('id', ids);
        (places || []).forEach((p) => {
          names[p.id] = p.name;
        });
      }
      setItems(data || []);
      setPlaceNames(names);
    } catch (e) {
      console.error('Failed to load moderation queue:', e);
      onError?.('שגיאה בטעינת התוכן הממתין');
    } finally {
      setLoading(false);
    }
  }, [table, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item, status) => {
    setBusyId(item.id);
    try {
      const { error } = await supabase.from(table).update({ status }).eq('id', item.id);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      onSuccess?.(status === 'approved' ? 'התוכן אושר' : 'התוכן נדחה');
    } catch (e) {
      console.error('Moderation failed:', e);
      onError?.('שגיאה בעדכון הסטטוס');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6 justify-end" role="tablist">
        {SOURCES.map((s) => (
          <button
            key={s.table}
            role="tab"
            aria-selected={table === s.table}
            onClick={() => setTable(s.table)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
              table === s.table
                ? 'bg-green-600 text-white'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="mx-auto mb-2" />
          אין תוכן שממתין לאישור
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="bg-card border border-border rounded-2xl p-4 text-right">
              <p className="text-xs text-muted-foreground mb-1">
                {placeNames[item.place_id] || 'מקום לא ידוע'} ·{' '}
                {new Date(item.created_at).toLocaleString('he-IL')}
              </p>
              {/* Rendered as text (React escapes it): user content is never HTML */}
              <p className="text-foreground whitespace-pre-wrap break-words">{item.content}</p>
              <div className="flex gap-2 mt-3 justify-end">
                <button
                  onClick={() => decide(item, 'rejected')}
                  disabled={busyId === item.id}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                >
                  <X size={16} /> דחה
                </button>
                <button
                  onClick={() => decide(item, 'approved')}
                  disabled={busyId === item.id}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {busyId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  אשר
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
