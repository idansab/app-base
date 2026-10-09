import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, BarChart3, Clock, ExternalLink, Loader2, Pencil, Store } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import useOwnerOverview from '@/hooks/useOwnerOverview';
import OwnerEditor from '@/components/places/OwnerEditor';
import PlaceStats from '@/components/places/PlaceStats';
import { formatBetaDate, useBetaInfo } from '@/lib/beta';
import { getSeenAt, isNewDecision, markSeen } from '@/lib/ownerOverview';

const CLAIM_STATUS = {
  pending: ['נבדקת', 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'],
  approved: ['מאושרת', 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'],
  rejected: ['לא אושרה', 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'],
  revoked: ['בוטלה', 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'],
};

function NewBadge() {
  return <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">חדש</span>;
}

function RequestLine({ request, seenAt }) {
  if (request.status === 'pending') {
    return (
      <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
        <Clock size={12} /> בקשת עדכון ממתינה לאישור
      </p>
    );
  }
  const approved = request.status === 'approved';
  return (
    <p className={`text-xs ${approved ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
      {isNewDecision(request, seenAt) && <NewBadge />}{' '}
      {approved ? 'בקשת העדכון האחרונה אושרה' : `בקשת העדכון האחרונה נדחתה${request.review_note ? `: ${request.review_note}` : ''}`}
    </p>
  );
}

function BusinessCard({ item, requests, seenAt, onEdit, onStats }) {
  const { place } = item;
  const [views, setViews] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc('place_stats', { p_place_id: place.id, p_days: 30 }).then(({ data, error }) => {
      if (!cancelled && !error) setViews(data.totals.view);
    });
    return () => {
      cancelled = true;
    };
  }, [place.id]);

  const latest = requests[0];
  const cover = place.images?.[0] || place.image_url;

  return (
    <li className="rounded-3xl border border-border bg-card p-4 text-right space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 rounded-2xl bg-muted overflow-hidden">
          {cover && <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {isNewDecision(item, seenAt) && <NewBadge />}
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
              <BadgeCheck size={12} /> בעלים מאושר
            </span>
          </div>
          <h2 className="font-bold text-foreground truncate mt-1">{place.name}</h2>
          <p className="text-xs text-muted-foreground truncate">{[place.city, place.address].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        צפיות ב-30 הימים האחרונים: <strong className="text-foreground tabular-nums">{views === null ? '…' : views}</strong>
      </p>
      {latest && <RequestLine request={latest} seenAt={seenAt} />}

      <div className="grid grid-cols-3 gap-2">
        <button onClick={onEdit} className="flex items-center justify-center gap-1.5 rounded-2xl bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-700">
          <Pencil size={16} /> ערוך
        </button>
        <button onClick={onStats} className="flex items-center justify-center gap-1.5 rounded-2xl border border-green-600 px-3 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-950/40">
          <BarChart3 size={16} /> נתונים
        </button>
        <Link to={`/place/${place.id}`} className="flex items-center justify-center gap-1.5 rounded-2xl border border-border px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
          <ExternalLink size={16} /> העמוד
        </Link>
      </div>
    </li>
  );
}

/** "My business": the signed-in owner's places, their numbers and the state of their requests. */
export default function MyBusiness() {
  const { loading, items, requests, reload } = useOwnerOverview();
  const beta = useBetaInfo();
  const [seenAtOpen] = useState(() => getSeenAt()); // highlight what is new during this visit
  const [editing, setEditing] = useState(null);
  const [statsFor, setStatsFor] = useState(null);

  // opening the page counts as having seen the decisions
  useEffect(() => {
    if (!loading) markSeen();
  }, [loading]);

  const approved = items.filter((i) => i.status === 'approved' && i.place);
  const others = items.filter((i) => i.status !== 'approved');
  const requestsFor = (placeId) => requests.filter((r) => r.place_id === placeId);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-4 max-w-2xl mx-auto py-8 space-y-6">
        <div className="text-right">
          <h1 className="text-2xl font-bold text-foreground">העסקים שלי</h1>
          <p className="text-sm text-muted-foreground">ניהול הפרטים והנתונים של העסקים שאתה רשום עליהם</p>
        </div>

        {beta?.active && approved.length > 0 && (
          <p className="rounded-2xl border border-green-300 bg-green-50 dark:bg-green-950/40 p-3 text-sm text-green-900 dark:text-green-200 text-right">
            בתקופת הבטא (עד {formatBetaDate(beta.ends_at)}) שינויים שתעשה מתפרסמים מיד, בחינם.
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-3xl space-y-3">
            <Store className="mx-auto text-muted-foreground" />
            <p className="text-foreground font-medium">אין לך עדיין עסקים</p>
            <p className="text-sm text-muted-foreground px-6">
              מצא את העסק שלך באתר ולחץ על "בעל העסק? בקש שליטה על העמוד". אחרי שנאמת אותך הוא יופיע כאן.
            </p>
            <Link to="/" className="inline-block rounded-2xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700">
              חפש את העסק שלי
            </Link>
          </div>
        ) : (
          <>
            {approved.length > 0 && (
              <ul className="space-y-4">
                {approved.map((item) => (
                  <BusinessCard
                    key={item.id}
                    item={item}
                    requests={requestsFor(item.place_id)}
                    seenAt={seenAtOpen}
                    onEdit={() => setEditing(item.place)}
                    onStats={() => setStatsFor(item.place)}
                  />
                ))}
              </ul>
            )}

            {others.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-bold text-foreground text-right">בקשות בעלות</h2>
                <ul className="space-y-2">
                  {others.map((item) => {
                    const [label, tone] = CLAIM_STATUS[item.status] || CLAIM_STATUS.pending;
                    return (
                      <li key={item.id} className="rounded-2xl border border-border bg-card p-3 text-right">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
                            {isNewDecision(item, seenAtOpen) && <NewBadge />} {label}
                          </span>
                          {item.place ? (
                            <Link to={`/place/${item.place.id}`} className="font-medium text-foreground hover:underline truncate">
                              {item.place.name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">מקום לא זמין</span>
                          )}
                        </div>
                        {item.status === 'pending' && (
                          <p className="text-xs text-muted-foreground mt-1">נבדוק את הבקשה ונחזור אליך בטלפון שהשארת.</p>
                        )}
                        {item.review_note && <p className="text-xs text-muted-foreground mt-1">{item.review_note}</p>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      {editing && (
        <OwnerEditor
          place={editing}
          onClose={() => {
            setEditing(null);
            reload();
          }}
          onSaved={(fresh) => setEditing(fresh)}
        />
      )}
      {statsFor && <PlaceStats place={statsFor} onClose={() => setStatsFor(null)} />}
    </div>
  );
}
