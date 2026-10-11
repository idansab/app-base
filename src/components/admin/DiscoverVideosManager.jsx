import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, EyeOff, Inbox, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { byFeedOrder, deleteVideo, loadAll } from '@/lib/discoverApi';
import { VIDEO_SPEC, validateVideoText } from '@/lib/videoSpec';

const STATUS = {
  pending: ['ממתין לאישור', 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'],
  approved: ['מוצג', 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'],
  hidden: ['מוסתר', 'bg-muted text-foreground dark:bg-slate-800 dark:text-slate-200'],
  rejected: ['נדחה', 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'],
};
const FILTERS = [['all', 'הכול'], ['pending', 'ממתינים'], ['approved', 'מוצגים'], ['hidden', 'מוסתרים'], ['rejected', 'נדחו']];

function EditForm({ video, onSave, onCancel, busy }) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || '');
  const errors = validateVideoText({ title, description });
  const invalid = Object.keys(errors).length > 0;
  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={VIDEO_SPEC.maxTitle}
        aria-label="כותרת"
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-right"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        maxLength={200}
        aria-label="תיאור"
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-right"
      />
      {invalid && <p className="text-xs text-red-600">{Object.values(errors)[0]}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-xl border border-border px-3 py-1.5 text-sm">ביטול</button>
        <button
          disabled={invalid || busy}
          onClick={() => onSave({ title: title.trim(), description: description.trim() || null })}
          className="rounded-xl bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          שמור
        </button>
      </div>
    </div>
  );
}

/** Admin: every Discover video. Approve owner uploads, edit texts, reorder, hide, delete. */
export default function DiscoverVideosManager({ onError, onSuccess }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVideos((await loadAll()).sort(byFeedOrder));
    } catch (e) {
      console.error('Failed to load discover videos:', e);
      onError?.('שגיאה בטעינת הסרטונים');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (video, fields, okMessage) => {
    setBusyId(video.id);
    const { data: { user } } = await supabase.auth.getUser();
    const withReview = 'status' in fields ? { ...fields, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() } : fields;
    const { error } = await supabase.from('discover_videos').update(withReview).eq('id', video.id);
    setBusyId(null);
    if (error) return onError?.('העדכון נכשל');
    setVideos((list) => list.map((v) => (v.id === video.id ? { ...v, ...withReview } : v)));
    setEditingId(null);
    return onSuccess?.(okMessage);
  };

  const reject = (video) => {
    const note = window.prompt('סיבת הדחייה (תוצג לבעל העסק):', video.review_note || '');
    if (note === null) return;
    patch(video, { status: 'rejected', review_note: note.trim() || null }, 'הסרטון נדחה');
  };

  const remove = async (video) => {
    if (!window.confirm(`למחוק את "${video.title}" לצמיתות?`)) return;
    setBusyId(video.id);
    try {
      await deleteVideo(video);
      setVideos((list) => list.filter((v) => v.id !== video.id));
      onSuccess?.('הסרטון נמחק');
    } catch {
      onError?.('המחיקה נכשלה');
    } finally {
      setBusyId(null);
    }
  };

  // Renumber the live feed 10, 20, 30... so a swap is always unambiguous
  const move = async (video, dir) => {
    const live = videos.filter((v) => v.status === 'approved');
    const from = live.findIndex((v) => v.id === video.id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= live.length) return;
    const next = [...live];
    [next[from], next[to]] = [next[to], next[from]];
    setBusyId(video.id);
    const changed = next.map((v, i) => ({ id: v.id, sort_order: (i + 1) * 10 })).filter((row, i) => next[i].sort_order !== row.sort_order);
    const results = await Promise.all(changed.map((row) => supabase.from('discover_videos').update({ sort_order: row.sort_order }).eq('id', row.id)));
    setBusyId(null);
    if (results.some((r) => r.error)) {
      onError?.('שינוי הסדר נכשל');
      return load();
    }
    const orderById = new Map(next.map((v, i) => [v.id, (i + 1) * 10]));
    return setVideos((list) => list.map((v) => (orderById.has(v.id) ? { ...v, sort_order: orderById.get(v.id) } : v)).sort(byFeedOrder));
  };

  const visible = videos.filter((v) => filter === 'all' || v.status === filter);
  const pendingCount = videos.filter((v) => v.status === 'pending').length;
  const liveIds = videos.filter((v) => v.status === 'approved').map((v) => v.id);

  return (
    <div className="space-y-4">
      <div className="text-right">
        <h1 className="text-2xl font-bold text-foreground">סרטוני גלו</h1>
        <p className="text-sm text-muted-foreground">
          הסרטונים שמופיעים בלשונית "גלו". סרטונים שבעלי עסקים מעלים ממתינים כאן לאישור ולא מופיעים עד שתאשר.
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-2xl px-3 py-1.5 text-sm font-medium ${filter === key ? 'bg-green-600 text-white' : 'bg-secondary text-foreground'}`}
          >
            {label}
            {key === 'pending' && pendingCount > 0 && <span className="mr-1.5 rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border py-12 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2" />
          אין סרטונים להצגה
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((video) => {
            const [label, tone] = STATUS[video.status] || STATUS.pending;
            const busy = busyId === video.id;
            const liveIndex = liveIds.indexOf(video.id);
            return (
              <li key={video.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3 text-right">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {video.places?.name ? `העסק: ${video.places.name}` : 'סרטון של האתר'}
                      {video.duration_seconds ? ` · ${video.duration_seconds} שנ'` : ''}
                    </span>
                  </div>

                  {editingId === video.id ? (
                    <EditForm video={video} busy={busy} onCancel={() => setEditingId(null)} onSave={(fields) => patch(video, fields, 'הסרטון עודכן')} />
                  ) : (
                    <>
                      <h2 className="font-bold text-foreground">{video.title}</h2>
                      {video.description && <p className="text-sm text-muted-foreground">{video.description}</p>}
                      {video.review_note && video.status === 'rejected' && <p className="text-xs text-red-700 dark:text-red-300">סיבה: {video.review_note}</p>}
                    </>
                  )}

                  <div className="flex flex-wrap justify-end gap-1.5">
                    {video.status !== 'approved' && (
                      <button disabled={busy} onClick={() => patch(video, { status: 'approved', review_note: null }, 'הסרטון מוצג עכשיו ב"גלו"')} className="flex items-center gap-1 rounded-xl bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                        <Check size={14} /> {video.status === 'pending' ? 'אשר' : 'הצג'}
                      </button>
                    )}
                    {video.status === 'pending' && (
                      <button disabled={busy} onClick={() => reject(video)} className="flex items-center gap-1 rounded-xl border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50">
                        <X size={14} /> דחה
                      </button>
                    )}
                    {video.status === 'approved' && (
                      <button disabled={busy} onClick={() => patch(video, { status: 'hidden' }, 'הסרטון הוסתר')} className="flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50">
                        <EyeOff size={14} /> הסתר
                      </button>
                    )}
                    <button disabled={busy} onClick={() => setEditingId(video.id)} className="flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50">
                      <Pencil size={14} /> ערוך
                    </button>
                    {liveIndex >= 0 && (
                      <>
                        <button disabled={busy || liveIndex === 0} onClick={() => move(video, -1)} aria-label="הקדם בפיד" className="rounded-xl border border-border p-1.5 disabled:opacity-30"><ArrowUp size={14} /></button>
                        <button disabled={busy || liveIndex === liveIds.length - 1} onClick={() => move(video, 1)} aria-label="דחה בפיד" className="rounded-xl border border-border p-1.5 disabled:opacity-30"><ArrowDown size={14} /></button>
                      </>
                    )}
                    <button disabled={busy} onClick={() => remove(video)} aria-label="מחק" className="rounded-xl border border-red-300 p-1.5 text-red-700 disabled:opacity-50"><Trash2 size={14} /></button>
                  </div>
                </div>
                <video
                  src={video.video_url}
                  poster={video.poster_url || undefined}
                  controls
                  preload="none"
                  playsInline
                  className="h-44 w-24 shrink-0 rounded-xl bg-black object-contain"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
