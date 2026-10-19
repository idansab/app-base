import React, { useEffect, useState } from 'react';
import { Check, Loader2, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { DISPLAY_NAME_MAX, displayNameProblem, normalizeDisplayName } from '@/lib/displayName';

/** The public name shown on comments, chat, suggestions and photo credits. */
export default function DisplayNameSetting() {
  const { displayName, setDisplayName } = useAuth();
  const [name, setName] = useState(displayName);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setName(displayName), [displayName]);

  const unchanged = normalizeDisplayName(name) === displayName;

  const save = async (e) => {
    e.preventDefault();
    const problem = displayNameProblem(name);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await setDisplayName(name);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="p-4 bg-secondary rounded-lg mb-3 text-right space-y-2">
      <label htmlFor="settings-display-name" className="flex items-center justify-between font-medium text-foreground">
        <UserRound size={20} className="text-muted-foreground" />
        <span>שם תצוגה</span>
      </label>
      <div className="flex gap-2">
        <input
          id="settings-display-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          maxLength={DISPLAY_NAME_MAX + 10}
          autoComplete="nickname"
          className="flex-1 min-w-0 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-background text-foreground"
        />
        <button
          type="submit"
          disabled={saving || unchanged}
          className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved && unchanged ? <Check size={16} /> : null}
          שמירה
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">מופיע ליד תגובות, הודעות בצ׳אט, הצעות ותמונות שהעלית. האימייל לא מוצג.</p>
      )}
    </form>
  );
}
