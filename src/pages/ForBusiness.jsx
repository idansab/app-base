import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Clock, Images, Loader2, MapPin, Search, Store } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import useOwnerOverview from '@/hooks/useOwnerOverview';
import { formatBetaDate, useBetaInfo } from '@/lib/beta';
import { containsPattern, MIN_QUERY } from '@/lib/placeSearch';

const BENEFITS = [
  { icon: Clock, title: 'שעות פתיחה מעודכנות', text: 'הלקוחות רואים "פתוח עכשיו" ויודעים מתי להגיע.' },
  { icon: Images, title: 'תמונות ופרטים', text: 'עד 5 תמונות, תיאור, טלפון וכשרות, מתוך העמוד שלך.' },
  { icon: BarChart3, title: 'נתונים על הלקוחות', text: 'כמה צפו בעסק, התקשרו וביקשו ניווט.' },
];

const STEPS = ['מצא את העסק שלך ובקש שליטה על העמוד', 'נאמת אותך בטלפון', 'ערוך את הפרטים וראה את הנתונים'];

/** Landing page for business owners: what they get, and a search that leads straight to the claim form. */
export default function ForBusiness() {
  const navigate = useNavigate();
  const beta = useBetaInfo();
  const { hasApproved } = useOwnerOverview();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = nothing searched yet
  const [searching, setSearching] = useState(false);

  // debounced search over approved places
  useEffect(() => {
    const pattern = containsPattern(query);
    if (!pattern) {
      setResults(null);
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('places')
        .select('id, name, city, address')
        .eq('status', 'approved')
        .or(`name.ilike.${pattern},address.ilike.${pattern},city.ilike.${pattern}`)
        .limit(8);
      if (cancelled) return;
      setResults(error ? [] : data || []);
      setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-4 max-w-2xl mx-auto py-10 space-y-8 text-right">
        <header className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
            <Store size={14} /> לבעלי עסקים
          </span>
          <h1 className="text-3xl font-bold text-foreground">בעל עסק? קח שליטה על העמוד שלך</h1>
          <p className="text-muted-foreground">
            העסק שלך כבר באתר. עדכן שעות ופרטים, הוסף תמונות וראה כמה אנשים מתעניינים בו.
            {beta?.active ? ` בתקופת הבטא, עד ${formatBetaDate(beta.ends_at)}, הכול בחינם.` : ''}
          </p>
          {hasApproved && (
            <Link to="/my-business" className="inline-block rounded-2xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700">
              לעסקים שלי
            </Link>
          )}
        </header>

        <section aria-label="חיפוש העסק">
          <label htmlFor="biz-search" className="block font-bold text-foreground mb-2">חפש את העסק שלך</label>
          <div className="relative">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="biz-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="שם העסק, עיר או כתובת"
              autoComplete="off"
              className="w-full rounded-2xl border border-border bg-card py-3.5 pr-11 pl-4 text-foreground text-right focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            {searching && <Loader2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>

          {results === null ? (
            <p className="text-xs text-muted-foreground mt-2">הקלד לפחות {MIN_QUERY} תווים.</p>
          ) : results.length === 0 && !searching ? (
            <div className="mt-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              לא מצאנו עסק בשם הזה. אפשר{' '}
              <Link to="/contribute" className="text-primary font-medium hover:underline">להוסיף אותו לאתר</Link>
              , ולבקש שליטה עליו אחרי שיאושר.
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {results.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/place/${place.id}?claim=1`)}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-right hover:bg-secondary/60 transition-colors"
                  >
                    <span className="text-sm text-primary font-medium whitespace-nowrap">זה העסק שלי</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-foreground truncate">{place.name}</span>
                      <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground truncate">
                        {[place.city, place.address].filter(Boolean).join(' · ')} <MapPin size={12} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="מה מקבלים">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <Icon size={22} className="text-primary mr-0 ml-auto" />
              <h2 className="font-bold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section aria-label="איך זה עובד">
          <h2 className="font-bold text-foreground mb-3">איך זה עובד</h2>
          <ol className="space-y-2">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-3 justify-start">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">{i + 1}</span>
                <span className="text-foreground">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground mt-3">נדרש חשבון באתר (הרשמה חינמית). את הבקשה בודק אדם, בדרך כלל בתוך כמה ימים.</p>
        </section>
      </div>
    </div>
  );
}
