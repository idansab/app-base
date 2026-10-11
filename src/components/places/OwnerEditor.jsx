import React, { useEffect, useMemo, useState } from 'react';
import { Info, Loader2, X } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import GalleryEditor from '@/components/admin/places/GalleryEditor';
import HoursEditor from '@/components/admin/places/HoursEditor';
import { PRICE_LEVELS, placeToForm } from '@/components/admin/places/placeUtils';
import { buildOwnerChanges } from '@/lib/ownerChanges';
import { formatBetaDate, useBetaInfo } from '@/lib/beta';

const inputCls =
  'w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-right focus:outline-none focus:ring-2 focus:ring-green-600';

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-foreground mb-1">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

/**
 * Editor for an approved owner. Name, address, location and category stay with the admins.
 * With the direct-edit entitlement (free during the beta) changes are published at once;
 * otherwise they are sent to an admin as a request.
 */
export default function OwnerEditor({ place, onClose, onSaved }) {
  const beta = useBetaInfo();
  const initial = useMemo(() => placeToForm(place), [place]);
  const [form, setForm] = useState(initial);
  const [entitlements, setEntitlements] = useState(null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ text: '', error: false });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // 'applied' | 'requested'

  useEffect(() => {
    let cancelled = false;
    supabase.rpc('place_entitlements', { p_place_id: place.id }).then(({ data }) => {
      if (!cancelled) setEntitlements(data);
    });
    return () => {
      cancelled = true;
    };
  }, [place.id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const direct = entitlements?.direct_edit === true;
  const { changes } = useMemo(() => buildOwnerChanges(place, form), [place, form]);
  const hasChanges = Object.keys(changes).length > 0;

  const notify = (text, error = false) => setMessage({ text, error });

  const submit = async (e) => {
    e.preventDefault();
    const built = buildOwnerChanges(place, form);
    setErrors(built.errors);
    if (Object.keys(built.errors).length > 0) {
      notify('יש שדות לא תקינים', true);
      return;
    }
    if (Object.keys(built.changes).length === 0) {
      notify('לא ביצעת שינויים', true);
      return;
    }

    setSaving(true);
    setMessage({ text: '', error: false });
    const { data, error } = await supabase.rpc('owner_update_place', {
      p_place_id: place.id,
      p_changes: built.changes,
      p_note: note.trim() || null,
    });
    setSaving(false);

    if (error) {
      console.error('Owner update failed:', error);
      notify('לא הצלחנו לשמור. נסה שוב, ואם זה חוזר צור קשר.', true);
      return;
    }

    if (data?.applied) {
      const { data: fresh } = await supabase.from('places').select('*').eq('id', place.id).maybeSingle();
      if (fresh) onSaved?.(fresh);
      setResult('applied');
    } else {
      setResult('requested');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 sm:p-4" role="dialog" aria-modal="true" aria-label="עריכת פרטי העסק">
      <form onSubmit={submit} className="w-full max-w-xl bg-card text-foreground sm:rounded-3xl rounded-t-3xl max-h-[92dvh] flex flex-col" dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-secondary" aria-label="סגור">
            <X size={20} />
          </button>
          <h2 className="text-lg font-bold text-foreground">עריכת {place.name}</h2>
        </div>

        {result ? (
          <div className="p-8 text-center space-y-4">
            <p role="status" className="text-lg font-semibold text-foreground">
              {result === 'applied' ? 'השינויים פורסמו' : 'הבקשה נשלחה לאישור'}
            </p>
            <p className="text-sm text-muted-foreground">
              {result === 'applied'
                ? 'העמוד של העסק מעודכן.'
                : 'נבדוק את השינויים ונעדכן את העמוד. אפשר לשלוח בקשה חדשה בכל זמן, והיא תחליף את הקודמת.'}
            </p>
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl bg-green-600 text-white font-medium hover:bg-green-700">
              סגור
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-900 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300">
                <Info size={16} className="shrink-0 mt-0.5" />
                {entitlements === null ? (
                  <span>בודק הרשאות…</span>
                ) : direct ? (
                  <span>
                    בתקופת הבטא{beta?.ends_at ? ` (עד ${formatBetaDate(beta.ends_at)})` : ''} השינויים מתפרסמים מיד, בחינם.
                  </span>
                ) : (
                  <span>השינויים יישלחו לאישור לפני שיעלו לאתר.</span>
                )}
              </div>

              <Field label="תיאור קצר" error={errors.short_description}>
                <input className={inputCls} maxLength={200} value={form.short_description} onChange={set('short_description')} />
              </Field>
              <Field label="תיאור">
                <textarea className={`${inputCls} resize-none`} rows={4} maxLength={2000} value={form.description} onChange={set('description')} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="טלפון">
                  <input className={inputCls} dir="ltr" type="tel" maxLength={30} value={form.phone} onChange={set('phone')} />
                </Field>
                <Field label="רמת מחיר">
                  <select className={inputCls} value={form.price_level} onChange={set('price_level')}>
                    {PRICE_LEVELS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="כשרות">
                  <select className={inputCls} value={form.kosher} onChange={set('kosher')}>
                    <option value="">לא צוין</option>
                    <option value="kosher">כשר</option>
                    <option value="not_kosher">לא כשר</option>
                  </select>
                </Field>
                {form.kosher === 'kosher' && (
                  <Field label="שם ההכשר" error={errors.kosher_note}>
                    <input className={inputCls} maxLength={100} value={form.kosher_note} onChange={set('kosher_note')} />
                  </Field>
                )}
              </div>
              <Field label="תגיות (מופרדות בפסיק)">
                <input className={inputCls} value={form.tags} onChange={set('tags')} />
              </Field>

              <div className="rounded-xl border border-border p-3">
                <HoursEditor
                  value={form.schedule}
                  onChange={(schedule) => setForm((f) => ({ ...f, schedule }))}
                  legacyText={place.opening_hours}
                  textValue={form.opening_hours}
                  onTextChange={(opening_hours) => setForm((f) => ({ ...f, opening_hours }))}
                />
                {errors.schedule && <p className="text-xs text-red-600 mt-2">{errors.schedule}</p>}
              </div>

              <div className="rounded-xl border border-border p-3">
                <GalleryEditor
                  images={form.images}
                  allowUrl={false}
                  onChange={(images) => setForm((f) => ({ ...f, images }))}
                  onError={(text) => notify(text, true)}
                  onSuccess={(text) => notify(text)}
                />
              </div>

              {!direct && entitlements !== null && (
                <Field label="הערה למנהל (אופציונלי)">
                  <textarea className={`${inputCls} resize-none`} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
              )}

              {message.text && (
                <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-red-600' : 'text-green-700'}`}>
                  {message.text}
                </p>
              )}
            </div>

            <div className="border-t border-border p-4 flex gap-3">
              <button
                type="submit"
                disabled={saving || entitlements === null || !hasChanges}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-40"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {direct ? 'פרסם שינויים' : 'שלח לאישור'}
              </button>
              <button type="button" onClick={onClose} className="px-5 py-3 rounded-2xl hover:bg-secondary text-foreground">
                ביטול
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
