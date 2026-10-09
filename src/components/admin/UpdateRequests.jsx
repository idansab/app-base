import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Inbox, Loader2, X } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { changedGroups, describeGroup, fieldsOfGroups, isImageGroup } from '@/lib/ownerChanges';

const FILTERS = [['pending', 'ממתינות'], ['all', 'הכול']];
const STATUS = {
  pending: ['ממתין', 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'],
  approved: ['אושר', 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'],
  rejected: ['נדחה', 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'],
};

function ImageStrip({ urls, label }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {urls.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין תמונות</p>
      ) : (
        <div className="flex gap-1.5 flex-wrap">
          {urls.map((url, i) => (
            <a key={`${url}-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="block">
              <img src={url} alt="" loading="lazy" className="h-14 w-14 rounded-lg object-cover bg-muted" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/** Update requests from owners. The admin ticks the fields to accept; the rest is dropped. */
export default function UpdateRequests({ onError, onSuccess, onPendingChange }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [unchecked, setUnchecked] = useState({}); // requestId -> Set of group keys the admin turned off
  const [rejecting, setRejecting] = useState(null); // { id, reason }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_list_update_requests');
      if (error) throw error;
      setRequests(data || []);
    } catch (e) {
      console.error('Failed to load update requests:', e);
      onError?.('שגיאה בטעינת בקשות העדכון');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);
  useEffect(() => {
    if (!loading) onPendingChange?.(pendingCount);
  }, [pendingCount, loading, onPendingChange]);

  const visible = filter === 'all' ? requests : requests.filter((r) => r.status === 'pending');

  const toggleGroup = (requestId, groupKey) =>
    setUnchecked((prev) => {
      const set = new Set(prev[requestId] || []);
      if (set.has(groupKey)) set.delete(groupKey);
      else set.add(groupKey);
      return { ...prev, [requestId]: set };
    });

  const approve = async (request) => {
    const groups = changedGroups(request.changes).filter((g) => !(unchecked[request.id] || new Set()).has(g.key));
    if (groups.length === 0) {
      onError?.('בחר לפחות שדה אחד לאישור, או דחה את הבקשה');
      return;
    }
    setBusyId(request.id);
    try {
      const { error } = await supabase.rpc('admin_apply_update_request', {
        p_request_id: request.id,
        p_fields: fieldsOfGroups(groups.map((g) => g.key)),
      });
      if (error) throw error;
      onSuccess?.('העדכון אושר ופורסם');
      await load();
    } catch (e) {
      console.error('Applying request failed:', e);
      onError?.('שגיאה באישור הבקשה');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (request, reason) => {
    setBusyId(request.id);
    try {
      const { error } = await supabase
        .from('place_update_requests')
        .update({ status: 'rejected', review_note: reason || null })
        .eq('id', request.id);
      if (error) throw error;
      onSuccess?.('הבקשה נדחתה');
      setRejecting(null);
      await load();
    } catch (e) {
      console.error('Rejecting request failed:', e);
      onError?.('שגיאה בדחיית הבקשה');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-right">
        <h1 className="text-2xl font-bold text-foreground">בקשות עדכון</h1>
        <p className="text-sm text-muted-foreground">עדכונים שבעלי עסקים ביקשו. אפשר לאשר רק חלק מהשדות.</p>
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
            {key === 'pending' && pendingCount > 0 && <span className="mr-1 tabular-nums">({pendingCount})</span>}
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
          אין בקשות עדכון
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((request) => {
            const [statusLabel, statusTone] = STATUS[request.status] || STATUS.pending;
            const groups = changedGroups(request.changes);
            const off = unchecked[request.id] || new Set();
            const isPending = request.status === 'pending';
            return (
              <li key={request.id} className="rounded-2xl border border-border bg-card p-4 text-right space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone}`}>{statusLabel}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{request.place_name}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">{request.email || 'משתמש לא ידוע'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(request.created_at).toLocaleString('he-IL')}</p>
                  </div>
                </div>

                {request.note && (
                  <p className="text-sm text-foreground bg-secondary rounded-xl p-3 whitespace-pre-wrap break-words">{request.note}</p>
                )}

                <ul className="space-y-2">
                  {groups.map((group) => {
                    const accepted = isPending ? !off.has(group.key) : (request.applied_fields || []).some((f) => group.fields.includes(f));
                    return (
                      <li key={group.key} className={`rounded-xl border p-3 ${accepted ? 'border-green-300' : 'border-border opacity-60'}`}>
                        <label className="flex items-center justify-end gap-2 mb-2 cursor-pointer">
                          <span className="font-medium text-foreground">{group.label}</span>
                          {isPending ? (
                            <input
                              type="checkbox"
                              checked={accepted}
                              onChange={() => toggleGroup(request.id, group.key)}
                              aria-label={`אשר שינוי ב${group.label}`}
                              className="w-4 h-4"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">{accepted ? '(אושר)' : '(לא אושר)'}</span>
                          )}
                        </label>

                        {isImageGroup(group) ? (
                          <div className="grid gap-3">
                            <ImageStrip label="עכשיו" urls={request.current_place?.images || []} />
                            <ImageStrip label="מבוקש" urls={request.changes.images || []} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start text-sm">
                            <p className="text-muted-foreground whitespace-pre-wrap break-words">{describeGroup(group, request.current_place)}</p>
                            <ArrowLeft size={16} className="text-muted-foreground mt-0.5" aria-label="הופך ל" />
                            <p className="text-foreground font-medium whitespace-pre-wrap break-words">{describeGroup(group, request.changes)}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {isPending && <p className="text-xs text-muted-foreground">מימין: הערך הנוכחי. משמאל: המבוקש.</p>}

                {request.review_note && <p className="text-xs text-muted-foreground">הערת סקירה: {request.review_note}</p>}

                {isPending &&
                  (rejecting?.id === request.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => reject(request, rejecting.reason.trim())}
                        disabled={busyId === request.id}
                        className="px-3 py-2 rounded-xl bg-red-600 text-white text-sm disabled:opacity-50"
                      >
                        דחה
                      </button>
                      <button onClick={() => setRejecting(null)} className="px-3 py-2 rounded-xl text-sm hover:bg-secondary">
                        ביטול
                      </button>
                      <input
                        autoFocus
                        value={rejecting.reason}
                        maxLength={500}
                        onChange={(e) => setRejecting({ id: request.id, reason: e.target.value })}
                        placeholder="סיבה (אופציונלי)"
                        className="flex-1 px-3 py-2 border border-border rounded-xl bg-background text-sm text-right"
                      />
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setRejecting({ id: request.id, reason: '' })}
                        disabled={busyId === request.id}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                      >
                        <X size={16} /> דחה הכול
                      </button>
                      <button
                        onClick={() => approve(request)}
                        disabled={busyId === request.id}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {busyId === request.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        אשר את המסומן
                      </button>
                    </div>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
