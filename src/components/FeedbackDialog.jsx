import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const KINDS = [
  ['idea', 'רעיון או בקשה'],
  ['bug', 'משהו לא עובד'],
  ['praise', 'מילה טובה'],
  ['other', 'אחר'],
];

const inputCls =
  'w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-right focus:outline-none focus:ring-2 focus:ring-green-600';

/** "Send us feedback". Goes straight to the admin inbox; works without signing in. */
export default function FeedbackDialog({ onClose }) {
  const location = useLocation();
  const [kind, setKind] = useState('idea');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      setError('כתוב לנו לפחות כמה מילים (5 תווים)');
      return;
    }
    setSaving(true);
    setError('');
    const { error: rpcError } = await supabase.rpc('submit_feedback', {
      p_message: message.trim(),
      p_kind: kind,
      p_contact: contact.trim() || null,
      p_page: location.pathname,
    });
    setSaving(false);
    if (rpcError) {
      console.error('submit_feedback failed:', rpcError);
      setError(
        rpcError.hint === 'too_many_requests' || /rate limit/i.test(rpcError.message || '')
          ? 'שלחת הרבה הודעות בזמן קצר. נסה שוב מאוחר יותר.'
          : 'השליחה נכשלה. נסה שוב בעוד רגע.'
      );
      return;
    }
    setSent(true);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="שליחת משוב"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={submit} dir="rtl" className="w-full max-w-md bg-card text-foreground sm:rounded-3xl rounded-t-3xl max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-secondary" aria-label="סגור">
            <X size={20} />
          </button>
          <h2 className="text-lg font-bold">שתף דעה או הצע שיפור</h2>
        </div>

        {sent ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="mx-auto text-green-600" size={40} />
            <p role="status" className="text-lg font-semibold">תודה! קיבלנו</p>
            <p className="text-sm text-muted-foreground">אנחנו קוראים כל הודעה.</p>
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl bg-green-600 text-white font-medium hover:bg-green-700">
              סגור
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <label className="block">
                <span className="block text-sm font-medium mb-1">על מה?</span>
                <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
                  {KINDS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium mb-1">ההודעה שלך</span>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={5}
                  maxLength={2000}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium mb-1">איך לחזור אליך? (אופציונלי)</span>
                <input
                  className={inputCls}
                  dir="ltr"
                  maxLength={200}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="אימייל או טלפון"
                />
              </label>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="border-t border-border p-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-40"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                שלח
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
