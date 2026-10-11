import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Inbox, Loader2, Mail, Trash2 } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const FILTERS = [['new', 'חדשים'], ['all', 'הכול']];
const KIND_LABELS = { idea: 'רעיון', bug: 'תקלה', praise: 'מילה טובה', other: 'אחר', report: 'דיווח על תוכן' };
const KIND_TONES = {
  idea: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  bug: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  praise: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  other: 'bg-secondary text-foreground',
  report: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
};

/** Messages visitors send from the About page. */
export default function FeedbackInbox({ onError, onSuccess, onPendingChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('id, kind, message, contact, page, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error('Failed to load feedback:', e);
      onError?.('שגיאה בטעינת המשוב');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const newCount = useMemo(() => items.filter((i) => i.status === 'new').length, [items]);
  useEffect(() => {
    if (!loading) onPendingChange?.(newCount);
  }, [newCount, loading, onPendingChange]);

  const visible = filter === 'all' ? items : items.filter((i) => i.status === 'new');

  const markHandled = async (item) => {
    setBusyId(item.id);
    const { error } = await supabase.from('feedback').update({ status: 'handled' }).eq('id', item.id);
    setBusyId(null);
    if (error) return onError?.('שגיאה בעדכון');
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, status: 'handled' } : i)));
    return onSuccess?.('סומן כטופל');
  };

  const remove = async (item) => {
    if (!window.confirm('למחוק את ההודעה לצמיתות?')) return;
    setBusyId(item.id);
    const { error } = await supabase.from('feedback').delete().eq('id', item.id);
    setBusyId(null);
    if (error) return onError?.('שגיאה במחיקה');
    setItems((list) => list.filter((i) => i.id !== item.id));
    return onSuccess?.('ההודעה נמחקה');
  };

  return (
    <div className="space-y-4">
      <div className="text-right">
        <h1 className="text-2xl font-bold text-foreground">משוב</h1>
        <p className="text-sm text-muted-foreground">הודעות שגולשים שלחו מדף "אודות".</p>
      </div>

      <div className="flex gap-2 justify-end" role="tablist">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
              filter === key ? 'bg-green-600 text-white border-green-600' : 'bg-card border-border hover:bg-secondary'
            }`}
          >
            {label}
            {key === 'new' && newCount > 0 && <span className="mr-1 tabular-nums">({newCount})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-3xl">
          <Inbox className="mx-auto mb-2" />
          אין הודעות
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-card p-4 text-right space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${KIND_TONES[item.kind] || KIND_TONES.other}`}>
                  {KIND_LABELS[item.kind] || item.kind}
                </span>
                <div className="min-w-0 text-xs text-muted-foreground">
                  <p>{new Date(item.created_at).toLocaleString('he-IL')}</p>
                  {item.page && <p dir="ltr">{item.page}</p>}
                </div>
              </div>

              <p className="text-foreground whitespace-pre-wrap break-words">{item.message}</p>

              {item.contact && (
                <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                  <span dir="ltr">{item.contact}</span>
                  <Mail size={14} />
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => remove(item)}
                  disabled={busyId === item.id}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                >
                  <Trash2 size={16} /> מחק
                </button>
                {item.status === 'new' && (
                  <button
                    onClick={() => markHandled(item)}
                    disabled={busyId === item.id}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {busyId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    סמן כטופל
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
