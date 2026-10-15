import React from 'react';
import { AlertTriangle, Clock, CopyCheck, FilePlus2, Loader2, MapPin, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FIELD_LABELS } from './placeImport';

const SECTION_TONE = {
  insert: 'border-green-300 bg-green-50 text-green-800 dark:bg-green-950/60 dark:border-green-700 dark:text-green-200',
  fill: 'border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:border-sky-700 dark:text-sky-200',
  skip: 'border-border bg-muted text-muted-foreground',
  invalid: 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950/60 dark:border-red-800 dark:text-red-200',
};

function Section({ tone, icon: Icon, title, count, children, open = false }) {
  if (count === 0) return null;
  return (
    <details open={open} className={`rounded-2xl border ${SECTION_TONE[tone]}`}>
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium">
        <Icon size={16} />
        {title}
        <span className="tabular-nums mr-auto">{count}</span>
      </summary>
      <ul className="max-h-48 overflow-y-auto border-t border-current/20 px-4 py-2 text-sm text-foreground space-y-1.5">
        {children}
      </ul>
    </details>
  );
}

/** Preview of a CSV import: nothing is written until the admin confirms. */
export default function CsvImportDialog({ fileName, plan, isLoading, onConfirm, onCancel }) {
  if (!plan) return null;
  const { insert, fill, skip, invalid } = plan;
  const actionable = insert.length + fill.length;
  const locatedCount = insert.filter((i) => i.locatedBy).length;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[48]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={isLoading ? undefined : onCancel}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-import-title"
        className="fixed top-1/2 left-1/2 z-[49] max-w-lg w-[calc(100%-32px)] max-h-[85vh] flex flex-col bg-card rounded-3xl border border-border shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ x: '-50%', y: '-50%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-6 border-b border-border">
          <div className="min-w-0 text-right">
            <h2 id="csv-import-title" className="text-lg font-bold text-foreground">ייבוא מקומות מקובץ</h2>
            <p className="text-sm text-muted-foreground truncate" dir="ltr">{fileName}</p>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            aria-label="סגירה"
            className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            מקומות חדשים נכנסים כ"ממתינים" ויופיעו באישור מקומות. במקומות שכבר קיימים רק מידע חסר מושלם, שום ערך קיים לא נדרס.
          </p>
          {locatedCount > 0 && (
            <p className="text-sm text-sky-800 dark:text-sky-200">
              ל-{locatedCount} מקומות לא היו קואורדינטות בקובץ, והמיקום נמצא לפי הכתובת או שם המקום. כדאי לוודא את הנעיצה על המפה לפני האישור.
            </p>
          )}

          <Section tone="insert" icon={FilePlus2} title="מקומות חדשים לאישור" count={insert.length} open>
            {insert.map(({ line, place, warnings, locatedBy }) => (
              <li key={line}>
                <span className="font-medium">{place.name}</span>
                <span className="text-muted-foreground"> · {place.city || place.address}</span>
                {locatedBy && (
                  <span className="mr-2 inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                    <MapPin size={11} />
                    {locatedBy === 'address' ? 'מיקום לפי הכתובת' : 'מיקום לפי שם המקום'}
                  </span>
                )}
                {place.opening_schedule && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={11} className="shrink-0" />
                    {place.opening_hours}
                  </span>
                )}
                {warnings.length > 0 && (
                  <span className="block text-xs text-amber-700 dark:text-amber-300">שורה {line}: {warnings.join(', ')}</span>
                )}
              </li>
            ))}
          </Section>

          <Section tone="fill" icon={CopyCheck} title="קיימים, יושלם מידע חסר" count={fill.length} open>
            {fill.map(({ target, patch }) => (
              <li key={target.id}>
                <span className="font-medium">{target.name}</span>
                <span className="text-muted-foreground"> · {Object.keys(patch).map((k) => FIELD_LABELS[k] || k).join(', ')}</span>
              </li>
            ))}
          </Section>

          <Section tone="skip" icon={CopyCheck} title="כפילויות בלי מידע חדש (ידולגו)" count={skip.length}>
            {skip.map(({ line, name, reason }) => (
              <li key={line}>
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground"> · שורה {line} · {reason}</span>
              </li>
            ))}
          </Section>

          <Section tone="invalid" icon={AlertTriangle} title="שורות שלא ייובאו" count={invalid.length} open={actionable === 0}>
            {invalid.map(({ line, name, errors }) => (
              <li key={line}>
                <span className="font-medium">שורה {line}{name ? ` (${name})` : ''}</span>
                <span className="text-muted-foreground"> · {errors.join(', ')}</span>
              </li>
            ))}
          </Section>
        </div>

        <div className="flex gap-3 justify-end p-6 border-t border-border">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2 border border-border rounded-lg text-foreground font-medium hover:bg-secondary transition-colors disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || actionable === 0}
            className="px-6 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {actionable === 0 ? 'אין מה לייבא' : `ייבוא (${actionable})`}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
