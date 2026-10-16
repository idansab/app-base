import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Heart, Info, Loader2, MapPin, Navigation, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/base44Client';
import useFavorites from '@/hooks/useFavorites';
import { useAuth } from '@/lib/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { getCollection, orderCollectionPlaces } from '@/lib/collections';
import { wazeUrl } from '@/lib/geo';
import { placeholderFor } from '@/lib/placeholders';
import PageNotFound from '@/lib/PageNotFound';

// Bold white text with a dark outline, like the captions in Israeli travel and food TikToks.
const CAPTION = { textShadow: '0 0 2px #000, 0 2px 10px rgba(0,0,0,0.7)' };

// Same height as the Discover feed: the screen minus the header and bottom nav.
const SLIDE = 'relative h-[calc(100dvh-9rem)] min-h-[420px] w-full snap-start snap-always overflow-hidden bg-black';

const imageOf = (place) => place.images?.[0] || place.image_url || placeholderFor(place);

function RailButton({ label, children, ...props }) {
  const Tag = props.href ? 'a' : props.to ? Link : 'button';
  return (
    <Tag {...props} aria-label={label} className="flex flex-col items-center gap-1 text-white">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">{children}</span>
      <span className="text-[11px] font-semibold" style={CAPTION}>
        {label}
      </span>
    </Tag>
  );
}

function CoverSlide({ collection, place, count }) {
  return (
    <section className={SLIDE}>
      {place && <img src={imageOf(place)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/60" />
      <div className="relative flex h-full flex-col items-center justify-between px-6 pb-8 pt-[18%] text-center text-white">
        <div>
          <span className="mb-4 inline-block rounded-full bg-primary px-4 py-1 text-sm font-bold text-primary-foreground">
            {count} מקומות
          </span>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl" style={CAPTION}>
            {collection.title}
          </h1>
          <p className="mt-3 text-lg font-semibold text-white/95" style={CAPTION}>
            {collection.subtitle}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 text-sm font-semibold" style={CAPTION}>
          גללו למטה
          <ChevronDown className="animate-bounce" size={28} />
        </div>
      </div>
    </section>
  );
}

function PlaceSlide({ place, index, total, isFavorite, onFavorite, onShare }) {
  return (
    <section className={SLIDE}>
      <img src={imageOf(place)} alt={place.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      <span className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm font-bold text-white">
        {index + 1}/{total}
      </span>

      <div className="absolute bottom-24 left-4 flex flex-col gap-4">
        <RailButton label={isFavorite ? 'נשמר' : 'שמירה'} type="button" onClick={onFavorite}>
          <Heart size={24} className={isFavorite ? 'fill-red-500 text-red-500' : ''} />
        </RailButton>
        {place.lat && place.lng && (
          <RailButton
            label="Waze"
            href={wazeUrl(place.lat, place.lng)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('navigate', { item_id: place.id, method: 'waze' })}
          >
            <Navigation size={22} />
          </RailButton>
        )}
        <RailButton label="שיתוף" type="button" onClick={onShare}>
          <Share2 size={22} />
        </RailButton>
        <RailButton label="פרטים" to={`/place/${place.id}`}>
          <Info size={22} />
        </RailButton>
      </div>

      <div className="absolute inset-x-0 bottom-0 pb-4 pl-20 pr-4 text-right text-white">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-primary-foreground">
            {index + 1}
          </span>
          <h2 className="text-3xl font-extrabold leading-tight" style={CAPTION}>
            {place.name}
          </h2>
        </div>
        {place.city && !place.short_description?.includes(place.city) && (
          <p className="mb-1 flex items-center gap-1 text-base font-semibold" style={CAPTION}>
            <MapPin size={16} /> {place.city}
          </p>
        )}
        {place.short_description && (
          <p className="text-base text-white/95" style={CAPTION}>
            {place.short_description}
          </p>
        )}
        {place.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {place.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
                #{tag}
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 text-[10px] text-white/70">{place.credit}</p>
      </div>
    </section>
  );
}

function EndSlide({ onShare }) {
  return (
    <section className={`${SLIDE} bg-gradient-to-b from-primary/90 to-black`}>
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center text-white">
        <p className="text-3xl font-extrabold leading-tight" style={CAPTION}>
          תשלחו למי שחייב להכיר 👇
        </p>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-lg font-bold text-black shadow-lg"
        >
          <Share2 size={20} />
          שתפו את הרשימה
        </button>
        <p className="mt-6 text-white/85">יש עוד עשרות מעיינות, עגלות קפה ומקומות באתר</p>
        <Link to="/" className="rounded-full border-2 border-white px-6 py-2.5 font-bold">
          לגלות מה יש באזור שלי
        </Link>
      </div>
    </section>
  );
}

/** A curated list of places linked from a social post, e.g. /list/springs, as a vertical swipe like the post itself. */
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

  const share = async ({ title, path, contentType, itemId }) => {
    trackEvent('share', { content_type: contentType, item_id: itemId });
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} — מצאתי ב"מה יש פה"`, url });
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

  const shareCollection = () =>
    share({ title: collection.title, path: window.location.pathname, contentType: 'collection', itemId: collection.slug });

  return (
    <div className="bg-black" dir="rtl">
      <div className="mx-auto h-[calc(100dvh-9rem)] min-h-[420px] w-full max-w-[480px] snap-y snap-mandatory overflow-y-scroll">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-white" size={32} />
          </div>
        ) : failed || places.length === 0 ? (
          <p className="p-8 text-center text-white/80">לא הצלחנו לטעון את הרשימה כרגע. נסו לרענן.</p>
        ) : (
          <>
            <CoverSlide collection={collection} place={places[0]} count={places.length} />
            {places.map((place, i) => (
              <PlaceSlide
                key={place.id}
                place={place}
                index={i}
                total={places.length}
                isFavorite={isFavorite(place.id)}
                onFavorite={() => handleFavorite(place.id)}
                onShare={() =>
                  share({ title: place.name, path: `/place/${place.id}`, contentType: 'place', itemId: place.id })
                }
              />
            ))}
            <EndSlide onShare={shareCollection} />
          </>
        )}
      </div>
    </div>
  );
}
