import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Inbox, Loader2, Phone, Undo2, X } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const RELATIONS = { owner: 'בעלים', manager: 'מנהל', employee: 'עובד' };
const STATUS = {
  pending: ['ממתין', 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'],
  approved: ['מאושר', 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'],
  rejected: ['נדחה', 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'],
  revoked: ['בוטל', 'bg-muted text-foreground dark:bg-slate-800 dark:text-slate-200'],
};

// Things worth a second look before approving
function warnings(claim) {
  const out = [];
  if (claim.other_owners > 0) out.push(`כבר יש ${claim.other_owners} בעלים מאושרים במקום הזה`);
  if (claim.user_claims >= 3) out.push(`המשתמש שלח ${claim.user_claims} בקשות בעלות`);
  if (claim.relation !== 'owner') out.push(`הבקשה היא כ${RELATIONS[claim.relation] || claim.relation}. אמת בזהירות`);
  return out;
}

const FILTERS = [['pending', 'ממתינות'], ['approved', 'מאושרות'], ['all', 'הכול']];

/** Review queue for "I own this business" claims. Approving makes the user an owner of that place. */
export default function OwnershipRequests({ onError, onSuccess, onPendingChange }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // { id, reason }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_list_owner_claims');
      if (error) throw error;
      setClaims(data || []);
    } catch (e) {
      console.error('Failed to load ownership claims:', e);
      onError?.('שגיאה בטעינת בקשות הבעלות');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(() => claims.filter((c) => c.status === 'pending').length, [claims]);
  useEffect(() => {
    if (!loading) onPendingChange?.(pendingCount);
  }, [pendingCount, loading, onPendingChange]);

  const visible = filter === 'all' ? claims : claims.filter((c) => c.status === filter);

  const setStatus = async (claim, status, reviewNote) => {
    setBusyId(claim.id);
    try {
      const { error } = await supabase
        .from('place_owners')
        .update({ status, review_note: reviewNote || null })
        .eq('id', claim.id);
      if (error) throw error;
      setClaims((prev) => prev.map((c) => (c.id === claim.id ? { ...c, status, review_note: reviewNote || null } : c)));
      onSuccess?.(status === 'approved' ? 'הבעלות אושרה' : status === 'rejected' ? 'הבקשה נדחתה' : 'ההרשאה בוטלה');
      setRejecting(null);
    } catch (e) {
      console.error('Updating claim failed:', e);
      onError?.('שגיאה בעדכון הבקשה');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-right">
        <h1 className="text-2xl font-bold text-foreground">בעלות על מקומות</h1>
        <p className="text-sm text-muted-foreground">
          אשר רק אחרי שוידאת שהמבקש באמת קשור לעסק (שיחה, מייל מדומיין העסק, או חשבון העסק ברשתות).
        </p>
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
          אין בקשות בסטטוס הזה
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((claim) => {
            const [statusLabel, statusTone] = STATUS[claim.status] || STATUS.pending;
            return (
              <li key={claim.id} className="rounded-2xl border border-border bg-card p-4 text-right space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone}`}>{statusLabel}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{claim.place_name}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">{claim.email || 'משתמש לא ידוע'}</p>
                  </div>
                </div>

                <p className="text-sm text-foreground">
                  {RELATIONS[claim.relation] || claim.relation}
                  {claim.contact_name ? ` · ${claim.contact_name}` : ''}
                </p>

                {/* Verification aid: the PUBLIC phone of the business is the one to call */}
                <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm space-y-1.5">
                  <p className="font-medium text-foreground">אימות</p>
                  <p className="flex items-center justify-between gap-2">
                    {claim.place_phone ? (
                      <a href={`tel:${claim.place_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline" dir="ltr">
                        <Phone size={14} /> {claim.place_phone}
                      </a>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300">אין טלפון ציבורי למקום</span>
                    )}
                    <span className="text-muted-foreground">טלפון ציבורי של העסק (התקשר לזה)</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    {claim.contact_phone ? (
                      <a href={`tel:${claim.contact_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline" dir="ltr">
                        <Phone size={14} /> {claim.contact_phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">לא הושאר</span>
                    )}
                    <span className="text-muted-foreground">טלפון המבקש</span>
                  </p>
                  {!claim.place_phone && (
                    <p className="text-xs text-muted-foreground">
                      בלי טלפון ציבורי כדאי לאמת בהודעה בעמוד העסק ברשתות, או במייל מדומיין העסק.
                    </p>
                  )}
                </div>

                {claim.status === 'pending' && warnings(claim).length > 0 && (
                  <ul className="space-y-1" aria-label="אזהרות">
                    {warnings(claim).map((text) => (
                      <li key={text} className="flex items-start justify-end gap-1.5 text-xs text-amber-800 dark:text-amber-200">
                        {text} <AlertTriangle size={14} className="shrink-0 mt-px" />
                      </li>
                    ))}
                  </ul>
                )}

                {claim.note && <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{claim.note}</p>}
                {claim.review_note && <p className="text-xs text-muted-foreground">הערת סקירה: {claim.review_note}</p>}
                <p className="text-xs text-muted-foreground">
                  נשלחה {new Date(claim.created_at).toLocaleString('he-IL')}
                  {claim.reviewed_at && claim.status !== 'pending'
                    ? ` · הוחלט ${new Date(claim.reviewed_at).toLocaleString('he-IL')}${claim.reviewed_by_email ? ` על ידי ${claim.reviewed_by_email}` : ''}`
                    : ''}
                </p>

                {rejecting?.id === claim.id ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setStatus(claim, 'rejected', rejecting.reason.trim())}
                      disabled={busyId === claim.id}
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
                      onChange={(e) => setRejecting({ id: claim.id, reason: e.target.value })}
                      placeholder="סיבה (אופציונלי)"
                      className="flex-1 px-3 py-2 border border-border rounded-xl bg-background text-sm text-right"
                    />
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end pt-1">
                    {claim.status === 'pending' && (
                      <>
                        <button
                          onClick={() => setRejecting({ id: claim.id, reason: '' })}
                          disabled={busyId === claim.id}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                        >
                          <X size={16} /> דחה
                        </button>
                        <button
                          onClick={() => setStatus(claim, 'approved')}
                          disabled={busyId === claim.id}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {busyId === claim.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          אשר
                        </button>
                      </>
                    )}
                    {claim.status === 'approved' && (
                      <button
                        onClick={() => setStatus(claim, 'revoked')}
                        disabled={busyId === claim.id}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                      >
                        <Undo2 size={16} /> בטל הרשאה
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
