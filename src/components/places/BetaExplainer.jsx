import React from 'react';
import { BadgeCheck, Clapperboard, Sparkles, Wallet } from 'lucide-react';
import { formatBetaDate } from '@/lib/beta';

/**
 * What a business gets during the beta, what changes afterwards and why joining now is worth it.
 * Shown inside the ownership-request form. `beta` is public_beta_info(). No prices on purpose:
 * there is no billing yet.
 */
export default function BetaExplainer({ beta }) {
  const endDate = beta?.ends_at ? formatBetaDate(beta.ends_at) : null;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-4 text-right">
      <section className="space-y-1">
        <h3 className="flex items-center justify-end gap-2 text-sm font-bold text-green-800 dark:text-green-300">
          עכשיו, בתקופת הבטא <BadgeCheck size={16} />
        </h3>
        <p className="text-sm text-foreground">
          {endDate ? `עד ${endDate} ` : 'במהלך הבטא '}
          כל היכולות פתוחות בחינם: עריכת העמוד, שינויים שמתפרסמים מיד ונתוני צפיות, ניווטים ושיחות.
        </p>
      </section>

      <section className="space-y-1">
        <h3 className="flex items-center justify-end gap-2 text-sm font-bold text-foreground">
          מה יקרה אחרי הבטא <Wallet size={16} className="text-muted-foreground" />
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
          <li>העמוד של העסק נשאר באתר והוא ממשיך להופיע.</li>
          <li>יכולות מתקדמות, כמו עריכה, נתונים וקידום, יעברו למנוי חודשי.</li>
          <li>בשלב הזה אין תשלום ואין סליקה. מחירים ותנאים יעודכנו בהמשך, ונודיע לך מראש.</li>
        </ul>
      </section>

      <section className="space-y-1">
        <h3 className="flex items-center justify-end gap-2 text-sm font-bold text-foreground">
          למה שווה להצטרף כבר עכשיו <Sparkles size={16} className="text-amber-500" />
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
          <li>תבנה את העמוד ותראה בנתונים כמה אנשים מגיעים, מנווטים ומתקשרים אליך.</li>
          <li>
            <Clapperboard size={14} className="ml-1 inline" />
            בלשונית "גלה" נציג סרטונים קצרים של עסקים עם מעבר ישיר לעמוד שלהם. בהמשך עסקים עם מנוי יוכלו לפרסם שם סרטונים.
          </li>
        </ul>
      </section>
    </div>
  );
}
