import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PlaceCard from '@/components/PlaceCard';
import { supabase } from '@/api/base44Client';
import useFavorites from '@/hooks/useFavorites';
import { useAuth } from '@/lib/AuthContext';
import { LANDINGS, MIN_LANDING_PLACES, getLanding, landingFilter, landingPath } from '@/lib/landings';
import PageNotFound from '@/lib/PageNotFound';

/** City / region / category page for local search, e.g. /city/haifa or /category/coffee-carts. */
export default function Landing({ kind }) {
  const { slug } = useParams();
  const landing = getLanding(kind, slug);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!landing) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    supabase
      .from('places')
      .select('*')
      .eq('status', 'approved')
      .or(landingFilter(landing))
      .order('rating', { ascending: false, nullsFirst: false })
      .order('name')
      .limit(300)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFailed(true);
        else setPlaces(data || []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [landing]);

  // Thin pages are 404s on the server too (functions/_middleware.js).
  if (!landing || (!loading && !failed && places.length < MIN_LANDING_PLACES)) return <PageNotFound />;

  const handleFavorite = (placeId) => {
    if (!isAuthenticated) {
      toast('צריך להתחבר כדי לשמור מקומות', {
        action: { label: 'להתחברות', onClick: () => navigate('/login') },
      });
      return;
    }
    toggle(placeId).catch(() => toast.error('לא הצלחנו לשמור, נסו שוב'));
  };

  const siblings = LANDINGS.filter((l) => l.kind === landing.kind && l.slug !== landing.slug);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      <header className="text-right mb-8">
        <h1 className="text-3xl md:text-4xl font-black mb-3">{landing.h1}</h1>
        <p className="text-muted-foreground max-w-3xl">{landing.intro}</p>
        {!loading && !failed && (
          <p className="text-sm text-muted-foreground mt-2">{places.length} מקומות במדריך</p>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : failed ? (
        <p className="text-center text-muted-foreground py-16">לא הצלחנו לטעון את המקומות כרגע. נסו לרענן.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => (
            <li key={place.id} className="flex flex-col">
              {landing.kind === 'category' && place.city && (
                <span className="text-sm text-muted-foreground mb-1.5 text-right">{place.city}</span>
              )}
              <PlaceCard
                place={place}
                isFavorite={isFavorite(place.id)}
                onFavoriteToggle={() => handleFavorite(place.id)}
                onClick={() => navigate(`/place/${place.id}`)}
              />
            </li>
          ))}
        </ul>
      )}

      <nav className="mt-12 text-right" aria-label={landing.kind === 'city' ? 'ערים ואזורים נוספים' : 'קטגוריות נוספות'}>
        <h2 className="font-bold text-lg mb-3">{landing.kind === 'city' ? 'ערים ואזורים נוספים' : 'עוד סוגי מקומות'}</h2>
        <ul className="flex flex-wrap gap-2">
          {siblings.map((l) => (
            <li key={l.slug}>
              <Link
                to={landingPath(l)}
                className="inline-flex rounded-full border border-border px-4 py-1.5 text-sm hover:border-primary hover:text-primary transition-colors"
              >
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="text-center mt-12">
        <Link
          to="/"
          className="inline-flex rounded-full border border-primary text-primary px-6 py-2.5 font-medium hover:bg-primary/10 transition-colors"
        >
          לגלות מה יש באזור שלי
        </Link>
      </div>
    </div>
  );
}
