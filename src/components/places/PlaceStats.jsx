import React, { useEffect, useState } from 'react';
import { Heart, Loader2, Navigation, Phone, Share2, Eye, X } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { compareLabel, compareToPrevious } from '@/lib/statsFormat';

const PERIODS = [7, 30, 90];
const KPIS = [
  ['view', 'צפיות', Eye],
  ['call', 'שיחות', Phone],
  ['navigate', 'ניווטים', Navigation],
  ['share', 'שיתופים', Share2],
  ['favorite', 'נשמר למועדפים', Heart],
];

function Kpi({ icon: Icon, label, value, previous }) {
  const cmp = compareToPrevious(value, previous);
  const tone = cmp.kind === 'up' || cmp.kind === 'new' ? 'text-green-600' : cmp.kind === 'down' ? 'text-red-600' : 'text-muted-foreground';
  return (
    <div className="rounded-2xl border border-border bg-background p-3 text-right">
      <div className="flex items-center justify-end gap-1.5 text-muted-foreground text-xs mb-1">
        {label} <Icon size={14} />
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className={`text-xs ${tone}`}>{compareLabel(cmp) || ' '}</p>
    </div>
  );
}

function ViewsChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.view));
  const total = days.reduce((sum, d) => sum + d.view, 0);
  return (
    <div>
      <div className="flex items-end gap-px h-28" dir="ltr" role="img" aria-label={`צפיות לפי יום: ${total} בסך הכול`}>
        {days.map((d) => (
          <div
            key={d.day}
            className={`flex-1 rounded-t-sm ${d.view > 0 ? 'bg-green-600' : 'bg-muted'}`}
            style={{ height: `${Math.max(4, (d.view / max) * 100)}%` }}
            title={`${new Date(d.day).toLocaleDateString('he-IL')}: ${d.view} צפיות`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1" dir="ltr">
        <span>{new Date(days[0].day).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</span>
        <span>{new Date(days[days.length - 1].day).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</span>
      </div>
    </div>
  );
}

/** Anonymous usage numbers for an owner's place. */
export default function PlaceStats({ place, onClose }) {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    setError(false);
    supabase.rpc('place_stats', { p_place_id: place.id, p_days: days }).then(({ data, error: rpcError }) => {
      if (cancelled) return;
      if (rpcError) setError(true);
      else setStats(data);
    });
    return () => {
      cancelled = true;
    };
  }, [place.id, days]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const empty = stats && Object.values(stats.totals).every((n) => n === 0) && Object.values(stats.previous).every((n) => n === 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 sm:p-4" role="dialog" aria-modal="true" aria-label="סטטיסטיקות">
      <div className="w-full max-w-xl bg-card text-foreground sm:rounded-3xl rounded-t-3xl max-h-[92dvh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-secondary" aria-label="סגור">
            <X size={20} />
          </button>
          <h2 className="text-lg font-bold">סטטיסטיקות · {place.name}</h2>
        </div>

        <div className="p-5 space-y-5">
          <div className="inline-flex rounded-xl border border-border overflow-hidden" role="radiogroup" aria-label="תקופה">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={days === p}
                onClick={() => setDays(p)}
                className={`px-4 py-2 text-sm ${days === p ? 'bg-green-600 text-white' : 'bg-card hover:bg-secondary'}`}
              >
                {p} ימים
              </button>
            ))}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-600">לא הצלחנו לטעון את הנתונים. נסה שוב מאוחר יותר.</p>
          ) : !stats ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {KPIS.map(([key, label, Icon]) => (
                  <Kpi key={key} icon={Icon} label={label} value={stats.totals[key]} previous={stats.previous[key]} />
                ))}
                <div className="rounded-2xl border border-border bg-background p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5 text-muted-foreground text-xs mb-1">
                    סה״כ במועדפים <Heart size={14} />
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{stats.favorites_total}</p>
                  <p className="text-xs">&nbsp;</p>
                </div>
              </div>

              {empty ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  עדיין אין נתונים לתקופה הזו. המדידה מתחילה כשמבקרים נכנסים לעמוד של העסק.
                </p>
              ) : (
                <section>
                  <h3 className="font-bold mb-3 text-right">צפיות לפי יום</h3>
                  <ViewsChart days={stats.days} />
                </section>
              )}

              <p className="text-xs text-muted-foreground text-right">
                המספרים אנונימיים: כל מבקר נספר פעם אחת בכל 30 דקות, והביקורים שלך בעמוד לא נספרים.
                האחוזים משווים לתקופה הקודמת שבאותו אורך.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
