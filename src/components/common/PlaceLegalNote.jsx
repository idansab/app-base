import React, { useState } from 'react';
import { Flag, Info } from 'lucide-react';
import FeedbackDialog from '@/components/FeedbackDialog';

/** The "not verified" notice and a way to report content, shown at the bottom of a place. */
export default function PlaceLegalNote({ place, className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`text-right text-xs leading-relaxed text-muted-foreground ${className}`}>
      <p className="flex items-start justify-start gap-1.5">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          המידע מגיע ממקורות ציבוריים ומהקהילה ואינו מאומת: שעות, נגישות, חניה, כשרות ומחירים עלולים להיות לא מדויקים או לא עדכניים.
          מומלץ לוודא מול המקום לפני ההגעה. הפעילות והביקור במקום הם על אחריות המבקר.
        </span>
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1 underline hover:text-foreground"
      >
        <Flag size={12} aria-hidden="true" />
        דיווח על תוכן שגוי או פוגעני
      </button>
      {open && <FeedbackDialog initialKind="report" subject={`מקום: ${place?.name || place?.id || ''}`} onClose={() => setOpen(false)} />}
    </div>
  );
}
