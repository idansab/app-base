import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BadgeCheck, BarChart3, Clock, Loader2, Pencil, Store, X } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatBetaDate, useBetaInfo } from '@/lib/beta';
import OwnerEditor from '@/components/places/OwnerEditor';
import PlaceStats from '@/components/places/PlaceStats';

const RELATIONS = [
  ['owner', 'בעל/ת העסק'],
  ['manager', 'מנהל/ת'],
  ['employee', 'עובד/ת'],
];

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-green-600';

/**
 * "Are you the owner?" entry point on a place. Claims are reviewed by an admin; nothing changes
 * for the place until then. Shows the user's own claim status when one exists.
 */
export default function ClaimPlace({ place, className = '', onPlaceUpdated }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const beta = useBetaInfo();

  const [claim, setClaim] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ relation: 'owner', contact_name: '', contact_phone: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);

  const loadClaim = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !place?.id) {
      setClaim(null);
      return;
    }
    const { data } = await supabase
      .from('place_owners')
      .select('id, status, review_note')
      .eq('place_id', place.id)
      .eq('user_id', user.id)
      .maybeSingle();
    setClaim(data || null);
  }, [isAuthenticated, user?.id, place?.id]);

  useEffect(() => {
    loadClaim();
  }, [loadClaim]);

  // an owner may already have an update waiting for review
  const loadPendingRequest = useCallback(async () => {
    if (claim?.status !== 'approved' || !place?.id) {
      setPendingRequest(false);
      return;
    }
    const { count } = await supabase
      .from('place_update_requests')
      .select('id', { count: 'exact', head: true })
      .eq('place_id', place.id)
      .eq('status', 'pending');
    setPendingRequest((count ?? 0) > 0);
  }, [claim?.status, place?.id]);

  useEffect(() => {
    loadPendingRequest();
  }, [loadPendingRequest]);

  if (!place?.id) return null;

  const start = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setError('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.contact_phone.trim()) {
      setError('מספר טלפון ליצירת קשר הוא שדה חובה');
      return;
    }
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('place_owners').insert([
      {
        place_id: place.id,
        user_id: user.id,
        relation: form.relation,
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim(),
        note: form.note.trim() || null,
      },
    ]);
    setSaving(false);
    if (insertError) {
      setError(
        insertError.message?.includes('too many pending')
          ? 'יש לך כבר כמה בקשות שממתינות לאישור. נחזור אליך בהקדם.'
          : insertError.code === '23505'
            ? 'כבר שלחת בקשה למקום הזה.'
            : 'לא הצלחנו לשלוח את הבקשה. נסה שוב.'
      );
      return;
    }
    setOpen(false);
    loadClaim();
  };

  const cancel = async () => {
    await supabase.from('place_owners').delete().eq('id', claim.id);
    loadClaim();
  };

  // ---- status line instead of the button once the user has a claim ----
  if (claim?.status === 'approved') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-end gap-2 text-sm text-green-700">
          אתה רשום כבעלים של המקום <BadgeCheck size={18} />
        </div>
        {pendingRequest && (
          <p className="text-xs text-gray-600 text-right flex items-center justify-end gap-1">
            יש לך בקשת עדכון שממתינה לאישור <Clock size={12} />
          </p>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
        >
          <Pencil size={18} />
          ערוך את פרטי העסק
        </button>
        <button
          type="button"
          onClick={() => setShowStats(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-green-600 text-green-700 font-medium hover:bg-green-50 transition-colors"
        >
          <BarChart3 size={18} />
          סטטיסטיקות
        </button>
        {showStats && <PlaceStats place={place} onClose={() => setShowStats(false)} />}
        {editing && (
          <OwnerEditor
            place={place}
            onClose={() => {
              setEditing(false);
              loadPendingRequest();
            }}
            onSaved={onPlaceUpdated}
          />
        )}
      </div>
    );
  }
  if (claim?.status === 'pending') {
    return (
      <div className={`flex items-center justify-end gap-3 text-sm text-gray-600 ${className}`}>
        <button onClick={cancel} className="text-xs underline hover:text-gray-900">בטל בקשה</button>
        הבקשה שלך נבדקת <Clock size={16} />
      </div>
    );
  }
  if (claim?.status === 'rejected' || claim?.status === 'revoked') {
    return (
      <p className={`text-sm text-gray-600 text-right ${className}`}>
        הבקשה לבעלות על המקום לא אושרה{claim.review_note ? `: ${claim.review_note}` : '.'}
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={start}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-green-600 text-green-700 font-medium hover:bg-green-50 transition-colors"
      >
        <Store size={18} />
        בעל העסק? בקש שליטה על העמוד
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="בקשת בעלות על מקום">
          <form onSubmit={submit} className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4 text-right max-h-[90dvh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100" aria-label="סגור">
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold text-gray-900">בעלות על {place.name}</h2>
            </div>

            <p className="text-sm text-gray-600">
              נבדוק את הבקשה ונחזור אליך בטלפון. אחרי האישור תוכל לעדכן את פרטי העסק
              {beta?.active ? ` בחינם עד ${formatBetaDate(beta.ends_at)}` : ''}.
            </p>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">הקשר שלך לעסק</span>
              <select className={inputCls} value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}>
                {RELATIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">שם</span>
              <input className={inputCls} maxLength={100} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">טלפון ליצירת קשר *</span>
              <input
                className={inputCls}
                dir="ltr"
                type="tel"
                inputMode="tel"
                maxLength={30}
                required
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">עוד פרטים שיעזרו לנו לאמת (אופציונלי)</span>
              <textarea className={`${inputCls} resize-none`} rows={3} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              שלח בקשה
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
