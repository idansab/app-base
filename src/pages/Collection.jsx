import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import PlaceCard from '@/components/PlaceCard';
import { supabase } from '@/api/base44Client';
import useFavorites from '@/hooks/useFavorites';
import { useAuth } from '@/lib/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { getCollection, orderCollectionPlaces } from '@/lib/collections';
import PageNotFound from '@/lib/PageNotFound';

/** A curated list of places linked from a social post, e.g. /list/springs. */
export default function Collection() {
  const { slug } = useParams();
  const collection = getCollection(slug);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!collection) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('places')
      .select('*')
      .eq('status', 'approved')
      .in('id', collection.places.map((p) => p.id))
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFailed(true);
        else setPlaces(orderCollectionPlaces(collection, data));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [collection]);

  if (!collection) return <PageNotFound />;

  const handleFavorite = (placeId) => {
    if (!isAuthenticated) {
      toast('צריך להתחבר כדי לשמור מקומות', {
        action: { label: 'להתחברות', onClick: () => navigate('/login') },
      });
      return;
    }
    toggle(placeId).catch(() => toast.error('לא הצלחנו לשמור, נסו שוב'));
  };

  const handleShare = async () => {
    trackEvent('share', { content_type: 'collection', item_id: collection.slug });
    const url = window.location.href.split('?')[0];
    if (navigator.share) {
      try {
        await navigator.share({ title: collection.title, text: `${collection.title} — מצאתי ב"מה יש פה"`, url });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('הקישור הועתק, אפשר להדביק ולשלוח');
    } catch {
      toast.error(`לא הצלחנו להעתיק. הקישור: ${url}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      <header className="text-right mb-8">
        <h1 className="text-3xl md:text-4xl font-black mb-2">{collection.title}</h1>
        <p className="text-muted-foreground mb-4">{collection.subtitle}</p>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 font-medium shadow-sm hover:opacity-90 transition-opacity"
        >
          <Share2 size={18} />
          שתפו את הרשימה
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : failed || places.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">לא הצלחנו לטעון את הרשימה כרגע. נסו לרענן.</p>
      ) : (
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place, i) => (
            <li key={place.id} className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{place.city}</span>
              </div>
              <PlaceCard
                place={place}
                isFavorite={isFavorite(place.id)}
                onFavoriteToggle={() => handleFavorite(place.id)}
                onClick={() => navigate(`/place/${place.id}`)}
              />
              <p className="text-[11px] text-muted-foreground mt-1.5 text-right">{place.credit}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="text-center mt-12">
        <p className="text-muted-foreground mb-3">יש עוד עשרות מעיינות, עגלות קפה ומקומות באתר</p>
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
