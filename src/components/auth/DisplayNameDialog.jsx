import React, { useState } from 'react';
import { Loader2, UserRound } from 'lucide-react';
import { DISPLAY_NAME_MAX, displayNameProblem } from '@/lib/displayName';

/**
 * Asks a signed-in user without a display name to choose one.
 * reason 'login': shown once after signing in, "later" allowed. reason 'action': they tried to comment/suggest/chat.
 */
export default function DisplayNameDialog({ reason, onSave, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const problem = displayNameProblem(name);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(name);
      onClose(true);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 sm:p-4" dir="rtl">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="display-name-title"
        className="w-full max-w-md bg-card text-foreground sm:rounded-3xl rounded-t-3xl p-6 space-y-4 text-right"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/10 p-2.5 text-primary">
            <UserRound size={22} />
          </span>
          <h2 id="display-name-title" className="text-lg font-bold">
            {reason === 'action' ? 'לפני שממשיכים: איך לקרוא לך?' : 'בחרו שם שיוצג באתר'}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          השם יופיע ליד תגובות, הודעות בצ׳אט, הצעות לשינוי ותמונות שתעלו. כתובת האימייל שלך לא מוצגת לאף אחד.
        </p>
        <div>
          <label htmlFor="display-name-input" className="block text-sm font-medium mb-1">שם תצוגה</label>
          <input
            id="display-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={DISPLAY_NAME_MAX + 10}
            autoFocus
            autoComplete="nickname"
            placeholder="למשל: דנה מהגליל"
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-background text-foreground"
          />
          {error && <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            שמירה
          </button>
          <button type="button" onClick={() => onClose(false)} className="rounded-lg px-4 py-2 text-muted-foreground hover:bg-secondary">
            {reason === 'action' ? 'ביטול' : 'אחר כך'}
          </button>
        </div>
      </form>
    </div>
  );
}
