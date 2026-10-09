import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  MapPin,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { geocodeAddress } from '@/lib/geo';
import { CATEGORIES } from '@/lib/categories';
import {
  EMPTY_FORM,
  ISSUES,
  PRICE_LEVELS,
  STATUS_LABELS,
  formToPayload,
  getIssues,
  placeToForm,
} from './placeUtils';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

const inputCls =
  'w-full px-3 py-2 border rounded-xl bg-background text-foreground text-right focus:outline-none focus:ring-2 focus:ring-green-600';

function Field({ label, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-foreground mb-1 text-right">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1 text-right">{error}</span>}
    </label>
  );
}

/**
 * Side drawer editor. Mounted with key={place id} by the parent, so all state
 * starts fresh for every place the admin steps to.
 */
export default function PlaceDrawer({
  place, // null => new place
  template, // optional prefilled form for a new place (duplicate)
  position, // e.g. "3 / 40" (optional)
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onSave, // (payload, id|null) => Promise<savedRow>
  onDelete,
  onDuplicate,
  onError,
  onSuccess,
}) {
  const initial = useMemo(() => (place ? placeToForm(place) : template || EMPTY_FORM), [place, template]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(null); // null | 'close' | 'prev' | 'next'
  const [history, setHistory] = useState([]);
  const fileRef = useRef(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const issues = useMemo(
    () => getIssues({ ...form, tags: form.tags.split(',') }),
    [form]
  );

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Per-place change history from the audit log (silently hidden if unavailable)
  useEffect(() => {
    if (!place?.id) return;
    let cancelled = false;
    supabase
      .from('admin_audit_log')
      .select('action, details, created_at')
      .eq('target_type', 'places')
      .eq('target_id', place.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (!cancelled && !error) setHistory(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [place?.id]);

  const guard = useCallback(
    (action, run) => {
      if (dirty) setConfirmDiscard(action);
      else run();
    },
    [dirty]
  );

  const save = useCallback(
    async (thenGoNext = false) => {
      const { payload, errors: validation } = formToPayload(form);
      setErrors(validation);
      if (!payload) {
        onError?.('יש שדות חסרים או לא תקינים');
        return;
      }
      setSaving(true);
      try {
        await onSave(payload, place?.id ?? null);
        onSuccess?.('המקום נשמר');
        if (thenGoNext && hasNext) onNext();
        else if (!place) onClose();
      } catch (e) {
        console.error('Save place failed:', e);
        onError?.('שגיאה בשמירת המקום');
      } finally {
        setSaving(false);
      }
    },
    [form, hasNext, onClose, onError, onNext, onSave, onSuccess, place]
  );

  // Keyboard: Ctrl/Cmd+S saves, Esc closes (with the unsaved-changes guard)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving) save(false);
      } else if (e.key === 'Escape') {
        guard('close', onClose);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guard, onClose, save, saving]);

  const handleGeocode = async () => {
    const query = [form.address, form.city].filter(Boolean).join(', ');
    if (!query) {
      onError?.('הכנס כתובת קודם');
      return;
    }
    setGeocoding(true);
    try {
      const result = await geocodeAddress(query);
      if (!result) {
        onError?.('הכתובת לא נמצאה');
        return;
      }
      setForm((f) => ({ ...f, lat: String(result.lat), lng: String(result.lng) }));
      onSuccess?.('המיקום עודכן מהכתובת');
    } catch {
      onError?.('שגיאה בזיהוי הכתובת');
    } finally {
      setGeocoding(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    const ext = IMAGE_EXT[file.type];
    if (!ext) {
      onError?.('אפשר להעלות JPG, PNG, WEBP או GIF בלבד');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onError?.('התמונה גדולה מדי (מקסימום 5MB)');
      return;
    }
    setUploading(true);
    try {
      const path = `places/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const { error } = await supabase.storage.from('place-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('place-images').getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      onSuccess?.('התמונה הועלתה');
    } catch (e) {
      console.error('Image upload failed:', e);
      onError?.('שגיאה בהעלאת התמונה');
    } finally {
      setUploading(false);
    }
  };

  const hasCoords = Number.isFinite(Number(form.lat)) && Number.isFinite(Number(form.lng)) && form.lat !== '' && form.lng !== '';

  return (
    <div className="fixed inset-0 z-[45] flex justify-start" role="dialog" aria-modal="true" aria-label="עריכת מקום">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="סגור"
        onClick={() => guard('close', onClose)}
      />

      <aside className="relative w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-1">
            <button
              onClick={() => guard('prev', onPrev)}
              disabled={!hasPrev}
              className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30"
              aria-label="המקום הקודם"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => guard('next', onNext)}
              disabled={!hasNext}
              className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30"
              aria-label="המקום הבא"
            >
              <ChevronLeft size={18} />
            </button>
            {position && (
              <span dir="ltr" className="text-xs text-muted-foreground tabular-nums mr-1">
                {position}
              </span>
            )}
          </div>
          <h2 className="font-bold text-foreground truncate">{place ? form.name || 'עריכת מקום' : 'מקום חדש'}</h2>
          <button onClick={() => guard('close', onClose)} className="p-2 rounded-lg hover:bg-secondary" aria-label="סגור">
            <X size={18} />
          </button>
        </div>

        {confirmDiscard && (
          <div role="alert" className="px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-300 text-sm flex items-center justify-between gap-3">
            <span className="text-amber-800 dark:text-amber-200">יש שינויים שלא נשמרו.</span>
            <span className="flex gap-2">
              <button
                onClick={() => {
                  const action = confirmDiscard;
                  setConfirmDiscard(null);
                  if (action === 'close') onClose();
                  if (action === 'prev') onPrev();
                  if (action === 'next') onNext();
                }}
                className="px-3 py-1 rounded-lg bg-red-600 text-white"
              >
                בטל שינויים
              </button>
              <button onClick={() => setConfirmDiscard(null)} className="px-3 py-1 rounded-lg bg-secondary">
                המשך עריכה
              </button>
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {issues.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {issues.map((key) => (
                <span key={key} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <AlertTriangle size={12} /> {ISSUES[key].label}
                </span>
              ))}
            </div>
          )}

          {/* Image */}
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <Field label="תמונה (כתובת)">
                <input className={`${inputCls} border-border`} dir="ltr" placeholder="https://..." value={form.image_url} onChange={set('image_url')} />
              </Field>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-border hover:bg-secondary disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                העלאת תמונה
              </button>
            </div>
            <div className="w-28 h-28 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <ImagePlus className="text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="שם *" error={errors.name} className="col-span-2">
              <input className={`${inputCls} ${errors.name ? 'border-red-500' : 'border-border'}`} value={form.name} onChange={set('name')} />
            </Field>
            <Field label="קטגוריה">
              <select className={`${inputCls} border-border`} value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="סטטוס">
              <select className={`${inputCls} border-border`} value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="עיר">
              <input className={`${inputCls} border-border`} value={form.city} onChange={set('city')} />
            </Field>
            <Field label="טלפון">
              <input className={`${inputCls} border-border`} dir="ltr" value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label="כתובת *" error={errors.address} className="col-span-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={geocoding}
                  className="px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-sm flex items-center gap-1 disabled:opacity-50 shrink-0"
                >
                  {geocoding ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                  זהה מיקום
                </button>
                <input className={`${inputCls} ${errors.address ? 'border-red-500' : 'border-border'}`} value={form.address} onChange={set('address')} />
              </div>
            </Field>
            <Field label="קו רוחב (lat) *" error={errors.lat}>
              <input className={`${inputCls} ${errors.lat ? 'border-red-500' : 'border-border'}`} dir="ltr" inputMode="decimal" value={form.lat} onChange={set('lat')} />
            </Field>
            <Field label="קו אורך (lng) *" error={errors.lng}>
              <input className={`${inputCls} ${errors.lng ? 'border-red-500' : 'border-border'}`} dir="ltr" inputMode="decimal" value={form.lng} onChange={set('lng')} />
            </Field>
            {hasCoords && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${form.lat},${form.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-2 text-xs text-primary hover:underline flex items-center gap-1 justify-end"
              >
                <ExternalLink size={12} /> בדוק את המיקום ב-Google Maps
              </a>
            )}
            <Field label="תיאור קצר" className="col-span-2">
              <input className={`${inputCls} border-border`} value={form.short_description} onChange={set('short_description')} />
            </Field>
            <Field label="תיאור" className="col-span-2">
              <textarea className={`${inputCls} border-border resize-none`} rows={4} value={form.description} onChange={set('description')} />
            </Field>
            <Field label="שעות פתיחה">
              <input className={`${inputCls} border-border`} value={form.opening_hours} onChange={set('opening_hours')} />
            </Field>
            <Field label="רמת מחיר">
              <select className={`${inputCls} border-border`} value={form.price_level} onChange={set('price_level')}>
                {PRICE_LEVELS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="דירוג (0-5)" error={errors.rating}>
              <input className={`${inputCls} ${errors.rating ? 'border-red-500' : 'border-border'}`} dir="ltr" inputMode="decimal" value={form.rating} onChange={set('rating')} />
            </Field>
            <Field label="תגיות (מופרדות בפסיק)">
              <input className={`${inputCls} border-border`} value={form.tags} onChange={set('tags')} />
            </Field>
          </div>

          {history.length > 0 && (
            <div className="rounded-xl border border-border p-3 text-right">
              <p className="text-sm font-medium text-foreground mb-2">שינויים אחרונים</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {history.map((h, i) => (
                  <li key={i}>
                    {new Date(h.created_at).toLocaleString('he-IL')} ·{' '}
                    {h.action === 'delete'
                      ? 'נמחק'
                      : `סטטוס: ${STATUS_LABELS[h.details?.from] || h.details?.from} ← ${STATUS_LABELS[h.details?.to] || h.details?.to}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => save(false)}
            disabled={saving || (!dirty && !!place)}
            className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            שמור
          </button>
          {place && hasNext && (
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 font-medium disabled:opacity-50"
            >
              ‹ שמור והבא
            </button>
          )}
          <span className="flex-1" />
          {place && (
            <>
              <button onClick={() => onDuplicate(place)} className="p-2 rounded-xl hover:bg-secondary" aria-label="שכפל מקום" title="שכפל">
                <Copy size={18} />
              </button>
              <button onClick={() => onDelete(place)} className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950" aria-label="מחק מקום" title="מחק">
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
        <p className="px-4 pb-3 text-[11px] text-muted-foreground text-center hidden sm:block">Ctrl+S לשמירה · Esc לסגירה</p>
      </aside>
    </div>
  );
}
