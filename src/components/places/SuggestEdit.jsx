import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, Flag, Loader2, Pencil, X } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { PRICE_LEVELS } from '@/components/admin/places/placeUtils';
import { uploadPlaceImage, validateImageFile } from '@/lib/uploadPlaceImage';
import {
  MAX_SUGGESTED_IMAGES,
  SUGGEST_REASONS,
  buildReportNote,
  buildSuggestionChanges,
  placeToSuggestionForm,
} from '@/lib/suggestChanges';

const inputCls =
  'w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-right focus:outline-none focus:ring-2 focus:ring-green-600';

const MODES = [
  { key: 'report', icon: Flag, title: 'דיווח על מקום שגוי', desc: 'סגור, כפול, או במיקום לא נכון' },
  { key: 'edit', icon: Pencil, title: 'הצעת תיקון בפרטים', desc: 'שם, כתובת, טלפון, שעות, תיאור' },
  { key: 'photos', icon: Camera, title: 'הוספת תמונות', desc: `עד ${MAX_SUGGESTED_IMAGES} תמונות של המקום` },
];

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
 * "Report a problem / suggest an edit" on a place. Everything goes to an admin first: nothing
 * changes on the site until the admin accepts it (all of it, or only some fields, e.g. just the photos).
 */
export default function SuggestEdit({ place, className = '' }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // null = choose
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [form, setForm] = useState(() => placeToSuggestionForm(place));
  const [note, setNote] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef(null);

  const initial = useMemo(() => placeToSuggestionForm(place), [place]);

  const close = () => {
    setOpen(false);
    setMode(null);
    setSent(false);
    setError('');
    setFieldErrors({});
    setReason('');
    setDetails('');
    setNote('');
    setImages([]);
    setForm(initial);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const room = MAX_SUGGESTED_IMAGES - images.length - uploading;
    if (files.length === 0 || room <= 0) return;
    setError('');
    const chosen = files.slice(0, room);
    for (const file of chosen) {
      const problem = validateImageFile(file);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setUploading((n) => n + chosen.length);
    for (const file of chosen) {
      try {
        const url = await uploadPlaceImage(file);
        setImages((list) => [...list, url].slice(0, MAX_SUGGESTED_IMAGES));
      } catch (err) {
        console.error('Suggestion image upload failed:', err);
        setError(err?.message || 'העלאת התמונה נכשלה');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const send = async (kind, changes, noteText) => {
    setSaving(true);
    setError('');
    const { error: rpcError } = await supabase.rpc('suggest_place_update', {
      p_place_id: place.id,
      p_kind: kind,
      p_changes: changes,
      p_note: noteText || null,
    });
    setSaving(false);
    if (rpcError) {
      console.error('suggest_place_update failed:', rpcError);
      setError(
        rpcError.hint === 'too_many_requests' || /rate limit/i.test(rpcError.message || '')
          ? 'שלחת הרבה הצעות היום. אפשר לנסות שוב מחר.'
          : 'השליחה נכשלה. נסה שוב בעוד רגע.'
      );
      return;
    }
    setSent(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (mode === 'report') {
      const built = buildReportNote(reason, details);
      if (built.error) return setError(built.error);
      return send('report', {}, built.note);
    }
    if (mode === 'edit') {
      const built = buildSuggestionChanges(place, form);
      setFieldErrors(built.errors);
      if (Object.keys(built.errors).length > 0) return setError('יש שדות לא תקינים');
      if (Object.keys(built.changes).length === 0) return setError('לא שינית שום פרט');
      return send('edit', built.changes, note.trim());
    }
    if (mode === 'photos') {
      if (images.length === 0) return setError('הוסף לפחות תמונה אחת');
      return send('photos', { add_images: images }, note.trim());
    }
    return undefined;
  };

  const openDialog = () => setOpen(true);
  const needsLogin = !isAuthenticated;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={openDialog}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        <Flag size={16} />
        דיווח על בעיה / הצעת עריכה
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="דיווח או הצעת עריכה"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <form
            onSubmit={submit}
            dir="rtl"
            className="w-full max-w-xl bg-card text-foreground sm:rounded-3xl rounded-t-3xl max-h-[92dvh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <button type="button" onClick={close} className="p-2 rounded-full hover:bg-secondary" aria-label="סגור">
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold text-foreground">{place.name}</h2>
            </div>

            {sent ? (
              <div className="p-8 text-center space-y-4">
                <CheckCircle2 className="mx-auto text-green-600" size={40} />
                <p role="status" className="text-lg font-semibold text-foreground">תודה! ההצעה נשלחה</p>
                <p className="text-sm text-muted-foreground">
                  המנהל יבדוק אותה, ורק אחרי האישור היא תופיע באתר.
                </p>
                <button type="button" onClick={close} className="px-6 py-3 rounded-2xl bg-green-600 text-white font-medium hover:bg-green-700">
                  סגור
                </button>
              </div>
            ) : needsLogin ? (
              <div className="p-8 text-center space-y-4">
                <p className="text-foreground">כדי לשלוח דיווח או הצעה צריך להתחבר. זה עוזר לנו למנוע ספאם.</p>
                <button
                  type="button"
                  onClick={() => navigate('/login', { state: { from: location } })}
                  className="px-6 py-3 rounded-2xl bg-green-600 text-white font-medium hover:bg-green-700"
                >
                  התחברות
                </button>
              </div>
            ) : mode === null ? (
              <div className="p-5 space-y-3">
                <p className="text-sm text-muted-foreground">מה תרצה לעשות? המנהל בודק כל הצעה לפני שהיא עולה.</p>
                {MODES.map(({ key, icon: Icon, title, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-background hover:bg-secondary text-right transition-colors"
                  >
                    <Icon size={22} className="text-green-600 shrink-0" />
                    <span className="flex-1">
                      <span className="block font-semibold text-foreground">{title}</span>
                      <span className="block text-sm text-muted-foreground">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {mode === 'report' && (
                    <>
                      <Field label="מה הבעיה?">
                        <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
                          <option value="">בחר סיבה…</option>
                          {SUGGEST_REASONS.map((r) => (
                            <option key={r.key} value={r.key}>{r.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="פרטים (אפשר גם בלי)">
                        <textarea className={`${inputCls} resize-none`} rows={3} maxLength={400} value={details} onChange={(e) => setDetails(e.target.value)} />
                      </Field>
                    </>
                  )}

                  {mode === 'edit' && (
                    <>
                      <p className="text-sm text-muted-foreground">שנה רק את מה שלא נכון. שדות שלא נגעת בהם יישארו כמו שהם.</p>
                      <Field label="שם" error={fieldErrors.name}>
                        <input className={inputCls} maxLength={80} value={form.name} onChange={set('name')} />
                      </Field>
                      <Field label="כתובת" error={fieldErrors.address}>
                        <input className={inputCls} maxLength={200} value={form.address} onChange={set('address')} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="טלפון" error={fieldErrors.phone}>
                          <input className={inputCls} dir="ltr" type="tel" maxLength={30} value={form.phone} onChange={set('phone')} />
                        </Field>
                        <Field label="רמת מחיר">
                          <select className={inputCls} value={form.price_level} onChange={set('price_level')}>
                            <option value="">לא צוין</option>
                            {PRICE_LEVELS.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <Field label="שעות פתיחה" error={fieldErrors.opening_hours}>
                        <input className={inputCls} maxLength={200} value={form.opening_hours} onChange={set('opening_hours')} placeholder="למשל: א׳-ה׳ 08:00-22:00" />
                      </Field>
                      <Field label="תיאור קצר" error={fieldErrors.short_description}>
                        <input className={inputCls} maxLength={200} value={form.short_description} onChange={set('short_description')} />
                      </Field>
                      <Field label="תיאור" error={fieldErrors.description}>
                        <textarea className={`${inputCls} resize-none`} rows={4} maxLength={2000} value={form.description} onChange={set('description')} />
                      </Field>
                      <Field label="הערה למנהל (אופציונלי)">
                        <textarea className={`${inputCls} resize-none`} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                      </Field>
                    </>
                  )}

                  {mode === 'photos' && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        העלה תמונות שצילמת בעצמך (JPG, PNG, WEBP עד 5MB). המנהל יאשר אותן לפני שיופיעו.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {images.map((url) => (
                          <div key={url} className="relative">
                            <img src={url} alt="" className="h-20 w-20 rounded-xl object-cover bg-muted" />
                            <button
                              type="button"
                              onClick={() => setImages((list) => list.filter((u) => u !== url))}
                              className="absolute -top-2 -left-2 rounded-full bg-card border border-border p-1 shadow-sm"
                              aria-label="הסר תמונה"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {Array.from({ length: uploading }).map((_, i) => (
                          <div key={`up-${i}`} className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center">
                            <Loader2 size={18} className="animate-spin text-muted-foreground" />
                          </div>
                        ))}
                        {images.length + uploading < MAX_SUGGESTED_IMAGES && (
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-secondary"
                          >
                            <Camera size={20} />
                            הוסף
                          </button>
                        )}
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={onPickFiles}
                      />
                      <Field label="הערה למנהל (אופציונלי)">
                        <textarea className={`${inputCls} resize-none`} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                      </Field>
                    </>
                  )}

                  {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                </div>

                <div className="border-t border-border p-4 flex gap-3">
                  <button
                    type="submit"
                    disabled={saving || uploading > 0}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-40"
                  >
                    {saving && <Loader2 size={18} className="animate-spin" />}
                    שלח לאישור
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode(null); setError(''); }}
                    className="px-4 py-3 rounded-2xl text-sm hover:bg-secondary"
                  >
                    חזרה
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
