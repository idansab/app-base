import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Minimal filter panel: a few switches, grouped, with a live result count.
 * `filters`: [{ key, label, group, active, toggle, count, hint? }]  (only the ones worth showing)
 */
export default function FilterSheet({ filters, resultCount, onClear, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const groups = [...new Set(filters.map((f) => f.group))];
  const anyActive = filters.some((f) => f.active);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="סינון"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div dir="rtl" className="w-full max-w-md max-h-[85dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-card text-foreground shadow-xl">
        <div className="flex items-center justify-between px-5 py-4">
          <button type="button" onClick={onClose} className="p-2 -m-2 rounded-full hover:bg-secondary" aria-label="סגור">
            <X size={20} />
          </button>
          <h2 className="text-lg font-bold">סינון</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-5">
          {groups.map((group) => (
            <section key={group}>
              <h3 className="mb-1 text-xs font-medium text-muted-foreground">{group}</h3>
              <ul className="divide-y divide-border">
                {filters.filter((f) => f.group === group).map((f) => (
                  <li key={f.key}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={f.active}
                      onClick={f.toggle}
                      className="flex w-full items-center gap-3 py-3 text-right"
                    >
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{f.label}</span>
                        {f.hint && <span className="block text-xs text-muted-foreground">{f.hint}</span>}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">{f.count}</span>
                      <span
                        aria-hidden="true"
                        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${f.active ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${f.active ? 'right-0.5' : 'right-[18px]'}`} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-border p-4">
          <button
            type="button"
            onClick={onClear}
            disabled={!anyActive}
            className="px-3 py-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            נקה הכל
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            הצג {resultCount} מקומות
          </button>
        </div>
      </div>
    </div>
  );
}
