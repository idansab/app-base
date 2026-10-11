import React, { useState } from 'react';
import { BadgeCheck, Clapperboard, Sparkles, Wallet } from 'lucide-react';
import { formatBetaDate } from '@/lib/beta';

/**
 * Shown once, before an approved owner gets control of their page: what the beta gives them,
 * what changes when it ends, and why joining early is worth it. `beta` is public_beta_info().
 */
export default function OwnerBetaWelcome({ beta, onAccept }) {
  const [checked, setChecked] = useState(false);
  const endDate = beta?.ends_at ? formatBetaDate(beta.ends_at) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-welcome-title"
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
    >
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card p-6 text-right space-y-5">
        <div className="space-y-1">
          <h2 id="beta-welcome-title" className="text-xl font-bold text-foreground">
            ברוך הבא! העסק שלך אושר
          </h2>
          <p className="text-sm text-muted-foreground">לפני שאתה מקבל שליטה על העמוד, חשוב שתכיר את התמונה המלאה.</p>
        </div>

        <section className="rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-300 dark:border-green-800 p-4 space-y-1">
          <h3 className="flex items-center justify-end gap-2 font-bold text-green-900 dark:text-green-200">
            עכשיו, בתקופת הבטא <BadgeCheck size={18} />
          </h3>
          <p className="text-sm text-green-900 dark:text-green-200">
            {endDate ? `עד ${endDate} ` : 'במהלך הבטא '}
            כל היכולות פתוחות לך בחינם: עריכת העמוד, שינויים שמתפרסמים מיד ונתוני צפיות, ניווטים ושיחות.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="flex items-center justify-end gap-2 font-bold text-foreground">
            מה יקרה אחרי הבטא <Wallet size={18} className="text-muted-foreground" />
          </h3>
          <ul className="text-sm text-foreground space-y-1.5 list-disc list-inside">
            <li>העמוד של העסק נשאר באתר והוא ממשיך להופיע.</li>
            <li>יכולות מתקדמות, כמו עריכה, נתונים וקידום, יעברו למנוי חודשי.</li>
            <li>נודיע לך מראש לפני סיום הבטא, ושום תשלום לא יתבצע בלי אישור שלך.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="flex items-center justify-end gap-2 font-bold text-foreground">
            למה שווה להתחיל כבר עכשיו <Sparkles size={18} className="text-amber-500" />
          </h3>
          <ul className="text-sm text-foreground space-y-1.5 list-disc list-inside">
            <li>תבנה את העמוד ותראה בנתונים כמה אנשים מגיעים, מנווטים ומתקשרים אליך.</li>
            <li>
              <Clapperboard size={14} className="inline ml-1" />
              בקרוב נפתח את "גלה": סרטונים קצרים של עסקים, עם מעבר ישיר לעמוד שלך. בעלי עסקים שכבר פעילים יהיו הראשונים לדעת.
            </li>
          </ul>
        </section>

        <label className="flex items-start gap-3 justify-end cursor-pointer text-sm text-foreground">
          <span>קראתי והבנתי שאחרי תקופת הבטא חלק מהיכולות יהיו בתשלום</span>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 accent-green-600"
          />
        </label>

        <button
          onClick={onAccept}
          disabled={!checked}
          className="w-full rounded-2xl bg-green-600 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-40"
        >
          קבל שליטה על העמוד
        </button>
      </div>
    </div>
  );
}
