import React from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  DAY_NAMES,
  emptyWeek,
  getOpenStatus,
  parseHoursText,
  summarizeSchedule,
  validateSchedule,
} from '@/lib/openingHours';

const MAX_RANGES_PER_DAY = 2;
const NOTE_MAX = 100;

const MODES = [
  ['unknown', 'לא ידוע'],
  ['always', 'פתוח תמיד'],
  ['weekly', 'לפי יום'],
];

const timeCls =
  'px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600';

/**
 * value: null | { type:'always', note? } | { type:'weekly', days, note? }
 * legacyText: the old free-text hours, used to offer an automatic conversion.
 */
export default function HoursEditor({ value, onChange, legacyText, textValue, onTextChange }) {
  const mode = value?.type ?? 'unknown';
  const error = validateSchedule(value);
  const suggestion = mode === 'unknown' ? parseHoursText(legacyText) : null;
  const status = value && !error ? getOpenStatus({ opening_schedule: value }) : null;

  const setMode = (next) => {
    if (next === 'unknown') onChange(null);
    else if (next === 'always') onChange({ type: 'always', note: value?.note });
    else onChange(value?.type === 'weekly' ? value : { ...emptyWeek(), note: value?.note });
  };

  const setRanges = (day, ranges) => onChange({ ...value, days: { ...value.days, [day]: ranges } });

  const updateRange = (day, index, position, time) => {
    const ranges = value.days[day].map((r, i) => (i === index ? (position === 0 ? [time, r[1]] : [r[0], time]) : r));
    setRanges(day, ranges);
  };

  const toggleDay = (day, open) => setRanges(day, open ? [['09:00', '17:00']] : []);

  const applyToAll = (fromDay) => {
    const source = value.days[fromDay];
    onChange({ ...value, days: Object.fromEntries(DAY_NAMES.map((_, d) => [d, source.map((r) => [...r])])) });
  };

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">שעות פתיחה</legend>
      <div className="flex items-center justify-between gap-2">
        {status?.short && (
          <span className="text-xs text-muted-foreground">כרגע: {status.short}</span>
        )}
        <span className="text-sm font-medium text-foreground mr-auto">שעות פתיחה</span>
      </div>

      <div className="inline-flex rounded-xl border border-border overflow-hidden" role="radiogroup" aria-label="סוג שעות פתיחה">
        {MODES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={mode === key}
            onClick={() => setMode(key)}
            className={`px-4 py-2 text-sm transition-colors ${
              mode === key ? 'bg-green-600 text-white' : 'bg-card text-foreground hover:bg-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {suggestion && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/40 p-3 text-sm">
          <button
            type="button"
            onClick={() => onChange(suggestion)}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 shrink-0"
          >
            <Sparkles size={14} /> החל
          </button>
          <span className="text-foreground text-right">
            זוהו שעות מהטקסט הקיים: <strong>{summarizeSchedule(suggestion)}</strong>
          </span>
        </div>
      )}

      {mode === 'weekly' && (
        <ul className="space-y-2">
          {DAY_NAMES.map((name, day) => {
            const ranges = value.days[day] || [];
            const open = ranges.length > 0;
            return (
              <li key={day} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
                <div className="flex flex-wrap items-center gap-2 flex-1 justify-start">
                  {open ? (
                    ranges.map((range, index) => (
                      <span key={index} className="inline-flex items-center gap-1" dir="ltr">
                        <input
                          type="time"
                          value={range[0]}
                          onChange={(e) => updateRange(day, index, 0, e.target.value)}
                          aria-label={`פתיחה ביום ${name}`}
                          className={timeCls}
                        />
                        <span>–</span>
                        <input
                          type="time"
                          value={range[1]}
                          onChange={(e) => updateRange(day, index, 1, e.target.value)}
                          aria-label={`סגירה ביום ${name}`}
                          className={timeCls}
                        />
                        {ranges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRanges(day, ranges.filter((_, i) => i !== index))}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                            aria-label="הסר טווח"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">סגור</span>
                  )}
                  {open && ranges.length < MAX_RANGES_PER_DAY && (
                    <button
                      type="button"
                      onClick={() => setRanges(day, [...ranges, ['16:00', '20:00']])}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Plus size={12} /> משמרת נוספת
                    </button>
                  )}
                  {open && (
                    <button
                      type="button"
                      onClick={() => applyToAll(day)}
                      className="text-xs text-primary hover:underline"
                    >
                      החל על כל הימים
                    </button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer w-28 justify-end">
                  <span className="font-medium text-foreground">{name}</span>
                  <input
                    type="checkbox"
                    checked={open}
                    onChange={(e) => toggleDay(day, e.target.checked)}
                    aria-label={`פתוח ביום ${name}`}
                    className="w-4 h-4"
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p role="alert" className="text-xs text-red-600 text-right">{error}</p>}

      {mode !== 'unknown' && (
        <label className="block">
          <span className="block text-xs text-muted-foreground mb-1 text-right">הערה (למשל: סגור בחגים)</span>
          <input
            value={value?.note ?? ''}
            maxLength={NOTE_MAX}
            onChange={(e) => onChange({ ...value, note: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </label>
      )}

      {mode !== 'weekly' && (
        <label className="block">
          <span className="block text-xs text-muted-foreground mb-1 text-right">
            טקסט להצגה{mode === 'unknown' ? ' (כשאין שעות מובנות)' : ''}
          </span>
          <input
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={mode === 'always' ? 'שטח פתוח' : 'למשל: לפי תיאום מראש'}
            className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </label>
      )}
    </fieldset>
  );
}
