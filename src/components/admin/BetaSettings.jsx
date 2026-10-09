import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import ConfirmDialog from '@/components/ConfirmDialog';
import { daysLeft, endOfDayIsrael, formatBetaDate, toDateInputValue } from '@/lib/beta';

/**
 * Beta period: until the end date (and while the switch is on) every approved owner gets the
 * paid capabilities for free. Changing it is logged and takes effect immediately everywhere.
 */
export default function BetaSettings({ onError, onSuccess }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [everyonePro, setEveryonePro] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('public_beta_info');
      if (error) throw error;
      setInfo(data);
      setDate(toDateInputValue(data.ends_at));
      setEveryonePro(data.everyone_pro);
    } catch (e) {
      console.error('Failed to load beta settings:', e);
      onError?.('שגיאה בטעינת הגדרות הבטא');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const endsAt = endOfDayIsrael(date);
  const changed = info && (toDateInputValue(info.ends_at) !== date || info.everyone_pro !== everyonePro);
  const days = info ? daysLeft(info.ends_at) : null;
  const newDays = endsAt ? daysLeft(endsAt) : null;
  const endsNow = everyonePro === false || newDays === 0;

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_set_beta', { p_ends_at: endsAt, p_everyone_pro: everyonePro });
      if (error) throw error;
      onSuccess?.('הגדרות הבטא עודכנו');
      setConfirmOpen(false);
      await load();
    } catch (e) {
      console.error('Saving beta settings failed:', e);
      onError?.('שגיאה בשמירת הגדרות הבטא');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !info) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="space-y-6 max-w-2xl mr-auto ml-0" dir="rtl">
      <div className="text-right">
        <h1 className="text-2xl font-bold text-foreground">הגדרות</h1>
        <p className="text-sm text-muted-foreground">תקופת הבטא וההטבות לבעלי עסקים</p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 space-y-5 text-right">
        <div className="flex items-start justify-between gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              info.active ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {info.active ? 'הבטא פעילה' : 'הבטא הסתיימה'}
          </span>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-foreground">תקופת בטא</h2>
            <CalendarClock size={18} className="text-muted-foreground" />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {info.active
            ? `בעלי עסקים מאושרים מקבלים את היכולות בתשלום בחינם עד ${formatBetaDate(info.ends_at)} (עוד ${days} ימים).`
            : 'בעלי עסקים מקבלים רק את היכולות החינמיות.'}
        </p>

        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1">תאריך סוף הבטא</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <span className="block text-xs text-muted-foreground mt-1">הבטא מסתיימת בסוף היום הנבחר, לפי שעון ישראל.</span>
        </label>

        <label className="flex items-center justify-end gap-3 cursor-pointer">
          <span className="text-sm text-foreground">
            כל בעל עסק מאושר מקבל את החבילה המלאה בחינם
            <span className="block text-xs text-muted-foreground">כיבוי מסיים את ההטבה מיד, בלי קשר לתאריך.</span>
          </span>
          <input
            type="checkbox"
            checked={everyonePro}
            onChange={(e) => setEveryonePro(e.target.checked)}
            className="w-5 h-5"
          />
        </label>

        {changed && endsNow && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>השינוי מסיים את תקופת ההטבה מיד. בעלי עסקים לא יוכלו לערוך ישירות, ובקשות העדכון שלהם יעברו אליך לאישור.</span>
          </div>
        )}

        <div className="flex justify-start gap-2">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!changed || !endsAt}
            className="px-5 py-2 rounded-2xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-40"
          >
            שמור שינויים
          </button>
          {changed && (
            <button
              onClick={() => {
                setDate(toDateInputValue(info.ends_at));
                setEveryonePro(info.everyone_pro);
              }}
              className="px-4 py-2 rounded-2xl hover:bg-secondary"
            >
              בטל
            </button>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 text-right space-y-2">
        <h2 className="font-bold text-foreground">מה בתשלום אחרי הבטא</h2>
        <ul className="text-sm text-foreground list-disc pr-5 space-y-1">
          <li>עריכה ישירה של פרטי המקום בלי אישור שלך.</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          כל השאר נשאר חינם: בקשות עדכון (באישורך), שעות פתיחה, תמונה, וכשרות. התשלום עצמו עדיין לא מחובר.
        </p>
      </section>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="שינוי תקופת הבטא"
        message={
          endsNow
            ? 'ההטבה לבעלי עסקים תיגמר מיד. להמשיך?'
            : `הבטא תסתיים בסוף ${formatBetaDate(endsAt)} (עוד ${newDays} ימים). להמשיך?`
        }
        variant={endsNow ? 'danger' : 'warning'}
        isDangerous={endsNow}
        confirmText="אישור"
        cancelText="ביטול"
        isLoading={saving}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
