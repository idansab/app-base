import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Film, Loader2, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { deleteVideo, inspectVideo, loadAll, submitOwnerVideo } from '@/lib/discoverApi';
import { VIDEO_SPEC, checkVideoMeta, formatBytes, validateVideoFile, validateVideoText } from '@/lib/videoSpec';

const STATUS = {
  pending: ['ממתין לאישור', 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'],
  approved: ['מוצג ב"גלו"', 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'],
  hidden: ['מוסתר', 'bg-muted text-foreground dark:bg-slate-800 dark:text-slate-200'],
  rejected: ['נדחה', 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'],
};

function SpecBox() {
  const rows = [
    ['כיוון ויחס', `אנכי (כמו סטורי), ${VIDEO_SPEC.ratio}`],
    ['רזולוציה מומלצת', `${VIDEO_SPEC.width}×${VIDEO_SPEC.height}`],
    ['אורך', `${VIDEO_SPEC.idealSeconds} שניות מומלץ (מינימום ${VIDEO_SPEC.minSeconds}, מקסימום ${VIDEO_SPEC.maxSeconds})`],
    ['קובץ', `MP4 (H.264), עד ${formatBytes(VIDEO_SPEC.maxBytes)}`],
    ['כותרת', `עד ${VIDEO_SPEC.maxTitle} תווים, משפט שמושך לצפות`],
    ['תיאור', `עד ${VIDEO_SPEC.maxDescription} תווים, מה מחכה לגולש אצלך`],
  ];
  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-3 text-right text-sm">
      <p className="mb-2 font-bold text-foreground">איך הסרטון צריך להיראות</p>
      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2"><dt className="shrink-0 font-medium text-foreground">{k}:</dt><dd className="text-muted-foreground">{v}</dd></div>
        ))}
      </dl>
      <ul className="mt-2 list-disc pr-5 text-xs text-muted-foreground space-y-0.5">
        <li>צלמו בטלפון לאורך, והכניסו את החלק החשוב לאמצע המסך (הכיתוב בתחתית מכסה את השליש התחתון).</li>
        <li>פתחו ב-3 השניות הראשונות במשהו שרואים, בלי לוגו ארוך.</li>
        <li>אפשר בלי קול: רוב הצופים רואים בלי סאונד, אז הוסיפו כתוביות.</li>
        <li>רק חומר שאתם הבעלים שלו (תמונות, מוזיקה, אנשים בסרטון בהסכמה). הסרטון עובר אישור לפני פרסום.</li>
      </ul>
    </div>
  );
}

function UploadDialog({ places, onClose, onUploaded }) {
  const fileInput = useRef(null);
  const [placeId, setPlaceId] = useState(places[0]?.id || '');
  const [file, setFile] = useState(null);
  const [inspected, setInspected] = useState(null);
  const [check, setCheck] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const picked = e.target.files?.[0];
    setError('');
    setCheck(null);
    setInspected(null);
    setFile(null);
    if (!picked) return;
    const problem = validateVideoFile(picked);
    if (problem) return setError(problem);
    setFile(picked);
    const info = await inspectVideo(picked);
    setInspected(info);
    return setCheck(checkVideoMeta(info.meta));
  };

  const textErrors = validateVideoText({ title, description });
  const ready = file && inspected && check && !check.error && rights && placeId && Object.keys(textErrors).length === 0;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await submitOwnerVideo({ file, placeId, title, description, inspected });
      onUploaded();
      onClose();
    } catch (e) {
      setError(e.message || 'ההעלאה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true" aria-label="העלאת סרטון">
      <div className="max-h-[92dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-3xl bg-card p-5 text-right sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <button onClick={onClose} aria-label="סגור" className="rounded-full p-1.5 hover:bg-secondary"><X size={20} /></button>
          <h2 className="text-lg font-bold text-foreground">סרטון חדש ל"גלו"</h2>
        </div>

        <SpecBox />

        {places.length > 1 && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">עבור איזה עסק?</span>
            <select value={placeId} onChange={(e) => setPlaceId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2">
              {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}

        <div>
          <input ref={fileInput} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={pick} className="hidden" />
          <button onClick={() => fileInput.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-5 text-sm font-medium text-foreground hover:bg-secondary">
            <Upload size={18} /> {file ? `${file.name} (${formatBytes(file.size)})` : 'בחר קובץ וידאו'}
          </button>
          {file && !check && <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> בודק את הסרטון…</p>}
          {check?.error && <p className="mt-2 text-sm text-red-600">{check.error}</p>}
          {check && !check.error && (
            <ul className="mt-2 space-y-0.5 text-xs">
              <li className="text-green-700 dark:text-green-300">הסרטון תקין: {Math.round(inspected.meta.duration)} שניות, {inspected.meta.width}×{inspected.meta.height}</li>
              {check.warnings.map((w) => <li key={w} className="text-amber-700 dark:text-amber-300">שימו לב: {w}</li>)}
            </ul>
          )}
        </div>

        <label className="block text-sm">
          <span className="mb-1 flex justify-between font-medium text-foreground"><span className="text-xs text-muted-foreground">{title.length}/{VIDEO_SPEC.maxTitle}</span>כותרת</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={VIDEO_SPEC.maxTitle} placeholder="למשל: הקפה הכי טוב בעמק" className="w-full rounded-xl border border-border bg-background px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 flex justify-between font-medium text-foreground"><span className="text-xs text-muted-foreground">{description.length}/{VIDEO_SPEC.maxDescription}</span>תיאור קצר (לא חובה)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={VIDEO_SPEC.maxDescription} rows={3} placeholder="מה מחכה לגולש אצלך? שעות, מבצע, מה מיוחד" className="w-full rounded-xl border border-border bg-background px-3 py-2" />
        </label>

        <label className="flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-1" />
          <span>אני מאשר שהסרטון שלי או שיש לי רשות להשתמש בו (כולל מוזיקה ואנשים שמופיעים בו), ושאני מסכים שיוצג באתר אחרי אישור.</span>
        </label>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button disabled={!ready || busy} onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50">
          {busy && <Loader2 size={18} className="animate-spin" />} {busy ? 'מעלה… אל תסגור את הדף' : 'שלח לאישור'}
        </button>
      </div>
    </div>
  );
}

/** "My business": the owner's Discover videos and the upload form. */
export default function OwnerVideos({ places }) {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const rows = await loadAll(); // RLS returns the owner's own rows plus approved ones
      setVideos(rows.filter((v) => v.owner_id === user?.id));
    } catch (e) {
      console.error('Failed to load owner videos:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (video) => {
    if (!window.confirm(`למחוק את "${video.title}"?`)) return;
    setBusyId(video.id);
    try {
      await deleteVideo(video);
      setVideos((list) => list.filter((v) => v.id !== video.id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-2xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          <Upload size={16} /> העלאת סרטון
        </button>
        <h2 className="flex items-center gap-2 font-bold text-foreground"><Film size={18} /> הסרטונים שלי ב"גלו"</h2>
      </div>
      <p className="text-right text-xs text-muted-foreground">סרטון אנכי קצר שמופיע בלשונית "גלו" עם קישור לעמוד שלך. כל סרטון נבדק לפני שהוא עולה.</p>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary" /></div>
      ) : videos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">עוד לא העלית סרטונים</p>
      ) : (
        <ul className="space-y-2">
          {videos.map((video) => {
            const [label, tone] = STATUS[video.status] || STATUS.pending;
            return (
              <li key={video.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-right">
                <button disabled={busyId === video.id} onClick={() => remove(video)} aria-label="מחק סרטון" className="rounded-xl border border-red-300 p-2 text-red-700 disabled:opacity-50"><Trash2 size={16} /></button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{video.title}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
                  {video.status === 'rejected' && video.review_note && <p className="mt-1 text-xs text-red-700 dark:text-red-300">סיבה: {video.review_note}</p>}
                </div>
                {video.poster_url && <img src={video.poster_url} alt="" className="h-16 w-9 shrink-0 rounded-lg object-cover" />}
              </li>
            );
          })}
        </ul>
      )}

      {open && <UploadDialog places={places} onClose={() => setOpen(false)} onUploaded={load} />}
    </section>
  );
}
