import React, { useEffect, useRef, useState } from 'react';
import { Heart, Info, Loader2, MapPin, MessageCircle, Navigation, Share2, Volume2, VolumeX } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import VideoComments from '@/components/discover/VideoComments';
import useFavorites from '@/hooks/useFavorites';
import { useAuth } from '@/lib/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { loadFeed } from '@/lib/discoverApi';
import { wazeUrl } from '@/lib/geo';
import { commentCount } from '@/lib/videoComments';

// Bold white text with a dark outline, like the captions in Israeli travel and food TikToks.
const CAPTION = { textShadow: '0 0 2px #000, 0 2px 10px rgba(0,0,0,0.7)' };

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

function VideoSlide({ video, muted, onToggleMute, comments, onOpenComments, isFavorite, onFavorite, onShare }) {
  const ref = useRef(null);
  const slideRef = useRef(null);
  const [vertical, setVertical] = useState(true);
  const place = video.places;
  const canComment = Boolean(video.created_at); // built-in fallback videos are not in the database

  // play only the slide that is on screen
  useEffect(() => {
    const el = ref.current;
    const slide = slideRef.current;
    if (!el || !slide) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(slide);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  return (
    <section ref={slideRef} className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
      <video
        ref={ref}
        src={video.video_url}
        poster={video.poster_url || undefined}
        // fill the screen with vertical videos; show wide ones whole
        className={`h-full w-full ${vertical ? 'object-cover' : 'object-contain'}`}
        onLoadedMetadata={(e) => setVertical(e.currentTarget.videoHeight >= e.currentTarget.videoWidth)}
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={video.title}
        onClick={onToggleMute}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'הפעל קול' : 'השתק'}
        className="absolute left-3 top-3 rounded-full bg-black/50 p-2 text-white"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* above the floating accessibility button (fixed, bottom-left) */}
      <div className="absolute bottom-28 left-3 flex flex-col gap-3">
        {canComment && (
          <RailButton label={comments > 0 ? String(comments) : 'תגובות'} type="button" onClick={onOpenComments}>
            <MessageCircle size={24} />
          </RailButton>
        )}
        {place && (
          <RailButton label={isFavorite ? 'נשמר' : 'שמירה'} type="button" onClick={onFavorite}>
            <Heart size={24} className={isFavorite ? 'fill-red-500 text-red-500' : ''} />
          </RailButton>
        )}
        {place?.lat && place?.lng && (
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
        {place && (
          <RailButton label="פרטים" to={`/place/${place.id}`}>
            <Info size={22} />
          </RailButton>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 pb-5 pl-20 pr-4 text-right text-white">
        <h2 className="text-2xl font-extrabold leading-tight" style={CAPTION}>
          {video.title}
        </h2>
        {video.description && (
          <p className="mt-1 text-sm text-white/95" style={CAPTION}>
            {video.description}
          </p>
        )}
        {place && (
          <Link
            to={`/place/${place.id}`}
            className="pointer-events-auto mt-3 block rounded-2xl bg-black/45 p-3 backdrop-blur-sm"
          >
            <p className="flex items-center gap-1.5 text-base font-bold">
              <MapPin size={16} className="shrink-0" /> {place.name}
            </p>
            {(place.short_description || place.city) && (
              <p className="mt-0.5 text-sm text-white/85">{place.short_description || place.city}</p>
            )}
            {place.tags?.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {place.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        )}
      </div>
    </section>
  );
}

/** "Discover": vertical, swipeable video feed with the place's details and comments. */
export default function Discover() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const [muted, setMuted] = useState(true);
  const [videos, setVideos] = useState(null);
  const [counts, setCounts] = useState({});
  const [openVideo, setOpenVideo] = useState(null);

  useEffect(() => {
    loadFeed().then((rows) => {
      setVideos(rows);
      setCounts(Object.fromEntries(rows.map((v) => [v.id, commentCount(v)])));
    });
  }, []);

  const handleFavorite = (placeId) => {
    if (!isAuthenticated) {
      toast('צריך להתחבר כדי לשמור מקומות', {
        action: { label: 'להתחברות', onClick: () => navigate('/login?returnTo=/discover') },
      });
      return;
    }
    toggle(placeId).catch(() => toast.error('לא הצלחנו לשמור, נסו שוב'));
  };

  const handleShare = async (video) => {
    const place = video.places;
    trackEvent('share', { content_type: 'discover_video', item_id: video.id });
    const url = `${window.location.origin}${place ? `/place/${place.id}` : '/discover'}`;
    const title = place?.name || video.title;
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

  if (videos === null) {
    return (
      <div className="flex h-[calc(100dvh-9rem)] min-h-[420px] items-center justify-center bg-black">
        <Loader2 className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="bg-black" dir="rtl">
      <div className="mx-auto h-[calc(100dvh-9rem)] min-h-[420px] w-full max-w-[480px] snap-y snap-mandatory overflow-y-scroll">
        {videos.length === 0 && <p className="p-8 text-center text-white/80">עוד אין סרטונים כאן. תחזרו בקרוב.</p>}
        {videos.map((video) => (
          <VideoSlide
            key={video.id}
            video={video}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            comments={counts[video.id] || 0}
            onOpenComments={() => setOpenVideo(video)}
            isFavorite={video.places ? isFavorite(video.places.id) : false}
            onFavorite={() => handleFavorite(video.places.id)}
            onShare={() => handleShare(video)}
          />
        ))}
      </div>
      {openVideo && (
        <VideoComments
          video={openVideo}
          onClose={() => setOpenVideo(null)}
          onCountChange={(n) => setCounts((c) => ({ ...c, [openVideo.id]: n }))}
        />
      )}
    </div>
  );
}
