import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { addComment, deleteComment, loadComments } from '@/lib/discoverApi';
import { COMMENT_MAX, commentAuthor, timeAgo, validateCommentBody } from '@/lib/videoComments';

/** Bottom panel with a video's comments, like TikTok's. */
export default function VideoComments({ video, onClose, onCountChange }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadComments(video.id)
      .then((rows) => !cancelled && setComments(rows))
      .catch((e) => {
        if (cancelled) return;
        setComments([]);
        toast.error(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [video.id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (next) => {
    setComments(next);
    onCountChange(next.length);
  };

  const send = async (e) => {
    e.preventDefault();
    const problem = validateCommentBody(text);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSending(true);
    try {
      const saved = await addComment(video.id, text);
      update([...(comments || []), saved]);
      setText('');
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (comment) => {
    try {
      await deleteComment(comment.id);
      update(comments.filter((c) => c.id !== comment.id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onClose} dir="rtl">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="תגובות"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[70dvh] w-full max-w-[480px] flex-col rounded-t-2xl bg-background text-foreground shadow-xl animate-in slide-in-from-bottom"
      >
        <div className="relative border-b px-4 py-3 text-center font-bold">
          {comments ? `${comments.length} תגובות` : 'תגובות'}
          <button type="button" onClick={onClose} aria-label="סגירה" className="absolute left-3 top-2.5 rounded-full p-1 hover:bg-muted">
            <X size={20} />
          </button>
        </div>

        <ul ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {comments === null && (
            <li className="flex justify-center py-6">
              <Loader2 className="animate-spin text-primary" />
            </li>
          )}
          {comments?.length === 0 && <li className="py-6 text-center text-muted-foreground">עוד אין תגובות. תהיו הראשונים</li>}
          {comments?.map((c) => (
            <li key={c.id} className="text-right">
              <div className="flex items-center gap-2 text-xs">
                {c.is_owner ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 font-bold text-primary-foreground">{commentAuthor(c)}</span>
                ) : (
                  <span className="font-bold">{commentAuthor(c)}</span>
                )}
                <span className="text-muted-foreground">{timeAgo(c.created_at)}</span>
                {user?.id === c.user_id && (
                  <button type="button" onClick={() => remove(c)} aria-label="מחיקת התגובה" className="mr-auto text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </li>
          ))}
        </ul>

        {isAuthenticated ? (
          <form onSubmit={send} className="flex items-center gap-2 border-t px-3 py-2.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={COMMENT_MAX}
              placeholder="הוסיפו תגובה..."
              aria-label="תגובה"
              className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="שליחה"
              className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-40"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="-scale-x-100" />}
            </button>
          </form>
        ) : (
          <div className="border-t px-4 py-3 text-center">
            <button type="button" onClick={() => navigate('/login?returnTo=/discover')} className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">
              התחברו כדי להגיב
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
